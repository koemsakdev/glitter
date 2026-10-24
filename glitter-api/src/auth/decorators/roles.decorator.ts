import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';
import type { Permission } from '../permissions';

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

export const PERMISSIONS_KEY = 'permissions';

/**
 * Also allow staff who hold ANY of these permissions (granted by an admin or
 * part of their role's defaults), even if their role isn't in @Roles.
 *
 *   @Roles('admin')
 *   @RequirePermission('products.edit')
 *   @Patch(':id') update(...)
 */
export const RequirePermission = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
