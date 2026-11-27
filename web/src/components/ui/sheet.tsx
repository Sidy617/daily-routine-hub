import * as React from 'react';
import { Drawer } from 'vaul';
import { Dialog } from 'radix-ui';
import { cn } from '@/lib/utils';
import { useMedia } from '@/lib/useMedia';

/**
 * One sheet for the whole app: on a phone it slides up from the bottom and is dragged
 * down to close (iOS style); on a laptop it opens as a centred glass dialog.
 * The header holds at most two text actions, like iOS: Cancel on the left, Done on the right.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  left,
  right,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const desktop = useMedia('(min-width: 768px)');

  const head = (Title: React.ElementType, Desc: React.ElementType) => (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pt-3 pb-2">
      <div className="justify-self-start">{left}</div>
      <div className="text-center">
        <Title className="title-case text-head font-semibold text-ink">{title}</Title>
        {description ? (
          <Desc className="text-sub text-ink-2">{description}</Desc>
        ) : (
          <Desc className="sr-only">{title}</Desc>
        )}
      </div>
      <div className="justify-self-end">{right}</div>
    </div>
  );

  if (desktop) {
    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <Dialog.Content
            className={cn(
              'glass-strong fixed top-1/2 left-1/2 z-50 flex max-h-[86vh] w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-[28px] outline-none duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
              className,
            )}
          >
            {head(Dialog.Title, Dialog.Description)}
            <div className="overflow-y-auto px-4 pt-2 pb-5">{children}</div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/30" />
        <Drawer.Content className={cn('glass-strong fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-[28px] outline-none', className)}>
          <div aria-hidden className="mx-auto mt-2 h-[0.3125rem] w-9 shrink-0 rounded-full bg-ink-3/60" />
          {head(Drawer.Title, Drawer.Description)}
          <div className="safe-bottom overflow-y-auto px-4 pt-2">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
