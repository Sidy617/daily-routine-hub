import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** A grouped list on glass, like iOS Settings. */
export function Group({ title, footer, children, className }: { title?: string; footer?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('space-y-1.5', className)}>
      {title && <h2 className="label-case px-4 text-sub font-medium text-ink-2">{title}</h2>}
      <div className="glass divide-y divide-line overflow-hidden rounded-card">{children}</div>
      {footer && <p className="px-4 text-sub text-ink-2">{footer}</p>}
    </section>
  );
}

/** A row: coloured icon tile, label, value or control, and a chevron when it opens something. */
export function Row({
  icon,
  tile,
  label,
  sub,
  value,
  control,
  onClick,
  href,
  danger,
  chevron = true,
  below,
  className,
}: {
  icon?: ReactNode;
  tile?: string;
  label: ReactNode;
  sub?: ReactNode;
  value?: ReactNode;
  control?: ReactNode;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  /** Actions (like Sign out) do not open anything, so they show no chevron. */
  chevron?: boolean;
  /** Content on its own line under the label, such as a row of swatches. */
  below?: ReactNode;
  className?: string;
}) {
  const opens = !!(onClick || href) && !control && chevron;
  const body = (
    <>
      {icon && (
        <span
          className={cn('grid size-[1.875rem] shrink-0 place-items-center rounded-[8px] [&_svg]:size-[1.0625rem]', tile ? 'text-white' : 'bg-tint-fill text-tint-ink')}
          style={tile ? { background: tile } : undefined}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-body', danger ? 'text-danger' : 'text-ink')}>{label}</span>
        {sub && <span className="block truncate text-sub text-ink-2">{sub}</span>}
        {below && <span className="mt-2 block">{below}</span>}
      </span>
      {value !== undefined && <span className="min-w-0 max-w-[45%] truncate text-body text-ink-2">{value}</span>}
      {control}
      {opens && <ChevronRight className="size-[1.125rem] shrink-0 text-ink-3" />}
    </>
  );
  const cls = cn(
    'flex min-h-[3.125rem] w-full gap-3 px-4 py-2 text-left transition-colors',
    below ? 'items-start py-3' : 'items-center',
    opens && 'active:bg-fill hover:bg-fill/60',
    className,
  );
  if (href) {
    return (
      <a href={href} className={cls}>
        {body}
      </a>
    );
  }
  if (onClick && !control && !below) {
    return (
      <motion.button type="button" whileTap={{ scale: 0.995 }} onClick={onClick} className={cls}>
        {body}
      </motion.button>
    );
  }
  return <div className={cls}>{body}</div>;
}
