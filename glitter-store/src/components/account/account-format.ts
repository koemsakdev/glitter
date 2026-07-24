import { formatPrice } from '@/lib/api';
import type { AuthProvider } from '@/lib/auth';

export function providerName(p: AuthProvider): string {
    return {
        google: 'Google',
        facebook: 'Facebook',
        telegram: 'Telegram',
        email: 'Email',
    }[p];
}

/** Shorten big money values so a stat tile never overflows (e.g.
 *  $1,234,567 → $1.2M). Values under 1,000 keep full precision. */
export function compactMoney(n: number): string {
    if (Math.abs(n) >= 1000) {
        return `$${new Intl.NumberFormat('en-US', {
            notation: 'compact',
            maximumFractionDigits: 1,
        }).format(n)}`;
    }
    return formatPrice(n);
}

/** Shorten big counts the same way (e.g. 12,500 → 12.5K). */
export function compactCount(n: number): string {
    return n >= 10000
        ? new Intl.NumberFormat('en-US', {
              notation: 'compact',
              maximumFractionDigits: 1,
          }).format(n)
        : String(n);
}
