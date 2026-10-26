/**
 * Password given to staff an admin creates (or resets) without typing one.
 * They must change it on first sign-in (users.must_change_password).
 * Override with DEFAULT_STAFF_PASSWORD in .env.
 */
export function defaultStaffPassword(): string {
  return process.env.DEFAULT_STAFF_PASSWORD?.trim() || 'Glitter@123';
}
