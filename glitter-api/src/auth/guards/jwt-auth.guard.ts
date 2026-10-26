import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/** What a user with a temporary password may still call. */
const ALLOWED_BEFORE_PASSWORD_CHANGE = new Set([
  '/api/auth/me',
  '/api/auth/change-password',
  '/api/auth/logout',
]);

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      url?: string;
      path?: string;
      user?: { mustChangePassword?: boolean };
    }>();

    // Public static files (uploaded images served by ServeStaticModule)
    if (request.url?.startsWith('/upload/')) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const ok = (await super.canActivate(context)) as boolean;
    if (!ok) return false;

    // Signed in with a default/reset password: nothing else until they pick
    // their own (the dashboard sends them to the "set new password" screen).
    const path = (request.path ?? request.url ?? '').split('?')[0];
    if (
      request.user?.mustChangePassword &&
      !ALLOWED_BEFORE_PASSWORD_CHANGE.has(path)
    ) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Please set a new password before continuing.',
      });
    }
    return true;
  }
}
