import { Select as SelectPrimitive } from "@base-ui/react/select"
import { cn } from "@/lib/utils"

export function Select({ className, children, items, ...props }) {
  return (
    <SelectPrimitive.Root className={cn("w-full", className)} items={items} {...props}>
      {children}
    </SelectPrimitive.Root>
  )
}

const triggerSizeStyles = {
  sm: "h-8 px-2.5 text-sm",
  default: "h-9 px-3 text-sm",
  lg: "h-10 px-3.5 text-base",
}

export function SelectTrigger({ className, children, size = "default", ...props }) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-lg border border-input bg-popover shadow-xs/5 outline-none transition-shadow not-dark:bg-clip-padding not-disabled:cursor-pointer not-disabled:hover:bg-accent/50 not-disabled:data-pressed:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-64 dark:bg-input/32 dark:not-disabled:before:shadow-[0_-1px_--theme(--color-white/2%)] dark:not-disabled:not-active:not-data-pressed:before:shadow-[0_-1px_--theme(--color-white/6%)] [&_svg:not([class*='size-'])]:size-4",
        triggerSizeStyles[size] || triggerSizeStyles.default,
        className,
      )}
      {...props}
    >
      {children}
      <svg
        className="shrink-0 opacity-60"
        width="10"
        height="6"
        viewBox="0 0 10 6"
        fill="none"
      >
        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </SelectPrimitive.Trigger>
  )
}

export function SelectValue({ className, placeholder, ...props }) {
  return (
    <SelectPrimitive.Value
      className={cn(
        "flex-1 truncate text-left text-foreground data-placeholder:text-muted-foreground",
        className,
      )}
      placeholder={placeholder}
      {...props}
    />
  )
}

export function SelectPopup({ className, children, sideOffset = 4, portalProps, ...props }) {
  return (
    <SelectPrimitive.Portal {...portalProps}>
      <SelectPrimitive.Positioner sideOffset={sideOffset}>
        <SelectPrimitive.Popup
          className={cn(
            "z-50 min-w-[8rem] overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-lg shadow-black/8 outline-none origin-[--anchor-transform-origin] transition-[transform,opacity] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[side=bottom]:animate-in data-[side=left]:animate-in data-[side=right]:animate-in data-[side=top]:animate-in",
            className,
          )}
          {...props}
        >
          {children}
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

export const SelectContent = SelectPopup

export function SelectItem({ className, children, ...props }) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemIndicator className="absolute right-2 flex items-center">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText className="flex-1 truncate">
        {children}
      </SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

export function SelectLabel({ className, children, ...props }) {
  return (
    <SelectPrimitive.Label
      className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)}
      {...props}
    >
      {children}
    </SelectPrimitive.Label>
  )
}

export function SelectGroup({ className, children, ...props }) {
  return (
    <SelectPrimitive.Group className={cn("", className)} {...props}>
      {children}
    </SelectPrimitive.Group>
  )
}

export function SelectGroupLabel({ className, children, ...props }) {
  return (
    <SelectPrimitive.GroupLabel
      className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)}
      {...props}
    >
      {children}
    </SelectPrimitive.GroupLabel>
  )
}

export function SelectSeparator({ className, ...props }) {
  return (
    <SelectPrimitive.Separator
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}
