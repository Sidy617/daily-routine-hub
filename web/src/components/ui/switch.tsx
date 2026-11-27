import * as React from 'react';
import { Switch as SwitchPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

/** iOS switch: green when on. */
export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'relative inline-flex h-[1.9375rem] w-[3.1875rem] shrink-0 cursor-pointer items-center rounded-full bg-fill p-[0.125rem] outline-none transition-colors duration-300 data-[state=checked]:bg-success disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-[1.6875rem] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.15),0_1px_1px_rgb(0_0_0/0.16)] transition-transform duration-300 ease-[var(--ease-spring)] data-[state=checked]:translate-x-5" />
    </SwitchPrimitive.Root>
  );
}
