'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
    className?: string;
}

export function ErrorState({
                               title = 'Something went wrong',
                               message = 'Please try again or contact support if the problem persists.',
                               onRetry,
                               className = '',
                           }: ErrorStateProps) {
    return (
        <div
            className={`flex flex-col items-center justify-center gap-3 py-12 text-center ${className}`}
        >
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="size-6 text-destructive" />
            </div>
            <div>
                <h3 className="text-base font-semibold">{title}</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
            </div>
            {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                    <RefreshCw className="mr-2 size-3.5" />
                    Try again
                </Button>
            )}
        </div>
    );
}