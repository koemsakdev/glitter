/**
 * How long the activity log / audit trail (audit_logs) and the sign-in log
 * (login_attempts) are kept before being hard-deleted. AUDIT_RETENTION_DAYS
 * in .env, default 90 (≈ 3 months).
 */
export function auditRetentionDays(): number {
  const n = Number.parseInt(process.env.AUDIT_RETENTION_DAYS ?? '', 10);
  return Number.isInteger(n) && n >= 1 ? n : 90;
}
