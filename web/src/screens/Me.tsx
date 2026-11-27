import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ALargeSmall, Archive, Camera, Check as CheckIcon, ChevronLeft, Eye, History, ImageUp, LogOut, Palette, Plus, Sparkles, Trash2, Users } from 'lucide-react';
import { clearMyPhoto, db, getBlocks, importDays, saveRoutine, setMyPhoto, updateProfile } from '@/lib/api';
import { CHARACTERS, CHARACTER_NAMES, TONES, TONE_SWATCHES, avatarKey, avatarUrl, splitKey, squarePhoto } from '@/lib/avatars';
import { PERSON_COLOURS, TILE } from '@/lib/colours';
import { QUARTER_HOURS, hm, todayISO } from '@/lib/dates';
import { useLoad } from '@/lib/hooks';
import { readOldDays, readOldWeekGoals } from '@/lib/importOld';
import { minutesOf } from '@/lib/now';
import type { Block, Profile, Team } from '@/lib/types';
import { cn } from '@/lib/utils';
import { APP_SIZES, THEMES, applyAppSize, applyTheme, savedAppSize } from '@/themes';
import { Avatar } from '@/components/Avatar';
import { Brand } from '@/components/Brand';
import { Group, Row } from '@/components/List';
import { Screen, stagger } from '@/components/Screen';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';

export function Me({ me, team, onProfile, openDay }: { me: Profile; team: Team; onProfile: (p: Profile) => void; openDay?: boolean }) {
  const [name, setName] = useState(me.name);
  const [focus, setFocus] = useState(me.focus);
  const [sheet, setSheet] = useState<'picture' | 'theme' | 'day' | null>(openDay ? 'day' : null);
  const [size, setSize] = useState(savedAppSize);
  const { data: blocks, reload: reloadBlocks } = useLoad(() => getBlocks(me.id), [me.id]);
  const email = useLoad(async () => (await db.auth.getUser()).data.user?.email ?? '', []);
  const theme = THEMES.find((t) => t.id === me.theme) ?? THEMES[0];

  useEffect(() => {
    if (openDay) setSheet('day');
  }, [openDay]);

  async function patch(p: Partial<Profile>, note = 'Saved') {
    const before = me;
    onProfile({ ...me, ...p });
    try {
      await updateProfile(me.id, p);
      if (note) toast(note);
    } catch {
      onProfile(before);
      toast('Not saved. Check your connection.', true);
    }
  }

  const old = useMemo(() => {
    try {
      return { days: readOldDays(localStorage), goals: readOldWeekGoals(localStorage) };
    } catch {
      return { days: [], goals: [] };
    }
  }, []);

  return (
    <Screen>
      <motion.div variants={stagger.container} initial="initial" animate="animate" className="flex flex-col gap-6">
        <motion.section variants={stagger.item} className="glass flex flex-col items-center gap-3 rounded-card px-4 pt-6 pb-4 text-center">
          <button type="button" onClick={() => setSheet('picture')} className="relative rounded-full" aria-label="Change picture">
            <Avatar person={{ ...me, name }} size={92} className="shadow-[0_12px_30px_-14px_rgb(0_0_0/0.45)]" />
            <span className="absolute -right-0.5 -bottom-0.5 grid size-8 place-items-center rounded-full bg-tint-fill text-tint-ink ring-[3px] ring-[var(--glass-strong)]">
              <Camera className="size-4" />
            </span>
          </button>
          <div className="w-full max-w-xs space-y-1">
            <input
              value={name}
              maxLength={40}
              aria-label="Name"
              onChange={(e) => setName(e.target.value)}
              onBlur={() => name.trim() && name.trim() !== me.name && patch({ name: name.trim() })}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              className="title-case w-full rounded-lg bg-transparent text-center font-display text-title font-bold outline-none focus:bg-fill"
            />
            <input
              value={focus}
              maxLength={40}
              placeholder="What you work on"
              aria-label="What you work on"
              onChange={(e) => setFocus(e.target.value)}
              onBlur={() => focus.trim() !== me.focus && patch({ focus: focus.trim() })}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              className="w-full rounded-lg bg-transparent text-center text-body text-ink-2 outline-none placeholder:text-ink-3 focus:bg-fill"
            />
          </div>
          <p className="text-sub text-ink-2">{team.name}</p>
        </motion.section>

        <motion.div variants={stagger.item}>
          <Group title="Appearance">
            <Row icon={<Palette />} tile={TILE.orange} label="Theme" value={theme.name} onClick={() => setSheet('theme')} />
            <Row
              icon={<Sparkles />}
              label="Your colour"
              sub="Tints your app and marks you in the team"
              below={
                <span className="flex flex-wrap gap-2 pb-0.5">
                  {PERSON_COLOURS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Colour ${c}`}
                      aria-pressed={me.colour === c}
                      onClick={() => {
                        applyTheme(me.theme, c);
                        patch({ colour: c }, '');
                      }}
                      className={cn('size-6 rounded-full transition-transform', me.colour === c ? 'scale-110 ring-2 ring-ink ring-offset-2 ring-offset-[var(--glass-strong)]' : 'hover:scale-110')}
                      style={{ background: c }}
                    />
                  ))}
                </span>
              }
            />
            <Row
              icon={<ALargeSmall />}
              tile={TILE.blue}
              label="Size"
              sub="On this device"
              value={`${Math.round(size * 100)}%`}
              below={
                <span className="flex items-center gap-3">
                  <span aria-hidden="true" className="text-cap font-semibold text-ink-2">
                    A
                  </span>
                  <Slider
                    label="Size"
                    valueText={`${Math.round(size * 100)}%`}
                    min={0}
                    max={APP_SIZES.length - 1}
                    step={1}
                    value={[Math.max(0, APP_SIZES.indexOf(size))]}
                    onValueChange={([i]) => {
                      const next = APP_SIZES[i] ?? 1;
                      setSize(next);
                      applyAppSize(next);
                    }}
                  />
                  <span aria-hidden="true" className="text-title font-semibold text-ink-2">
                    A
                  </span>
                </span>
              }
            />
          </Group>
        </motion.div>

        <motion.div variants={stagger.item}>
          <Group title="Privacy">
            <Row
              icon={<Users />}
              tile={TILE.green}
              label={`${team.name} can see my days`}
              sub="Tasks, progress and evening reviews"
              control={<Switch checked={me.share_progress === true} onCheckedChange={(v) => patch({ share_progress: v }, v ? 'Your team can see your days' : 'Your days are private')} />}
            />
            <Row
              icon={<Eye />}
              tile={TILE.blue}
              label="Show me on the sign-in page"
              sub="Photo, name and what you work on"
              control={<Switch checked={me.show_on_login} onCheckedChange={(v) => patch({ show_on_login: v }, '')} />}
            />
          </Group>
        </motion.div>

        <motion.div variants={stagger.item}>
          <Group title="Routine">
            <Row icon={<Plus />} tile={TILE.pink} label="My day" value={blocks ? `${blocks.length} ${blocks.length === 1 ? 'block' : 'blocks'}` : ''} onClick={() => setSheet('day')} />
            <Row icon={<History />} tile={TILE.teal} label="My records" href={`#/p/${me.id}/month`} />
            {(old.days.length > 0 || old.goals.length > 0) && <OldDaysRow me={me} days={old.days} goals={old.goals} />}
          </Group>
        </motion.div>

        <motion.div variants={stagger.item}>
          <Group title="Account" footer={email.data ? `Signed in as ${email.data}` : undefined}>
            <Row icon={<LogOut />} tile={TILE.grey} label="Sign out" danger chevron={false} onClick={() => db.auth.signOut()} />
          </Group>
        </motion.div>

        <motion.div variants={stagger.item} className="flex justify-center pt-2 opacity-80">
          <Brand size="sm" />
        </motion.div>
      </motion.div>

      <PictureSheet open={sheet === 'picture'} onOpenChange={(o) => setSheet(o ? 'picture' : null)} me={me} onProfile={onProfile} />
      <ThemeSheet open={sheet === 'theme'} onOpenChange={(o) => setSheet(o ? 'theme' : null)} me={me} onPick={(id) => patch({ theme: id }, '')} />
      <DaySheet
        open={sheet === 'day'}
        onOpenChange={(o) => {
          setSheet(o ? 'day' : null);
          if (!o && window.location.hash === '#/me/day') window.history.replaceState(null, '', '#/me');
        }}
        me={me}
        blocks={blocks ?? []}
        onSaved={reloadBlocks}
      />
    </Screen>
  );
}

function OldDaysRow({ me, days, goals }: { me: Profile; days: ReturnType<typeof readOldDays>; goals: ReturnType<typeof readOldWeekGoals> }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  return (
    <Row
      icon={<Archive />}
      tile={TILE.brown}
      label="Days from the first app"
      sub={state === 'done' ? 'Brought in' : `${days.length} found in this browser`}
      control={
        state !== 'done' ? (
          <Button
            variant="tint"
            size="sm"
            disabled={state === 'busy'}
            onClick={async () => {
              setState('busy');
              try {
                const added = await importDays(me.id, days, goals);
                setState('done');
                toast(`Added ${added} ${added === 1 ? 'day' : 'days'}`);
              } catch {
                setState('idle');
                toast('Stopped part way. Try again: added days are skipped.', true);
              }
            }}
          >
            Bring in
          </Button>
        ) : undefined
      }
    />
  );
}

function PictureSheet({ open, onOpenChange, me, onProfile }: { open: boolean; onOpenChange: (o: boolean) => void; me: Profile; onProfile: (p: Profile) => void }) {
  const [busy, setBusy] = useState(false);
  const current = splitKey(avatarKey(me));
  const [tone, setTone] = useState(current.tone);
  useEffect(() => {
    if (open) setTone(splitKey(avatarKey(me)).tone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function photo(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const url = await setMyPhoto(me.id, await squarePhoto(file), me.photo_url);
      onProfile({ ...me, photo_url: url });
      toast('Photo saved');
      onOpenChange(false);
    } catch (e) {
      toast((e as Error).message || 'Photo not saved.', true);
    } finally {
      setBusy(false);
    }
  }

  async function pick(key: string) {
    setBusy(true);
    try {
      if (me.photo_url) await clearMyPhoto(me.id, me.photo_url);
      await updateProfile(me.id, { avatar: key });
      onProfile({ ...me, avatar: key, photo_url: null });
    } catch {
      toast('Not saved. Check your connection.', true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Picture"
      right={
        <Button variant="plain" size="bare" className="font-semibold" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      }
    >
      <div className="flex flex-col items-center gap-5 pb-2">
        <Avatar person={me} size={104} />
        <div className="grid w-full grid-cols-2 gap-2">
          <label className={cn('flex h-12 cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-fill text-body font-semibold', busy && 'pointer-events-none opacity-50')}>
            <ImageUp className="size-5 text-tint" /> Choose photo
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => photo(e.target.files?.[0])} />
          </label>
          <label className={cn('flex h-12 cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-fill text-body font-semibold', busy && 'pointer-events-none opacity-50')}>
            <Camera className="size-5 text-tint" /> Take photo
            <input type="file" accept="image/*" capture="user" className="sr-only" onChange={(e) => photo(e.target.files?.[0])} />
          </label>
        </div>

        <div className="w-full">
          <Label>3D avatar</Label>
          <div className="grid grid-cols-6 gap-2">
            {CHARACTERS.map((c) => {
              const key = `${c}-${tone}`;
              const on = !me.photo_url && avatarKey(me) === key;
              return (
                <button
                  key={c}
                  type="button"
                  disabled={busy}
                  onClick={() => pick(key)}
                  aria-label={CHARACTER_NAMES[c]}
                  aria-pressed={on}
                  className={cn('grid aspect-square place-items-center rounded-full bg-fill transition-transform active:scale-95', on && 'ring-[2.5px] ring-tint')}
                >
                  <img src={avatarUrl(key)} alt="" className="size-[86%] translate-y-[6%] object-contain" />
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-center gap-2.5" role="radiogroup" aria-label="Skin tone">
            {TONES.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={tone === t}
                aria-label={t === 'default' ? 'Default tone' : `${t.replace('-', ' ')} skin tone`}
                onClick={() => {
                  setTone(t);
                  if (!me.photo_url) pick(`${splitKey(avatarKey(me)).character}-${t}`);
                }}
                className={cn('grid size-8 place-items-center rounded-full transition-transform', tone === t ? 'scale-110 ring-2 ring-ink ring-offset-2 ring-offset-[var(--glass-strong)]' : 'hover:scale-105')}
                style={{ background: TONE_SWATCHES[t] }}
              >
                {tone === t && <CheckIcon className="size-4 text-white drop-shadow" />}
              </button>
            ))}
          </div>
        </div>

        {me.photo_url && (
          <Button
            variant="danger"
            size="lg"
            className="bg-fill"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await clearMyPhoto(me.id, me.photo_url);
                onProfile({ ...me, photo_url: null });
              } catch {
                toast('Photo not removed. Check your connection.', true);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Trash2 /> Remove photo
          </Button>
        )}
      </div>
    </Sheet>
  );
}

function ThemeSheet({ open, onOpenChange, me, onPick }: { open: boolean; onOpenChange: (o: boolean) => void; me: Profile; onPick: (id: string) => void }) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Theme"
      right={
        <Button variant="plain" size="bare" className="font-semibold" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 pb-2">
        {THEMES.map((t) => {
          const on = me.theme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={on}
              onClick={() => {
                applyTheme(t.id, me.colour);
                onPick(t.id);
              }}
              className={cn('overflow-hidden rounded-[18px] bg-fill text-left transition-transform active:scale-[0.98]', on && 'ring-[2.5px] ring-tint')}
            >
              <span className="relative block h-28 p-3" style={{ background: t.preview.sky }}>
                <span className="block rounded-[12px] p-2.5 shadow-sm backdrop-blur" style={{ background: t.preview.card }}>
                  <span className="block h-2 w-3/5 rounded-full" style={{ background: t.preview.ink, opacity: 0.85 }} />
                  <span className="mt-1.5 block h-1.5 w-2/5 rounded-full" style={{ background: t.preview.ink, opacity: 0.35 }} />
                  <span className="mt-2.5 block h-4 w-12 rounded-full" style={{ background: t.preview.tint }} />
                </span>
                {on && (
                  <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-tint-fill text-tint-ink">
                    <CheckIcon className="size-3.5" />
                  </span>
                )}
              </span>
              <span className="block px-3 pt-2 pb-3">
                <span className="block text-body font-semibold">{t.name}</span>
                <span className="block text-sub text-ink-2">by {t.by}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="pb-3 text-center text-sub text-ink-2">Anyone in the team can add their own theme. See web/src/themes in the repo.</p>
    </Sheet>
  );
}

type Draft = Omit<Block, 'user_id'>;

const sortByTime = (list: Draft[]) => [...list].sort((a, b) => minutesOf(a.starts) - minutesOf(b.starts));

/** My day's blocks. They sort themselves by time; tap one to change it. Saved together with Save. */
function DaySheet({ open, onOpenChange, me, blocks, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; me: Profile; blocks: Block[]; onSaved: () => void }) {
  const [list, setList] = useState<Draft[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (open) {
      setList(sortByTime(blocks.map((b) => ({ ...b, starts: hm(b.starts), ends: hm(b.ends) }))));
      setRemoved([]);
      setEditing(null);
      setDirty(false);
    }
  }, [open, blocks]);

  const edit = (i: number, p: Partial<Draft>) => {
    setList(list.map((b, j) => (j === i ? { ...b, ...p } : b)));
    setDirty(true);
  };

  async function save() {
    if (list.some((b) => !b.name.trim())) return toast('Every block needs a name.', true);
    setBusy(true);
    try {
      const sorted = sortByTime(list).map((b) => ({ ...b, name: b.name.trim(), tasks: b.tasks.map((t) => t.trim()).filter(Boolean).slice(0, 20) }));
      const changed = await saveRoutine(me.id, todayISO(), blocks, sorted, removed);
      toast(changed ? 'Saved. Today is updated too.' : 'Saved.');
      onSaved();
      onOpenChange(false);
    } catch {
      toast('Not saved. Check your connection.', true);
    } finally {
      setBusy(false);
    }
  }

  const b = editing !== null ? list[editing] : null;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={b ? b.name || 'New block' : 'My day'}
      left={
        b ? (
          <Button
            variant="plain"
            size="bare"
            onClick={() => {
              setList(sortByTime(list));
              setEditing(null);
            }}
          >
            <ChevronLeft className="-mr-1 size-5" /> Blocks
          </Button>
        ) : (
          <Button variant="plain" size="bare" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        )
      }
      right={
        <Button variant="plain" size="bare" className="font-semibold" disabled={!dirty || busy} onClick={save}>
          Save
        </Button>
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {!b ? (
          <motion.div key="list" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }} className="space-y-3 pb-2">
            <div className="divide-y divide-line overflow-hidden rounded-[16px] bg-fill">
              {list.map((x, i) => (
                <button key={x.id} type="button" onClick={() => setEditing(i)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-fill">
                  <span className="tabular w-[5.75rem] shrink-0 text-sub text-ink-2">
                    {x.starts} to {x.ends}
                  </span>
                  <span className="title-case min-w-0 flex-1 truncate text-body font-medium">{x.name || 'New block'}</span>
                  <span className="text-sub text-ink-2">{x.tasks.filter(Boolean).length || ''}</span>
                </button>
              ))}
              {!list.length && <p className="px-4 py-4 text-sub text-ink-2">No blocks yet.</p>}
            </div>
            <Button
              variant="quiet"
              size="lg"
              onClick={() => {
                const last = sortByTime(list).at(-1)?.ends ?? '08:00';
                const next = [...list, { id: `new-${Date.now()}`, name: '', starts: last, ends: last, position: list.length, tasks: [] }];
                setList(next);
                setEditing(next.length - 1);
                setDirty(true);
              }}
            >
              <Plus /> Add a block
            </Button>
            <p className="px-1 text-center text-sub text-ink-2">Changes show today. Past days keep their own blocks.</p>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.18 }} className="space-y-4 pb-2">
            <div>
              <Label htmlFor="block-name">Name</Label>
              <Input id="block-name" autoFocus={!b.name} value={b.name} maxLength={40} onChange={(e) => edit(editing!, { name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="block-from">From</Label>
                <TimeSelect id="block-from" value={b.starts} onChange={(v) => edit(editing!, { starts: v })} />
              </div>
              <div>
                <Label htmlFor="block-to">To</Label>
                <TimeSelect id="block-to" value={b.ends} onChange={(v) => edit(editing!, { ends: v })} />
              </div>
            </div>
            <div>
              <Label htmlFor="block-tasks">Tasks each day starts with</Label>
              <Textarea
                id="block-tasks"
                rows={4}
                value={b.tasks.join('\n')}
                placeholder="One per line"
                onChange={(e) => edit(editing!, { tasks: e.target.value.split('\n').map((t) => t.slice(0, 200)) })}
              />
            </div>
            <Button
              variant="danger"
              size="lg"
              className="bg-fill"
              onClick={() => {
                if (!b.id.startsWith('new-')) setRemoved([...removed, b.id]);
                setList(list.filter((_, j) => j !== editing));
                setEditing(null);
                setDirty(true);
              }}
            >
              <Trash2 /> Remove block
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}

function TimeSelect({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const options = QUARTER_HOURS.includes(value) ? QUARTER_HOURS : [value, ...QUARTER_HOURS];
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
      {!options.includes('23:59') && <option value="23:59">23:59</option>}
    </Select>
  );
}
