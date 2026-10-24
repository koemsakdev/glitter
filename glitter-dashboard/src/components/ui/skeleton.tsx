import { cn } from "@/lib/utils"

/** Placeholder block with a soft shimmer sweeping across it. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("skeleton-shimmer rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
