import { ForbiddenException } from '@nestjs/common';
import { UserEntity, UserRole } from '../../users/entities/user.entity';

/**
 * Admin-level roles that can bypass ownership checks
 * (e.g., admins managing other users' addresses for customer support).
 */
const ADMIN_ROLES: UserRole[] = ['admin'];

/**
 * Assert that the current user either owns a resource OR is an admin.
 *
 * Usage:
 *   const address = await this.addressRepository.findOne({ where: { id } });
 *   assertOwnerOrAdmin(currentUser, address.userId);
 *
 * Throws ForbiddenException if neither condition is met.
 */
export function assertOwnerOrAdmin(
  currentUser: UserEntity,
  resourceUserId: string,
  errorMessage = 'You do not have permission to access this resource',
): void {
  const isOwner = currentUser.id === resourceUserId;
  const isAdmin = ADMIN_ROLES.includes(currentUser.role);

  if (!isOwner && !isAdmin) {
    throw new ForbiddenException(errorMessage);
  }
}

/**
 * Check without throwing. Returns true if user is owner OR admin.
 */
export function isOwnerOrAdmin(
  currentUser: UserEntity,
  resourceUserId: string,
): boolean {
  return (
    currentUser.id === resourceUserId || ADMIN_ROLES.includes(currentUser.role)
  );
}

/**
 * Check if the user has an admin-level role.
 */
export function isAdmin(user: UserEntity): boolean {
  return ADMIN_ROLES.includes(user.role);
}
