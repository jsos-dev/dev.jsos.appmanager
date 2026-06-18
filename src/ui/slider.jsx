import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { cn } from "@/lib/utils"

export function Slider({ className, ...props }) {
  return (
    <SliderPrimitive.Root
      thumbAlignment="edge"
      className={cn(
        "relative flex w-full touch-none select-none items-center py-1 data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full h-5 items-center cursor-pointer">
        <SliderPrimitive.Track className="relative h-1.5 w-full grow rounded-full bg-muted">
          <SliderPrimitive.Indicator className="absolute h-full rounded-full bg-primary" />
          <SliderPrimitive.Thumb className="block size-4 rounded-full border border-primary/50 bg-background shadow-xs transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background data-pressed:bg-accent" />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export function SliderValue({ className, ...props }) {
  return (
    <SliderPrimitive.Value
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}
