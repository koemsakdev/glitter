import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

const inputClass =
  "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  // Controlled number inputs get their own text buffer (see NumberInput).
  if (type === "number" && props.value !== undefined) {
    return <NumberInput className={className} {...props} />
  }
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(inputClass, className)}
      {...props}
    />
  )
}

/** Same number, treating empty / null / undefined as "no value". */
function sameNumber(text: string, value: unknown): boolean {
  const a = text.trim() === "" ? null : Number(text)
  const b = value === "" || value == null ? null : Number(value)
  return a === b
}

/**
 * Controlled `type="number"` input that keeps what the user typed.
 *
 * Callers usually map an empty box to 0 (or a minimum like 1), and a form
 * library may fall back to its default (0) when the value is cleared. Fed
 * straight back as `value`, that put the 0 back the moment it was deleted, and
 * because React won't repaint a number input whose text ("010") equals the
 * same number (10), the stray 0 stuck around. Here the text is a local buffer:
 * while focused it is never overwritten from props; it re-syncs on blur and
 * whenever the value changes from outside (e.g. a form reset).
 */
function NumberInput({
  className,
  value,
  onChange,
  onFocus,
  onBlur,
  ...props
}: Omit<React.ComponentProps<"input">, "type">) {
  const [text, setText] = React.useState(() =>
    value == null ? "" : String(value)
  )
  const [focused, setFocused] = React.useState(false)

  // Adopt outside changes while not editing ("adjust state during render").
  const [prevValue, setPrevValue] = React.useState(value)
  if (prevValue !== value) {
    setPrevValue(value)
    if (!focused && !sameNumber(text, value)) {
      setText(value == null ? "" : String(value))
    }
  }

  return (
    <InputPrimitive
      type="number"
      data-slot="input"
      inputMode={props.inputMode ?? "decimal"}
      className={cn(inputClass, className)}
      {...props}
      value={text}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        // Drop leading zeros ("010" → "10") but keep decimals ("0.5").
        const raw = e.target.value
        const cleaned = raw.replace(/^(-?)0+(?=\d)/, "$1")
        if (cleaned !== raw) e.target.value = cleaned
        setText(cleaned)
        onChange?.(e)
      }}
      onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
        setFocused(true)
        // A lone 0 is a placeholder value — select it so typing replaces it.
        if (e.target.value === "0") e.target.select()
        onFocus?.(e)
      }}
      onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
        setFocused(false)
        // Show what the field actually holds now (e.g. a clamped minimum).
        if (!sameNumber(text, value)) {
          setText(value == null ? "" : String(value))
        }
        onBlur?.(e)
      }}
    />
  )
}

export { Input }
