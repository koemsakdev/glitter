import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, createHmac } from 'crypto';
import { MailService } from '../common/services/mail.service';
import { UsersService } from '../users/user.service';
import { UserEntity } from '../users/entities/user.entity';
import { AuthAccountEntity } from '../users/entities/auth-account.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LoginDto } from './dto/login.dto';
import { StaffLoginDto } from './dto/staff-login.dto';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { LoginSecurityService } from '../audit-logs/security/login-security.service';
import { clientIp, type ReqLike } from '../audit-logs/security/client-info';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { TelegramLoginDto } from './dto/telegram-login.dto';
import { verifyPassword } from './helpers/password.helper';
import { AuthTokenResponse, JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mail: MailService,
    private readonly audit: AuditLogService,
    private readonly loginSecurity: LoginSecurityService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(AuthAccountEntity)
    private readonly authAccountRepo: Repository<AuthAccountEntity>,
  ) {}

  // ==========================================================================
  // EMAIL VERIFICATION (one-time code)
  // ==========================================================================

  /** Hash a code, peppered with the JWT secret + user id (short-lived + rate
   *  limited, so a fast hash is fine — we never store the code itself). */
  private hashOtp(code: string, userId: string): string {
    const secret = this.configService.getOrThrow<string>('JWT_SECRET');
    return createHash('sha256')
      .update(`${code}:${userId}:${secret}`)
      .digest('hex');
  }

  /** Send a 6-digit verification code to the user's email on file. */
  async sendEmailVerification(userId: string): Promise<{ sent: true }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user === null) throw new NotFoundException('User not found');
    if (!user.email) {
      throw new BadRequestException('No email address on this account');
    }
    if (user.emailVerifiedAt) {
      throw new BadRequestException('Email is already verified');
    }
    const devFallback =
      !this.mail.isConfigured && process.env.NODE_ENV !== 'production';
    if (!this.mail.isConfigured && !devFallback) {
      throw new BadRequestException('Email sending is not configured');
    }
    // Rate limit: one code per minute.
    if (
      user.emailOtpSentAt &&
      Date.now() - user.emailOtpSentAt.getTime() < 60_000
    ) {
      throw new BadRequestException(
        'Please wait a moment before requesting another code',
      );
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    user.emailOtpHash = this.hashOtp(code, user.id);
    user.emailOtpExpiresAt = new Date(Date.now() + 10 * 60_000);
    user.emailOtpAttempts = 0;
    user.emailOtpSentAt = new Date();
    await this.userRepo.save(user);

    if (devFallback) {
      // Local dev without SMTP: surface the code in the API logs instead.
      this.logger.warn(
        `SMTP not configured — verification code for ${user.email}: ${code}`,
      );
    } else {
      await this.mail.sendVerificationCode(user.email, code);
    }
    return { sent: true };
  }

  /** Verify the code; on success stamp emailVerifiedAt + sync the email login. */
  async verifyEmail(userId: string, code: string): Promise<{ verified: true }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user === null) throw new NotFoundException('User not found');
    if (user.emailVerifiedAt) return { verified: true };

    if (!user.emailOtpHash || !user.emailOtpExpiresAt) {
      throw new BadRequestException('No verification in progress');
    }
    if (Date.now() > user.emailOtpExpiresAt.getTime()) {
      throw new BadRequestException('The code has expired — request a new one');
    }
    if (user.emailOtpAttempts >= 5) {
      throw new BadRequestException('Too many attempts — request a new code');
    }
    if (this.hashOtp(code.trim(), user.id) !== user.emailOtpHash) {
      user.emailOtpAttempts += 1;
      await this.userRepo.save(user);
      throw new BadRequestException('Incorrect code');
    }

    user.emailVerifiedAt = new Date();
    user.emailOtpHash = null;
    user.emailOtpExpiresAt = null;
    user.emailOtpAttempts = 0;
    user.emailOtpSentAt = null;
    await this.userRepo.save(user);

    // Keep the email/password sign-in in step with the verified address.
    if (user.email) {
      const acct = await this.authAccountRepo.findOne({
        where: { userId: user.id, provider: 'email' },
      });
      if (acct && acct.providerAccountId !== user.email) {
        acct.providerAccountId = user.email;
        await this.authAccountRepo.save(acct);
      }
    }

    return { verified: true };
  }

  // ==========================================================================
  // EMAIL + PASSWORD
  // ==========================================================================

  /**
   * Create the account and email a verification code. No tokens are issued —
   * the user signs in by confirming the code (POST /auth/email/confirm).
   */
  async register(dto: RegisterDto): Promise<{
    requiresVerification: true;
    email: string;
    emailSent: boolean;
  }> {
    const user = await this.usersService.registerWithEmail({
      email: dto.email,
      password: dto.password,
      fullName: dto.fullName,
      phoneNumber: dto.phoneNumber,
    });

    // Don't fail the sign-up if delivery hiccups — the verify screen can
    // resend — but tell the client so it can say so instead of waiting.
    const emailSent = await this.sendEmailVerification(user.id)
      .then(() => true)
      .catch((err: unknown) => {
        this.logger.error(`Could not send verification email: ${String(err)}`);
        return false;
      });
    return {
      requiresVerification: true,
      email: user.email ?? dto.email,
      emailSent,
    };
  }

  /** Customers must verify their email before email/password sign-in. */
  private requiresEmailVerification(user: UserEntity): boolean {
    return user.role === 'customer' && !!user.email && !user.emailVerifiedAt;
  }

  /** Public: (re)send the code for an unverified account, by email. Always
   *  answers the same way so it can't be used to probe which emails exist. */
  async resendEmailVerification(email: string): Promise<{ sent: true }> {
    const user = await this.userRepo.findOne({
      where: { email: email.trim().toLowerCase() },
    });
    if (user && this.requiresEmailVerification(user)) {
      await this.sendEmailVerification(user.id);
    }
    return { sent: true };
  }

  /** Public: confirm the code for an email, then sign the user in. */
  async confirmEmail(
    email: string,
    code: string,
  ): Promise<{ user: UserEntity; tokens: AuthTokenResponse }> {
    const user = await this.userRepo.findOne({
      where: { email: email.trim().toLowerCase() },
    });
    if (user === null) throw new BadRequestException('Incorrect code');

    await this.verifyEmail(user.id, code);

    if (user.accountStatus !== 'active') {
      throw new UnauthorizedException(
        `Account is ${user.accountStatus}. Contact support.`,
      );
    }
    const fresh = await this.userRepo.findOneOrFail({ where: { id: user.id } });
    return { user: fresh, tokens: this.issueTokens(fresh) };
  }

  async login(
    dto: LoginDto,
  ): Promise<{ user: UserEntity; tokens: AuthTokenResponse }> {
    const result = await this.usersService.findEmailAuthAccount(dto.email);

    if (result === null) {
      // Don't tell the user whether the email exists — just say credentials wrong
      throw new UnauthorizedException('Invalid email or password');
    }

    const { user, authAccount } = result;

    if (authAccount.passwordHash === null) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await verifyPassword(
      dto.password,
      authAccount.passwordHash,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.accountStatus !== 'active') {
      throw new UnauthorizedException(
        `Account is ${user.accountStatus}. Contact support.`,
      );
    }

    if (this.requiresEmailVerification(user)) {
      // Send a fresh code (ignore the 1-minute rate limit error) so the user
      // can verify right away from the login screen.
      await this.sendEmailVerification(user.id).catch(() => undefined);
      throw new ForbiddenException({
        statusCode: 403,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email to continue.',
        email: user.email,
      });
    }

    const tokens = this.issueTokens(user);
    return { user, tokens };
  }

  /**
   * Dashboard sign-in: username (or a legacy email) + password, staff only.
   * No email verification — staff accounts are created by an admin.
   */
  async staffLogin(
    dto: StaffLoginDto,
    req: ReqLike,
  ): Promise<{ user: UserEntity; tokens: AuthTokenResponse }> {
    const id = dto.username.trim().toLowerCase();
    const user = await this.userRepo.findOne({
      where: id.includes('@') ? { email: id } : { username: id },
    });
    const { ip } = clientIp(req);

    // Every attempt is recorded (never the password) with IP, place and
    // device, so admins can spot someone trying to break in.
    const fail = (reason: string, message = 'Invalid username or password') => {
      const staff = user && user.role !== 'customer' ? user : null;
      void this.loginSecurity.record(req, {
        success: false,
        failureReason: reason,
        usernameTried: id,
        user: staff,
        clientInfo: dto.client,
      });
      void this.audit.record({
        actor: staff ?? {
          id: null,
          fullName: id.slice(0, 100),
          role: 'unknown',
        },
        action: 'login_failed',
        entity: 'auth',
        label: `Failed sign-in as "${id.slice(0, 100)}"`,
        details: { reason },
        method: 'POST',
        path: '/api/auth/staff/login',
        ip,
      });
      return new UnauthorizedException(message);
    };

    if (user === null) throw fail('unknown_user');
    if (user.role === 'customer') throw fail('not_staff');

    const account = await this.authAccountRepo
      .createQueryBuilder('auth')
      .addSelect('auth.passwordHash')
      .where('auth.userId = :userId', { userId: user.id })
      .andWhere('auth.provider = :provider', { provider: 'email' })
      .getOne();
    if (!account?.passwordHash) throw fail('no_password');
    if (!(await verifyPassword(dto.password, account.passwordHash))) {
      throw fail('wrong_password');
    }
    if (user.accountStatus !== 'active') {
      throw fail(
        user.accountStatus,
        `Account is ${user.accountStatus}. Contact your admin.`,
      );
    }

    const tokens = this.issueTokens(user);
    void this.loginSecurity.record(req, {
      success: true,
      usernameTried: id,
      user,
      clientInfo: dto.client,
      refreshToken: tokens.refreshToken,
    });
    void this.audit.record({
      actor: user,
      action: 'login',
      entity: 'auth',
      label: 'Signed in to the dashboard',
      method: 'POST',
      path: '/api/auth/staff/login',
      ip,
    });
    return { user, tokens };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersService.findActiveUserById(userId);
    if (user === null) {
      throw new UnauthorizedException('User not found or inactive');
    }
    if (user.email === null) {
      throw new BadRequestException(
        'Cannot change password: user has no email auth account',
      );
    }

    const result = await this.usersService.findEmailAuthAccount(user.email);
    if (result === null || result.authAccount.passwordHash === null) {
      throw new BadRequestException(
        'No password is set for this account. Use addEmailPassword instead.',
      );
    }

    const currentValid = await verifyPassword(
      dto.currentPassword,
      result.authAccount.passwordHash,
    );
    if (!currentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.usersService.changePassword(userId, dto.newPassword);
    // tokenVersion is bumped by the service — existing JWTs for this user are now invalid
  }

  // ==========================================================================
  // LINK a provider to the currently logged-in user (Connect accounts)
  // ==========================================================================

  async linkGoogle(userId: string, dto: GoogleLoginDto): Promise<void> {
    const p = await this.verifyGoogleIdToken(dto.idToken);
    await this.usersService.linkOAuthToUser(userId, {
      provider: 'google',
      providerAccountId: p.sub,
      email: p.email ?? null,
      fullName: p.name ?? p.email ?? 'Google User',
      profileImageUrl: p.picture ?? null,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      rawProfile: p as unknown as Record<string, unknown>,
    });
  }

  async linkTelegram(userId: string, dto: TelegramLoginDto): Promise<void> {
    this.verifyTelegramAuth(dto);
    const fullName =
      [dto.first_name, dto.last_name].filter(Boolean).join(' ').trim() ||
      dto.username ||
      'Telegram User';
    await this.usersService.linkOAuthToUser(userId, {
      provider: 'telegram',
      providerAccountId: String(dto.id),
      email: null,
      fullName,
      profileImageUrl: dto.photo_url ?? null,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      rawProfile: dto as unknown as Record<string, unknown>,
    });
  }

  // ==========================================================================
  // GOOGLE (client-side flow — exchange Google ID token for our JWTs)
  // ==========================================================================

  /**
   * Verify a Google ID token client-side, then find-or-create the user.
   * This is the modern flow for mobile apps and SPAs.
   *
   * The frontend uses Google Sign-In JavaScript library → gets an ID token →
   * sends it here. We verify with Google, extract profile, issue our own JWTs.
   */
  async loginWithGoogle(dto: GoogleLoginDto): Promise<{
    user: UserEntity;
    tokens: AuthTokenResponse;
    isNewUser: boolean;
  }> {
    const googleProfile = await this.verifyGoogleIdToken(dto.idToken);

    const { user, isNewUser } = await this.usersService.findOrCreateFromOAuth({
      provider: 'google',
      providerAccountId: googleProfile.sub,
      email: googleProfile.email ?? null,
      fullName: googleProfile.name ?? googleProfile.email ?? 'Google User',
      profileImageUrl: googleProfile.picture ?? null,
      accessToken: null, // not captured in ID-token flow
      refreshToken: null,
      tokenExpiresAt: null,
      rawProfile: googleProfile as unknown as Record<string, unknown>,
    });

    if (user.accountStatus !== 'active') {
      throw new UnauthorizedException(
        `Account is ${user.accountStatus}. Contact support.`,
      );
    }

    const tokens = this.issueTokens(user);
    return { user, tokens, isNewUser };
  }

  // ==========================================================================
  // TELEGRAM (Login Widget — verify the HMAC signature, then find-or-create)
  // ==========================================================================

  async loginWithTelegram(dto: TelegramLoginDto): Promise<{
    user: UserEntity;
    tokens: AuthTokenResponse;
    isNewUser: boolean;
  }> {
    this.verifyTelegramAuth(dto);

    const fullName =
      [dto.first_name, dto.last_name].filter(Boolean).join(' ').trim() ||
      dto.username ||
      'Telegram User';

    const { user, isNewUser } = await this.usersService.findOrCreateFromOAuth({
      provider: 'telegram',
      providerAccountId: String(dto.id),
      email: null,
      fullName,
      profileImageUrl: dto.photo_url ?? null,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      rawProfile: dto as unknown as Record<string, unknown>,
    });

    if (user.accountStatus !== 'active') {
      throw new UnauthorizedException(
        `Account is ${user.accountStatus}. Contact support.`,
      );
    }

    const tokens = this.issueTokens(user);
    return { user, tokens, isNewUser };
  }

  /**
   * Verify the Telegram Login Widget payload: secret = SHA256(bot_token),
   * then HMAC-SHA256 of the sorted "key=value" data-check-string must equal
   * the provided hash. Also rejects payloads older than a day (replay).
   */
  private verifyTelegramAuth(dto: TelegramLoginDto): void {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error(
        'TELEGRAM_BOT_TOKEN is not configured. Set it in .env before using Telegram login.',
      );
    }

    const data: Record<string, string | number> = {
      id: dto.id,
      first_name: dto.first_name,
      auth_date: dto.auth_date,
    };
    if (dto.last_name) data.last_name = dto.last_name;
    if (dto.username) data.username = dto.username;
    if (dto.photo_url) data.photo_url = dto.photo_url;

    const checkString = Object.keys(data)
      .sort()
      .map((key) => `${key}=${data[key]}`)
      .join('\n');

    const secretKey = createHash('sha256').update(botToken).digest();
    const hmac = createHmac('sha256', secretKey)
      .update(checkString)
      .digest('hex');

    if (hmac !== dto.hash) {
      throw new UnauthorizedException('Invalid Telegram login signature');
    }

    const now = Math.floor(Date.now() / 1000);
    if (now - dto.auth_date > 86400) {
      throw new UnauthorizedException(
        'Telegram login has expired. Please try again.',
      );
    }
  }

  /**
   * Verify a Google ID token by calling Google's tokeninfo endpoint.
   * Returns the decoded profile claims.
   *
   * For production, consider using google-auth-library for local verification
   * (faster, doesn't depend on Google's endpoint). For thesis, tokeninfo is fine.
   */
  private async verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new UnauthorizedException('Invalid Google ID token');
    }

    const profile = (await response.json()) as GoogleProfile;

    // Verify audience matches our Google OAuth client ID
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      throw new Error(
        'GOOGLE_CLIENT_ID is not configured. Set it in .env before using Google login.',
      );
    }
    if (profile.aud !== clientId && profile.azp !== clientId) {
      throw new UnauthorizedException(
        'Google ID token was not issued for this application',
      );
    }

    // Verify not expired
    const now = Math.floor(Date.now() / 1000);
    if (profile.exp && Number(profile.exp) < now) {
      throw new UnauthorizedException('Google ID token has expired');
    }

    return profile;
  }

  // ==========================================================================
  // REFRESH + LOGOUT
  // ==========================================================================

  async refresh(dto: RefreshTokenDto): Promise<AuthTokenResponse> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(
        dto.refreshToken,
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.usersService.findActiveUserById(payload.sub);
    if (user === null) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Refresh tokens also respect tokenVersion — revoked tokens can't refresh
    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    return this.issueTokens(user);
  }

  /**
   * Logout = bump tokenVersion, which invalidates ALL existing tokens for this user
   * (including the current access token, any other devices, and refresh tokens).
   */
  async logout(userId: string): Promise<void> {
    await this.usersService.invalidateTokens(userId);
    // Sign-out ends every session (tokens invalidated) — stamp them all.
    await this.loginSecurity.recordLogout(userId);
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private issueTokens(user: UserEntity): AuthTokenResponse {
    const accessPayload: JwtPayload = {
      sub: user.id,
      role: user.role,
      tokenVersion: user.tokenVersion,
      type: 'access',
    };

    const refreshPayload: JwtPayload = {
      sub: user.id,
      role: user.role,
      tokenVersion: user.tokenVersion,
      type: 'refresh',
    };

    const accessExpiresIn =
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
    const refreshExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: accessExpiresIn as unknown as number,
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshExpiresIn as unknown as number,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseDurationToSeconds(accessExpiresIn),
      tokenType: 'Bearer',
    };
  }

  /**
   * Convert "15m", "7d", "3600", etc. into seconds.
   */
  private parseDurationToSeconds(duration: string): number {
    const match = duration.match(/^(\d+)([smhd]?)$/);
    if (!match) {
      const asNumber = Number(duration);
      return Number.isFinite(asNumber) ? asNumber : 900;
    }
    const value = parseInt(match[1], 10);
    const unit = match[2] || 's';
    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return value;
    }
  }
}

/**
 * Shape of Google's tokeninfo response (subset we care about)
 */
interface GoogleProfile {
  iss: string;
  aud: string;
  azp?: string;
  sub: string;
  email?: string;
  email_verified?: string;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  exp?: string;
}
