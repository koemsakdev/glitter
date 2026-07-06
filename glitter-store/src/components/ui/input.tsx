import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<
    HTMLInputElement,
    React.ComponentProps<'input'>
>(({ className, type, ...props }, ref) => (
    <input
        ref={ref}
        type={type}
        className={cn(
            'flex h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-1 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus-visible:border-(--brand) focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-(--brand)/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus-visible:bg-zinc-900',
            className,
        )}
        {...props}
    />
));
Input.displayName = 'Input';
