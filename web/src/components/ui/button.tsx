import * as React from 'react';
import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Disabled buttons turn grey instead of fading: a faded colour on dark glass reads as black.
const button = cva(
  'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-semibold outline-none transition-[transform,opacity,background-color] duration-200 ease-out active:scale-[0.97] disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        tint: 'bg-tint-fill text-tint-ink shadow-[0_8px_20px_-10px_var(--tint-fill)] hover:opacity-90 disabled:bg-fill disabled:text-ink-3 disabled:shadow-none',
        glass: 'glass text-ink hover:bg-glass-strong disabled:text-ink-3',
        quiet: 'bg-fill text-ink hover:opacity-80 disabled:text-ink-3',
        plain: 'text-tint hover:opacity-75 disabled:text-ink-3',
        danger: 'text-danger hover:opacity-75 disabled:text-ink-3',
      },
      size: {
        sm: 'h-8 rounded-full px-3 text-sub [&_svg]:size-4',
        md: 'h-10 rounded-full px-4 text-body [&_svg]:size-[18px]',
        lg: 'h-12 w-full rounded-[14px] px-5 text-head [&_svg]:size-5',
        icon: 'size-10 rounded-full [&_svg]:size-[19px]',
        bare: 'h-auto p-0 text-body',
      },
    },
    defaultVariants: { variant: 'glass', size: 'md' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof button> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, ...props }, ref) => {
  const Comp = asChild ? Slot.Root : 'button';
  return <Comp ref={ref} className={cn(button({ variant, size }), className)} {...props} />;
});
Button.displayName = 'Button';
