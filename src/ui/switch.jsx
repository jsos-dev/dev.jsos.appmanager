import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "@/lib/utils"

export function Switch({ className, ...props }) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative inline-flex h-5.5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-input shadow-xs/24 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-50 dark:bg-input/56",
        className,
      )}
      data-slot="switch"
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-4.5 rounded-full bg-background shadow-sm ring-1 ring-black/[4%] transition-transform translate-x-px dark:bg-foreground dark:ring-0 data-checked:translate-x-[calc(--spacing(5.5)-100%-1px)]",
        )}
      />
    </SwitchPrimitive.Root>
  )
}
