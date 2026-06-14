'use client';

import { Loader2 } from 'lucide-react';
import { BrandedLoader } from '@/components/feedback/branded-loader';

interface LoadingScreenProps {
    variant?: 'page' | 'block' | 'inline';
    message?: string;
    className?: string;
}

export function LoadingScreen({
                                  variant = 'block',
                                  message,
                                  className = '',
                              }: LoadingScreenProps) {
    if (variant === 'page') {
        // Fill the available content area (viewport minus topbar + padding) rather
        // than a full 100vh, so the loader stays centered without adding a scrollbar
        // when rendered inside the dashboard content area.
        return (
            <div
                className={`flex min-h-[calc(100vh-8rem)] items-center justify-center ${className}`}
            >
                <BrandedLoader size="md" label={message} />
            </div>
        );
    }

    if (variant === 'inline') {
        return (
            <span
                className={`inline-flex items-center gap-2 text-sm text-muted-foreground ${className}`}
            >
        <Loader2 className="size-4 animate-spin" />
                {message && <span>{message}</span>}
      </span>
        );
    }

    return (
        <div
            className={`flex flex-col items-center justify-center py-12 ${className}`}
        >
            <BrandedLoader size="sm" label={message} />
        </div>
    );
}
