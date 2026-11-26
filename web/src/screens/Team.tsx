import { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Copy, Lock, Share2, UserPlus } from 'lucide-react';
import { blockTotals, dayTotals, reviewsOn } from '@/lib/api';
import { addDays, clock, rangeLabel, shortDay, todayISO, weekDays, weekStart } from '@/lib/dates';
import { go, useLoad } from '@/lib/hooks';
import { mostMissed, pct, score, sumTotals } from '@/lib/stats';
import type { BlockTotal, Profile, Team } from '@/lib/types';
import { Avatar, AvatarCircles } from '@/components/Avatar';
import { Ring } from '@/components/Ring';
import { LargeTitle, Screen, stagger } from '@/components/Screen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { GlassTabs, GlassTabsList, GlassTabsTrigger } from '@/components/ui/glass-tabs';
import { Sheet } from '@/components/ui/sheet';
import { toast } from '@/components/ui/toast';

import { canSee } from '@/lib/people';

export function TeamScreen({ me, team, people, view }: { me: Profile; team: Team; people: Profile[]; view: 'day' | 'week' }) {
  const [invite, setInvite] = useState(false);
  const sharing = people.filter((p) => canSee(p, me)).length;
  return (
    <Screen>
      <LargeTitle
        eyebrow={`${people.length} ${people.length === 1 ? 'person' : 'people'}, ${sharing} sharing`}
        title={team.name}
        right={
          <Button variant="glass" size="icon" aria-label="Invite someone" onClick={() => setInvite(true)}>
            <UserPlus />
          </Button>
        }
      />
      <GlassTabs value={view} onValueChange={(v) => go(v === 'week' ? '/team/week' : '/team')}>
        <GlassTabsList className="w-full">
          <GlassTabsTrigger value="day">Today</GlassTabsTrigger>
          <GlassTabsTrigger value="week">This week</GlassTabsTrigger>
        </GlassTabsList>
      </GlassTabs>
      {view === 'day' ? <TeamToday me={me} people={people} /> : <TeamWeek me={me} people={people} />}
      <InviteSheet open={invite} onOpenChange={setInvite} team={team} people={people} />
    </Screen>
  );
}

function TeamToday({ me, people }: { me: Profile; people: Profile[] }) {
  const today = todayISO();
  const ids = people.map((p) => p.id);
  const { data, error, reload } = useLoad(
    async () => {
      const [days, reviews] = await Promise.all([dayTotals(ids, today, today), reviewsOn(ids, today)]);
      return { days, reviews };
    },
    [ids.join(','), today],
  );
  if (error)
    return (
      <div className="glass rounded-card p-4">
        <p>{error}</p>
        <Button variant="plain" size="bare" className="mt-2" onClick={reload}>
          Try again
        </Button>
      </div>
    );
  return (
    <motion.ul variants={stagger.container} initial="initial" animate="animate" className="glass divide-y divide-line overflow-hidden rounded-card">
      {people.map((p) => {
        const day = data?.days.find((d) => d.user_id === p.id);
        const review = data?.reviews.find((r) => r.user_id === p.id);
        const line = review?.missed.split('\n')[0] || review?.tomorrow.split('\n')[0] || '';
        const visible = canSee(p, me);
        const status = !visible ? 'Keeps their days private' : !data ? ' ' : !day || !day.total ? 'Nothing yet today' : `Updated ${clock(day.updated_at)}`;
        const inner = (
          <>
            <Avatar person={p} size={48} />
            <span className="min-w-0 flex-1">
              <span className="title-case flex items-baseline gap-1.5 text-head font-semibold text-ink">
                <span className="truncate">{p.name || 'No name yet'}</span>
                {p.id === me.id && <span className="shrink-0 text-sub font-normal text-ink-3">You</span>}
              </span>
              <span className="block truncate text-sub text-ink-2">{p.focus ? `${p.focus}. ${status}` : status}</span>
              {visible && line && <span className="block truncate text-sub text-ink-3">{line}</span>}
            </span>
            {visible ? (
              <Ring value={day && day.total ? score(day) : 0} size={42} stroke={4.5} colour={p.colour} label={day ? `${day.done} of ${day.total}` : 'No tasks'}>
                <span className="text-[0.625rem] font-semibold text-ink-2">{day && day.total ? `${pct(score(day))}%` : ''}</span>
              </Ring>
            ) : (
              <span className="grid size-[42px] place-items-center rounded-full bg-fill text-ink-3">
                <Lock className="size-4" />
              </span>
            )}
          </>
        );
        return (
          <motion.li key={p.id} variants={stagger.item}>
            {visible ? (
              <a href={`#/p/${p.id}/day/${today}`} className="flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-fill/60 active:bg-fill">
                {inner}
              </a>
            ) : (
              <div className="flex items-center gap-3.5 px-4 py-3">{inner}</div>
            )}
          </motion.li>
        );
      })}
    </motion.ul>
  );
}

function TeamWeek({ me, people }: { me: Profile; people: Profile[] }) {
  const [anchor, setAnchor] = useState(todayISO());
  const days = weekDays(anchor);
  const from = days[0];
  const to = days[6];
  const shown = people.filter((p) => canSee(p, me));
  const ids = shown.map((p) => p.id);
  const { data } = useLoad(async () => {
    const [totals, blocks] = await Promise.all([dayTotals(ids, from, to), blockTotals(ids, from, to)]);
    return { totals, blocks };
  }, [ids.join(','), from]);
  const thisWeek = weekStart(todayISO()) === from;

  return (
    <motion.div variants={stagger.container} initial="initial" animate="animate" className="flex flex-col gap-3">
      <motion.section variants={stagger.item} className="glass rounded-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="title-case text-head font-semibold">{thisWeek ? 'This week' : rangeLabel(from, to)}</h2>
          <span className="flex gap-1">
            <button type="button" aria-label="Earlier week" onClick={() => setAnchor(addDays(from, -7))} className="grid size-8 place-items-center rounded-full text-tint hover:bg-fill">
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Later week"
              disabled={thisWeek}
              onClick={() => setAnchor(addDays(from, 7))}
              className="grid size-8 place-items-center rounded-full text-tint hover:bg-fill disabled:opacity-30"
            >
              <ChevronRight className="size-5" />
            </button>
          </span>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_repeat(7,minmax(0,34px))] items-center gap-x-1.5 gap-y-2">
          <span />
          {days.map((d) => (
            <span key={d} className="text-center text-cap font-semibold text-ink-3">
              {shortDay(d).slice(0, 1)}
            </span>
          ))}
          {shown.map((p) => (
            <WeekRow key={p.id} p={p} me={me} days={days} totals={data?.totals ?? []} />
          ))}
        </div>
      </motion.section>
      {data && <WeekSummary totals={data.totals} blocks={data.blocks} who="the team's" />}
      {people.length > shown.length && (
        <p className="px-4 text-sub text-ink-3">People who keep their days private are not counted.</p>
      )}
    </motion.div>
  );
}

function WeekRow({ p, me, days, totals }: { p: Profile; me: Profile; days: string[]; totals: { user_id: string; date: string; total: number; done: number; half: number }[] }) {
  return (
    <>
      <a href={`#/p/${p.id}/week/${days[0]}`} className="flex min-w-0 items-center gap-2">
        <Avatar person={p} size={26} />
        <span className="title-case truncate text-sub font-medium">{p.id === me.id ? 'You' : p.name}</span>
      </a>
      {days.map((d) => {
        const t = totals.find((x) => x.user_id === p.id && x.date === d);
        const s = t && t.total ? score(t) : null;
        return (
          <a
            key={d}
            href={`#/p/${p.id}/day/${d}`}
            aria-label={t ? `${p.name}, ${shortDay(d)}: ${t.done} of ${t.total}` : `${p.name}, ${shortDay(d)}: no record`}
            className="aspect-square rounded-[9px] bg-fill transition-transform hover:scale-105"
            style={s !== null ? { background: `color-mix(in srgb, ${p.colour} ${Math.round(22 + s * 78)}%, transparent)` } : undefined}
          />
        );
      })}
    </>
  );
}

export function WeekSummary({ totals, blocks, who }: { totals: { total: number; done: number; half: number }[]; blocks: BlockTotal[]; who: string }) {
  const sum = sumTotals(totals);
  if (!sum.total) return <p className="px-4 text-sub text-ink-3">No tasks recorded in this period.</p>;
  const missed = mostMissed(blocks);
  return (
    <motion.section variants={stagger.item} className="glass flex items-center gap-4 rounded-card p-4">
      <Ring value={score(sum)} size={58} stroke={6}>
        <span className="text-sub font-semibold">{pct(score(sum))}%</span>
      </Ring>
      <p className="min-w-0 flex-1 text-sub text-ink-2">
        Of {who} tasks done{sum.half ? ', half done counts as half' : ''}.
        {missed && (
          <>
            {' '}
            <span className="font-semibold text-ink">{missed}</span> is missed most.
          </>
        )}
      </p>
    </motion.section>
  );
}

function InviteSheet({ open, onOpenChange, team, people }: { open: boolean; onOpenChange: (o: boolean) => void; team: Team; people: Profile[] }) {
  const link = `${window.location.origin}${window.location.pathname}?join=${team.invite_code}`;
  const canShare = typeof navigator.share === 'function';
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Invite to ${team.name}`}
      right={
        <Button variant="plain" size="bare" className="font-semibold" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      }
    >
      <div className="flex flex-col items-center gap-4 pb-2 text-center">
        <AvatarCircles people={people} max={6} size={44} />
        <p className="text-sub text-ink-2">Anyone with this link joins {team.name} after signing in.</p>
        <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="tabular text-center text-sub" aria-label="Invite link" />
        <div className="grid w-full grid-cols-2 gap-2">
          <Button
            variant="quiet"
            size="lg"
            onClick={() =>
              navigator.clipboard
                .writeText(link)
                .then(() => toast('Link copied'))
                .catch(() => toast('Could not copy. Select the link and copy it.', true))
            }
          >
            <Copy /> Copy
          </Button>
          <Button
            variant="tint"
            size="lg"
            disabled={!canShare}
            onClick={() => navigator.share?.({ title: `Join ${team.name}`, text: `Join ${team.name} on Routine`, url: link }).catch(() => undefined)}
          >
            <Share2 /> Share
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
