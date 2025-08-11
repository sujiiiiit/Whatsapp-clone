import * as React from "react"
import { cn } from "@/lib/utils"

function IconButton({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean
}) {
  const Comp = asChild ? "span" : "button"

  return (
    <Comp
      data-slot="icon-button"
      className={cn(
        "inline-flex items-center justify-center p-2.5  transition-colors disabled:pointer-events-none disabled:opacity-50",
        "bg-transparent text-secondary-foreground hover:bg-primary/10",
        "[&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer rounded-full",
        className
      )}
      {...props}
    />
  )
}

export { IconButton }
