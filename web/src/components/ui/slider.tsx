import * as React from 'react';
import { Slider as SliderPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

/** iOS slider: a thin track filled with your colour and a round white thumb. */
export function Slider({
  className,
  label,
  valueText,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & { label: string; valueText?: string }) {
  return (
    <SliderPrimitive.Root className={cn('relative flex h-8 w-full touch-none select-none items-center', className)} {...props}>
      <SliderPrimitive.Track className="relative h-1 grow overflow-hidden rounded-full bg-fill">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-tint-fill" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={label}
        aria-valuetext={valueText}
        className="block size-7 rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.15),0_1px_1px_rgb(0_0_0/0.16)] outline-none transition-transform duration-200 focus-visible:ring-2 focus-visible:ring-tint/50 active:scale-110"
      />
    </SliderPrimitive.Root>
  );
}
