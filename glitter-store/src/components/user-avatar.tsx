'use client';

import { useState } from 'react';
import { fileUrl } from '@/lib/api';

function getInitials(name: string | null): string {
    return (
        (name ?? '?')
            .split(' ')
            .map((p) => p[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase() || '?'
    );
}

export function UserAvatar({
    src,
    name,
    className,
}: {
    src: string | null;
    name: string | null;
    className?: string;
}) {
    const [failed, setFailed] = useState(false);
    const url = fileUrl(src);
    const initials = getInitials(name);

    if (!url || failed) {
        return (
            <span
                className={`flex items-center justify-center bg-(--brand)/10 font-semibold text-(--brand) ${
                    className ?? ''
                }`}
            >
                {initials}
            </span>
        );
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={url}
            alt={name ?? ''}
            onError={() => setFailed(true)}
            className={`object-cover ${className ?? ''}`}
            referrerPolicy="no-referrer"
        />
    );
}
