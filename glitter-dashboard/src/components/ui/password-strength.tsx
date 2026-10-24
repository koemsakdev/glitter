'use client';

import { Check, Circle } from 'lucide-react';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Password policy — keep in step with the API (common/validators/
 * strong-password.ts). TESTING: short, simple passwords allowed. Before going
 * live set PASSWORD_MIN_LENGTH = 8 and REQUIRE_MIXED = true.
 */
export const PASSWORD_MIN_LENGTH = 4;
export const REQUIRE_MIXED = false;

export function passwordChecks(pw: string) {
    return {
        length: pw.length >= PASSWORD_MIN_LENGTH,
        lower: /[a-z]/.test(pw),
        upper: /[A-Z]/.test(pw),
        number: /\d/.test(pw),
        symbol: /[^A-Za-z0-9]/.test(pw),
    };
}

/** Whether the password is accepted (the meter itself is only advice). */
export function isStrongPassword(pw: string): boolean {
    const c = passwordChecks(pw);
    return c.length && (!REQUIRE_MIXED || (c.lower && c.upper && c.number));
}

/** 0 = empty … 4 = strong (rule met + symbol or 12+ characters). */
function score(pw: string): number {
    if (!pw) return 0;
    const c = passwordChecks(pw);
    const met = [pw.length >= 8, c.lower, c.upper, c.number].filter(
        Boolean,
    ).length;
    if (met < 3) return 1;
    if (met === 3) return 2;
    return c.symbol || pw.length >= 12 ? 4 : 3;
}

const LEVELS: { key: TranslationKey; bar: string; text: string }[] = [
    {
        key: 'password.strength.weak',
        bar: 'bg-rose-500',
        text: 'text-rose-600 dark:text-rose-400',
    },
    {
        key: 'password.strength.fair',
        bar: 'bg-amber-500',
        text: 'text-amber-600 dark:text-amber-400',
    },
    {
        key: 'password.strength.good',
        bar: 'bg-sky-500',
        text: 'text-sky-600 dark:text-sky-400',
    },
    {
        key: 'password.strength.strong',
        bar: 'bg-emerald-500',
        text: 'text-emerald-600 dark:text-emerald-400',
    },
];

/**
 * Live strength meter + checklist shown under a new-password field, so people
 * see exactly what's missing before they press Save.
 */
export function PasswordStrength({ password }: { password: string }) {
    const { t } = useI18n();
    const s = score(password);
    const c = passwordChecks(password);
    const level = LEVELS[Math.max(0, s - 1)];
    const rules: { ok: boolean; key: TranslationKey; required: boolean }[] = [
        { ok: c.length, key: 'password.rule.length', required: true },
        {
            ok: c.upper && c.lower,
            key: 'password.rule.case',
            required: REQUIRE_MIXED,
        },
        { ok: c.number, key: 'password.rule.number', required: REQUIRE_MIXED },
        { ok: c.symbol, key: 'password.rule.symbol', required: false },
    ];

    return (
        <div className="space-y-2" aria-live="polite">
            <div className="flex items-center gap-3">
                <div className="grid flex-1 grid-cols-4 gap-1.5">
                    {[1, 2, 3, 4].map((i) => (
                        <span
                            key={i}
                            className={cn(
                                'h-1.5 rounded-full bg-muted transition-colors duration-300',
                                s >= i && level.bar,
                            )}
                        />
                    ))}
                </div>
                <span
                    className={cn(
                        'w-16 text-right text-xs font-semibold',
                        password ? level.text : 'text-muted-foreground',
                    )}
                >
                    {password ? t(level.key) : ''}
                </span>
            </div>
            <ul className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                {rules.map((r) => (
                    <li
                        key={r.key}
                        className={cn(
                            'flex items-center gap-1.5 transition-colors',
                            r.ok
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-muted-foreground',
                        )}
                    >
                        {r.ok ? (
                            <Check className="size-3.5 shrink-0" />
                        ) : (
                            <Circle className="size-3 shrink-0 opacity-50" />
                        )}
                        {t(r.key).replace('{n}', String(PASSWORD_MIN_LENGTH))}
                        {!r.required && (
                            <span className="opacity-60">
                                ({t('password.rule.optional')})
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
