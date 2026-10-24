import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, ROLES_KEY } from '../decorators/roles.decorator';
import { hasPermission, type Permission } from '../permissions';
import { UserEntity, UserRole } from '../../users/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      targets,
    );
    const permissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      targets,
    );

    // Neither @Roles nor @RequirePermission = any authenticated user allowed
    if (!requiredRoles?.length && !permissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: UserEntity }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    // Allowed by role…
    if (requiredRoles?.includes(user.role)) return true;
    // …or by a permission (role default or granted by an admin).
    if (permissions?.some((p) => hasPermission(user, p))) return true;

    throw new ForbiddenException(
      permissions?.length
        ? `Access denied. Needs permission: ${permissions.join(' or ')}`
        : `Access denied. Required role: ${requiredRoles?.join(' or ')}. Your role: ${user.role}`,
    );
  }
}
