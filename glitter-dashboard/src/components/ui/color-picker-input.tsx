'use client';

import { Pipette } from 'lucide-react';
import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ColorPickerInputProps {
    /** Color name (e.g., "Black") */
    colorName: string;
    /** Hex value (e.g., "#000000") */
    colorHex: string;
    onColorNameChange: (name: string) => void;
    onColorHexChange: (hex: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function ColorPickerInput({
     colorName,
     colorHex,
     onColorNameChange,
     onColorHexChange,
     placeholder = 'Color name',
     disabled,
     className,
 }: ColorPickerInputProps) {
    const colorInputRef = React.useRef<HTMLInputElement>(null);

    // Validate hex — fall back to a default if invalid
    const safeHex = /^#[0-9A-Fa-f]{6}$/.test(colorHex) ? colorHex : '#000000';

    /**
     * When the user picks a hex via the native color picker:
     *  - Always update the hex
     *  - Also fill the name with the hex if the name was empty OR previously auto-filled from a hex
     *    This lets the user override with "Black" later, but starts with something useful
     */
    function handleHexPick(newHex: string) {
        const upperHex = newHex.toUpperCase();
        onColorHexChange(upperHex);

        const trimmed = colorName.trim();
        // Auto-fill if empty OR if current name is itself a hex (means it was auto-filled before)
        const isAutoFilled = /^#[0-9A-Fa-f]{6}$/.test(trimmed);
        if (!trimmed || isAutoFilled) {
            onColorNameChange(upperHex);
        }
    }

    return (
        <div className={cn('flex items-center gap-2', className)}>
            {/* Color swatch + hidden native color picker */}
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
                        'size-3.5 transition-opacity opacity-0 hover:opacity-100',
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

            {/* Color name input */}
            <Input
                type="text"
                value={colorName}
                onChange={(e) => onColorNameChange(e.target.value)}
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
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6;
}