'use client';

import { Check, Circle } from 'lucide-react';
import { tr, type Lang } from '@/lib/locale';
import { cn } from '@/lib/utils';

/**
 * Password policy — keep in step with the API (common/validators/
 * strong-password.ts). TESTING: short, simple passwords allowed. Before going
 * live set PASSWORD_MIN_LENGTH = 8 and REQUIRE_MIXED = true.
 */
export const PASSWORD_MIN_LENGTH = 4;
export const REQUIRE_MIXED = false;

/** Whether the password is accepted (the meter itself is only advice). */
export function isStrongPassword(pw: string): boolean {
    const mixed = /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw);
    return pw.length >= PASSWORD_MIN_LENGTH && (!REQUIRE_MIXED || mixed);
}

const LEVELS = [
    {
        key: 'pwWeak',
        bar: 'bg-rose-500',
        text: 'text-rose-600 dark:text-rose-400',
    },
    {
        key: 'pwFair',
        bar: 'bg-amber-500',
        text: 'text-amber-600 dark:text-amber-400',
    },
    {
        key: 'pwGood',
        bar: 'bg-sky-500',
        text: 'text-sky-600 dark:text-sky-400',
    },
    {
        key: 'pwStrong',
        bar: 'bg-emerald-500',
        text: 'text-emerald-600 dark:text-emerald-400',
    },
];

/** Live strength meter + checklist under a new-password field. */
export function PasswordStrength({
    password,
    lang,
}: {
    password: string;
    lang: Lang;
}) {
    if (!password) return null;
    const c = {
        length: password.length >= PASSWORD_MIN_LENGTH,
        case: /[a-z]/.test(password) && /[A-Z]/.test(password),
        number: /\d/.test(password),
        symbol: /[^A-Za-z0-9]/.test(password),
    };
    const met = [
        password.length >= 8,
        /[a-z]/.test(password),
        /[A-Z]/.test(password),
        c.number,
    ].filter(Boolean).length;
    const s =
        met < 3 ? 1 : met === 3 ? 2 : c.symbol || password.length >= 12 ? 4 : 3;
    const level = LEVELS[s - 1];
    const rules = [
        { ok: c.length, key: 'pwRuleLength' },
        { ok: c.case, key: 'pwRuleCase', optional: !REQUIRE_MIXED },
        { ok: c.number, key: 'pwRuleNumber', optional: !REQUIRE_MIXED },
        { ok: c.symbol, key: 'pwRuleSymbol', optional: true },
    ];
    return (
        <div className="mt-2 space-y-2" aria-live="polite">
            <div className="flex items-center gap-3">
                <div className="grid flex-1 grid-cols-4 gap-1.5">
                    {[1, 2, 3, 4].map((i) => (
                        <span
                            key={i}
                            className={cn(
                                'h-1.5 rounded-full bg-zinc-200 transition-colors duration-300 dark:bg-zinc-700',
                                s >= i && level.bar,
                            )}
                        />
                    ))}
                </div>
                <span
                    className={cn(
                        'w-16 text-right text-xs font-semibold',
                        level.text,
                    )}
                >
                    {tr(lang, level.key)}
                </span>
            </div>
            <ul className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                {rules.map((r) => (
                    <li
                        key={r.key}
                        className={cn(
                            'flex items-center gap-1.5',
                            r.ok
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-zinc-500 dark:text-zinc-400',
                        )}
                    >
                        {r.ok ? (
                            <Check className="size-3.5 shrink-0" />
                        ) : (
                            <Circle className="size-3 shrink-0 opacity-50" />
                        )}
                        {tr(lang, r.key).replace(
                            '{n}',
                            String(PASSWORD_MIN_LENGTH),
                        )}
                        {r.optional && (
                            <span className="opacity-60">
                                ({tr(lang, 'pwOptional')})
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
