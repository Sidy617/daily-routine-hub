import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { dayTotals } from '@/lib/api';
import { addMonths, monthGrid, monthLabel, monthStart, todayISO } from '@/lib/dates';
import { go, useLoad } from '@/lib/hooks';
import { score } from '@/lib/stats';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './ui/menu';

/** Tap the day's title: a glass calendar to jump to any day, with a dot where there is a record. */
export function DateMenu({ meId, date, children }: { meId: string; date: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(monthStart(date));
  const grid = monthGrid(month);
  const days = grid.flat().filter(Boolean) as string[];
  const { data } = useLoad(async () => (open ? dayTotals([meId], days[0], days[days.length - 1]) : []), [open, month, meId]);
  const today = todayISO();
  const pick = (path: string) => {
    setOpen(false);
    go(path);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setMonth(monthStart(date));
      }}
    >
      <PopoverTrigger className="title-case group inline-flex max-w-full items-center gap-1 rounded-lg outline-none">
        <span className="truncate">{children}</span>
        <ChevronDown className="mt-1 size-5 shrink-0 text-ink-3 transition-transform duration-300 group-data-[state=open]:rotate-180" />
      </PopoverTrigger>
      <PopoverContent className="w-[308px]">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="title-case text-head font-semibold">{monthLabel(month)}</span>
          <span className="flex gap-1">
            <button type="button" aria-label="Earlier month" onClick={() => setMonth(addMonths(month, -1))} className="grid size-8 place-items-center rounded-full text-tint hover:bg-fill">
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" aria-label="Later month" onClick={() => setMonth(addMonths(month, 1))} className="grid size-8 place-items-center rounded-full text-tint hover:bg-fill">
              <ChevronRight className="size-5" />
            </button>
          </span>
        </div>
        <div className="grid grid-cols-7 gap-y-0.5 text-center">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span key={i} className="py-1 text-cap font-semibold text-ink-3">
              {d}
            </span>
          ))}
          {grid.flat().map((d, i) => {
            if (!d) return <span key={i} />;
            const t = data?.find((x) => x.date === d);
            const s = t && t.total ? score(t) : null;
            return (
              <button
                key={d}
                type="button"
                onClick={() => pick(d === today ? '/' : `/day/${d}`)}
                className={cn(
                  'tabular relative mx-auto grid size-9 place-items-center rounded-full text-body transition-colors',
                  d === date ? 'bg-tint font-semibold text-tint-ink' : d === today ? 'font-semibold text-tint' : 'text-ink hover:bg-fill',
                )}
              >
                {Number(d.slice(8))}
                {s !== null && d !== date && <span className="absolute bottom-1 size-1 rounded-full bg-tint" style={{ opacity: 0.35 + s * 0.65 }} />}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between border-t border-line px-1 pt-2">
          <button type="button" className="text-sub font-semibold text-tint" onClick={() => pick('/')}>
            Today
          </button>
          <button type="button" className="text-sub font-semibold text-tint" onClick={() => pick(`/p/${meId}/week/${date}`)}>
            My week
          </button>
          <button type="button" className="text-sub font-semibold text-tint" onClick={() => pick(`/p/${meId}/month/${date}`)}>
            My month
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
