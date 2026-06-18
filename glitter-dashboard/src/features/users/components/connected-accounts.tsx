'use client';

import { Mail } from 'lucide-react';
import Image from 'next/image';
import type { AuthProvider } from '@/types/user';

interface ProviderMeta {
    key: AuthProvider;
    label: string;
    /** Logo placed in /public/social/. Email falls back to an icon. */
    img?: string;
}

const PROVIDERS: ProviderMeta[] = [
    { key: 'email', label: 'Email' },
    { key: 'google', label: 'Google', img: '/social/google.png' },
    { key: 'facebook', label: 'Facebook', img: '/social/facebook.png' },
    { key: 'telegram', label: 'Telegram', img: '/social/telegram.png' },
];

interface ConnectedAccountsProps {
    linkedProviders?: AuthProvider[];
}

/**
 * Shows ONLY the sign-in methods the customer is actually linked with.
 * Unbound providers are hidden. Renders nothing when none are linked.
 */
export function ConnectedAccounts({ linkedProviders }: ConnectedAccountsProps) {
    const linked = new Set(linkedProviders ?? []);
    const shown = PROVIDERS.filter((p) => linked.has(p.key));

    if (shown.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2">
            {shown.map((p) => (
                <span
                    key={p.key}
                    className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm font-medium"
                >
                    {p.img ? (
                        <Image
                            src={p.img}
                            alt={p.label}
                            width={18}
                            height={18}
                            className="size-4.5 object-contain"
                        />
                    ) : (
                        <Mail className="size-4 text-muted-foreground" />
                    )}
                    {p.label}
                </span>
            ))}
        </div>
    );
}
