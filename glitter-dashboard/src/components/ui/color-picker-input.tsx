'use client';

import { Pipette } from 'lucide-react';
import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ColorPickerInputProps {
    colorName: string;
    colorHex: string;
    onColorNameChange: (name: string) => void;
    onColorPick: (hex: string, autoFillName: boolean) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function ColorPickerInput({
     colorName,
     colorHex,
     onColorNameChange,
     onColorPick,
     placeholder = 'Color name',
     disabled,
     className,
}: ColorPickerInputProps) {
    const colorInputRef = React.useRef<HTMLInputElement>(null);
    const safeHex = /^#[0-9A-Fa-f]{6}$/.test(colorHex) ? colorHex : '#000000';

    function handleHexPick(newHex: string) {
        const upperHex = newHex.toUpperCase();
        const trimmed = colorName.trim();
        // Auto-fill name if empty or if it was previously a hex code
        const shouldAutoFill = !trimmed || /^#[0-9A-Fa-f]{6}$/.test(trimmed);
        onColorPick(upperHex, shouldAutoFill);
    }

    return (
        <div className={cn('flex items-center gap-2', className)}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => colorInputRef.current?.click()}
                className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-input transition-colors hover:border-pink-400 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: safeHex }}
                title="Pick a color"
            >
                <Pipette
                    className={cn(
                        'size-3.5 opacity-0 transition-opacity hover:opacity-100',
                        isLightColor(safeHex) ? 'text-zinc-700' : 'text-white',
                    )}
                />
                <input
                    ref={colorInputRef}
                    type="color"
                    value={safeHex}
                    onChange={(e) => handleHexPick(e.target.value)}
                    disabled={disabled}
                    className="absolute inset-0 cursor-pointer opacity-0"
                />
            </button>

            <Input
                type="text"
                value={colorName}
                onChange={(e) => {
                    const v = e.target.value;
                    if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
                        onColorPick(v.toUpperCase(), true);
                    } else {
                        onColorNameChange(v);
                    }
                }}
                placeholder={placeholder}
                disabled={disabled}
                className="h-9 flex-1 rounded-md shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-800"
            />
        </div>
    );
}

function isLightColor(hex: string): boolean {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}