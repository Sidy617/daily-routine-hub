import * as React from 'react';
import { DropdownMenu, Popover as PopoverPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

const surface =
  'glass-strong z-50 rounded-[18px] p-1.5 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1';

export const Menu = DropdownMenu.Root;
export const MenuTrigger = DropdownMenu.Trigger;

export function MenuContent({ className, align = 'end', ...props }: React.ComponentProps<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        sideOffset={8}
        align={align}
        className={cn(surface, 'min-w-[210px] origin-(--radix-dropdown-menu-content-transform-origin)', className)}
        {...props}
      />
    </DropdownMenu.Portal>
  );
}

export function MenuItem({
  className,
  icon,
  danger,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenu.Item> & { icon?: React.ReactNode; danger?: boolean }) {
  return (
    <DropdownMenu.Item
      className={cn(
        'flex h-10 cursor-default select-none items-center gap-3 rounded-[11px] px-3 text-body outline-none transition-colors data-[highlighted]:bg-fill [&_svg]:size-[1.125rem] [&_svg]:text-ink-2',
        danger && 'text-danger [&_svg]:text-danger',
        className,
      )}
      {...props}
    >
      {icon}
      <span className="flex-1">{children}</span>
    </DropdownMenu.Item>
  );
}

export function MenuSeparator() {
  return <DropdownMenu.Separator className="mx-2 my-1 h-px bg-line" />;
}

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export function PopoverContent({ className, align = 'start', ...props }: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={10}
        align={align}
        collisionPadding={12}
        className={cn(surface, 'origin-(--radix-popover-content-transform-origin) p-3', className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
