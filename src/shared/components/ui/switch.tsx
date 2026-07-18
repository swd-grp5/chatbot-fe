import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { Lock, Unlock } from "lucide-react";

import { cn } from "@/shared/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

const ActiveLockSwitch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "group relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:border-success/50 data-[state=checked]:bg-success",
      "data-[state=unchecked]:border-border data-[state=unchecked]:bg-input",
      className,
    )}
    {...props}
    ref={ref}
  >
    <Unlock
      aria-hidden
      className="pointer-events-none absolute left-1.5 top-1/2 size-3 -translate-y-1/2 text-white opacity-0 transition-opacity group-data-[state=checked]:opacity-100"
    />
    <Lock
      aria-hidden
      className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground opacity-100 transition-opacity group-data-[state=checked]:opacity-0"
    />
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block size-4 rounded-full bg-white shadow-md ring-1 ring-black/5 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5",
      )}
    />
  </SwitchPrimitives.Root>
));
ActiveLockSwitch.displayName = "ActiveLockSwitch";

export { Switch, ActiveLockSwitch };
