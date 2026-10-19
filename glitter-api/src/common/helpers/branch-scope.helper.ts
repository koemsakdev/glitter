import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { UserEntity } from '../../users/entities/user.entity';

/**
 * Branch-level access for staff.
 *
 *   admin           → every branch; may filter by any `requested` branch.
 *   manager/cashier → ONLY their assigned branch, whatever was requested.
 *
 * Enforced here on the server — the dashboard's branch switcher is just UI.
 */
export function resolveBranchScope(
  user: Pick<UserEntity, 'role' | 'branchId'>,
  requested?: string | null,
): string | undefined {
  if (user.role === 'admin') return requested || undefined;
  if (!user.branchId) {
    throw new ForbiddenException(
      'Your account is not assigned to a branch. Ask an admin to assign one.',
    );
  }
  return user.branchId;
}

/** Throw unless this staff member may act on data of `branchId`. */
export function assertBranchAccess(
  user: Pick<UserEntity, 'role' | 'branchId'>,
  branchId: string | null | undefined,
): void {
  if (user.role === 'admin') return;
  if (!branchId || branchId !== user.branchId) {
    // 404 rather than 403: don't reveal other branches' records exist.
    throw new NotFoundException('Not found in your branch');
  }
}
