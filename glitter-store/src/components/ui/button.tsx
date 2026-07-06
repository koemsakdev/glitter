import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
    'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-(--brand)/40 disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            variant: {
                default: 'bg-(--brand) text-white hover:opacity-90',
                outline:
                    'border border-zinc-200 text-zinc-700 hover:border-(--brand) dark:border-zinc-700 dark:text-zinc-200',
                ghost: 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
            },
            size: {
                default: 'h-10 px-4 py-2',
                sm: 'h-9 px-3',
                icon: 'size-10',
            },
        },
        defaultVariants: { variant: 'default', size: 'default' },
    },
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, type = 'button', ...props }, ref) => (
        <button
            ref={ref}
            type={type}
            className={cn(buttonVariants({ variant, size }), className)}
            {...props}
        />
    ),
);
Button.displayName = 'Button';

export { buttonVariants };
