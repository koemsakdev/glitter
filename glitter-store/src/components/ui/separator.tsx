import { cn } from '@/lib/utils';

export function Separator({
    orientation = 'horizontal',
    className,
}: {
    orientation?: 'horizontal' | 'vertical';
    className?: string;
}) {
    return (
        <div
            role="separator"
            aria-orientation={orientation}
            className={cn(
                'shrink-0 bg-zinc-200 dark:bg-zinc-700',
                orientation === 'vertical' ? 'h-5 w-px' : 'h-px w-full',
                className,
            )}
        />
    );
}
