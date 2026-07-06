"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default" | "lg"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        // iOS-style toggle: system green when on, neutral grey track when off.
        "peer group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors duration-200 ease-in-out outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=default]:h-[18.4px] data-[size=default]:w-8 data-[size=sm]:h-3.5 data-[size=sm]:w-6 data-[size=lg]:h-7.75 data-[size=lg]:w-12.75 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:bg-[#34C759] data-unchecked:bg-zinc-300 dark:data-unchecked:bg-zinc-600 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.35)] ring-0 transition-transform duration-200 ease-in-out group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 group-data-[size=lg]/switch:size-6.75 group-data-[size=default]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[size=sm]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[size=lg]/switch:data-checked:translate-x-5 group-data-[size=default]/switch:data-unchecked:translate-x-0 group-data-[size=sm]/switch:data-unchecked:translate-x-0 group-data-[size=lg]/switch:data-unchecked:translate-x-0.5"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
