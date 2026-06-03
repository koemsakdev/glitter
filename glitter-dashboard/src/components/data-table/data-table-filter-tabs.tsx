"use client";

import type { FilterTabOption } from "./types";

interface DataTableFilterTabsProps<TValue extends string> {
  options: FilterTabOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
}

export function DataTableFilterTabs<TValue extends string>({
  options,
  value,
  onChange,
}: DataTableFilterTabsProps<TValue>) {
  return (
    <div className="inline-flex rounded-lg border bg-muted/50 p-1 dark:bg-muted/30">
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`relative rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-pink-100 text-pink-500 dark:bg-pink-500/25 dark:text-pink-400"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
