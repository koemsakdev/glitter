import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import type { AuthProvider } from '../users/entities/auth-account.entity';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from '../users/user.service';
import { UserEntity } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import {
  AuthResponseDto,
  CurrentUserResponseDto,
  RefreshResponseDto,
} from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { FacebookLoginDto } from './dto/facebook-login.dto';
import { RegisterDto } from './dto/register.dto';
import { TelegramLoginDto } from './dto/telegram-login.dto';
import { UserDetailResponseDto } from '../users/dto/user-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  // ==========================================================================
  // PUBLIC ENDPOINTS (no auth required)
  // ==========================================================================

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new customer account (email + password)',
    description:
      'Creates a customer account. Always creates role="customer". For staff/admin, admin must use POST /api/users.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  @ApiResponse({
    status: 409,
    description: 'Email or phone already registered',
  })
  async register(@Body() dto: RegisterDto) {
    const { user, tokens } = await this.authService.register(dto);
    const userResponse = await this.usersService.findOne(user.id);
    return {
      user: userResponse.data,
      tokens,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with email + password',
    description:
      "Works for all roles. Returns JWT that includes the user's role.",
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    const { user, tokens } = await this.authService.login(dto);
    const userResponse = await this.usersService.findOne(user.id);
    return {
      user: userResponse.data,
      tokens,
    };
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login or signup with Google',
    description:
      'Client-side OAuth. Frontend gets Google ID token, sends it here. First-time users auto-registered as customers.',
  })
  @ApiBody({ type: GoogleLoginDto })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid Google ID token' })
  async googleLogin(@Body() dto: GoogleLoginDto) {
    const { user, tokens, isNewUser } =
      await this.authService.loginWithGoogle(dto);
    const userResponse = await this.usersService.findOne(user.id);
    return {
      user: userResponse.data,
      tokens,
      isNewUser,
    };
  }

  @Public()
  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login or signup with Telegram',
    description:
      'Telegram Login Widget payload. Backend verifies the HMAC signature. First-time users auto-registered as customers.',
  })
  @ApiBody({ type: TelegramLoginDto })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid Telegram signature' })
  async telegramLogin(@Body() dto: TelegramLoginDto) {
    const { user, tokens, isNewUser } =
      await this.authService.loginWithTelegram(dto);
    const userResponse = await this.usersService.findOne(user.id);
    return {
      user: userResponse.data,
      tokens,
      isNewUser,
    };
  }

  @Public()
  @Post('facebook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login or signup with Facebook',
    description:
      'Facebook JS SDK access token. Backend verifies it via debug_token. First-time users auto-registered as customers.',
  })
  @ApiBody({ type: FacebookLoginDto })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid Facebook token' })
  async facebookLogin(@Body() dto: FacebookLoginDto) {
    const { user, tokens, isNewUser } =
      await this.authService.loginWithFacebook(dto);
    const userResponse = await this.usersService.findOne(user.id);
    return {
      user: userResponse.data,
      tokens,
      isNewUser,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Exchange a refresh token for a new access+refresh token pair.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, type: RefreshResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    const tokens = await this.authService.refresh(dto);
    return { tokens };
  }

  // ==========================================================================
  // AUTHENTICATED ENDPOINTS (global JwtAuthGuard applies)
  // ==========================================================================

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout from all devices',
    description: 'Invalidates ALL tokens for this user (on any device).',
  })
  @ApiResponse({ status: 200 })
  async logout(@CurrentUser('id') userId: string): Promise<{ ok: true }> {
    await this.authService.logout(userId);
    return { ok: true };
  }

  @ApiBearerAuth()
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      "Returns the logged-in user's full profile including linked providers and isProfileComplete flag.",
  })
  @ApiResponse({ status: 200, type: UserDetailResponseDto })
  async me(@CurrentUser() user: UserEntity): Promise<CurrentUserResponseDto> {
    const result = await this.usersService.findOne(user.id);
    return { data: result.data };
  }

  @ApiBearerAuth()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change your password',
    description:
      'Requires current password. All existing tokens are invalidated on success.',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 401, description: 'Current password incorrect' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ ok: true }> {
    await this.authService.changePassword(userId, dto);
    return { ok: true };
  }

  @Post('email/send-code')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Email a 6-digit verification code to yourself' })
  @ApiResponse({ status: 200 })
  async sendEmailCode(
    @CurrentUser('id') userId: string,
  ): Promise<{ sent: true }> {
    return this.authService.sendEmailVerification(userId);
  }

  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify your email with the code' })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({ status: 200 })
  async verifyEmail(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyEmailDto,
  ): Promise<{ verified: true }> {
    return this.authService.verifyEmail(userId, dto.code);
  }

  @Delete('providers/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Disconnect a linked sign-in method (never the last one)',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Cannot remove your only method' })
  async disconnectProvider(
    @CurrentUser('id') userId: string,
    @Param('provider') provider: string,
  ): Promise<{ ok: true }> {
    const valid: AuthProvider[] = ['email', 'google', 'facebook', 'telegram'];
    if (!valid.includes(provider as AuthProvider)) {
      throw new BadRequestException('Unknown provider');
    }
    await this.usersService.unlinkProvider(userId, provider as AuthProvider);
    return { ok: true };
  }

  @Post('google/link')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Link a Google account to the current user' })
  @ApiBody({ type: GoogleLoginDto })
  async linkGoogle(
    @CurrentUser('id') userId: string,
    @Body() dto: GoogleLoginDto,
  ): Promise<{ ok: true }> {
    await this.authService.linkGoogle(userId, dto);
    return { ok: true };
  }

  @Post('facebook/link')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Link a Facebook account to the current user' })
  @ApiBody({ type: FacebookLoginDto })
  async linkFacebook(
    @CurrentUser('id') userId: string,
    @Body() dto: FacebookLoginDto,
  ): Promise<{ ok: true }> {
    await this.authService.linkFacebook(userId, dto);
    return { ok: true };
  }

  @Post('telegram/link')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Link a Telegram account to the current user' })
  @ApiBody({ type: TelegramLoginDto })
  async linkTelegram(
    @CurrentUser('id') userId: string,
    @Body() dto: TelegramLoginDto,
  ): Promise<{ ok: true }> {
    await this.authService.linkTelegram(userId, dto);
    return { ok: true };
  }
}
