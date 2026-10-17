import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';

export const ROLES_KEY = 'roles';

/**
 * Restrict access to specific roles. Must be used with RolesGuard.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles('admin', 'manager')
 *   @Post()
 *   createProduct(...) {}
 *
 * If no @Roles is set, the guard allows any authenticated user.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
