import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Ellipsis, HandHeart, Lightbulb, MessageCircle, Pencil, Pin, PinOff, Plus, Reply, Send, Target, ThumbsUp, Trash2, X, Flame, BookOpen } from 'lucide-react';
import { addPost, boardPins, boardPosts, boardReactions, deletePost, editPost, pinPost, react, unpinPost, unreact } from '@/lib/api';
import { KIND_LABEL, REACTIONS, arrange, cleanTopic, kindForHour, tally, usedTopics } from '@/lib/board';
import { addDays, clock, dayLabel, todayISO } from '@/lib/dates';
import { useLoad } from '@/lib/hooks';
import { useLiveTables } from '@/lib/live';
import type { Pin as PinRow, Post, PostKind, Profile, Reaction, ReactionKind, Team } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, HereDot } from './Avatar';
import { Segment } from './Segment';
import { stagger } from './Screen';
import { Button } from './ui/button';
import { Input, Label, Textarea } from './ui/field';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from './ui/menu';
import { Sheet } from './ui/sheet';
import { toast } from './ui/toast';

type Line = Exclude<PostKind, 'reply'>;

const KIND_ICON: Record<Line, typeof Target> = { aim: Target, learned: BookOpen, cheer: HandHeart };
const REACTION_ICON: Record<ReactionKind, typeof ThumbsUp> = { clap: ThumbsUp, on_it: Flame, idea: Lightbulb };

interface Data {
  posts: Post[];
  pins: PinRow[];
  reactions: Reaction[];
}

/** The team's Board: pinned lines, then everyone's lines by day. Live for the whole team. */
export function Board({ me, team, people, here }: { me: Profile; team: Team; people: Profile[]; here: Set<string> }) {
  const { data, error, reload, setData } = useLoad<Data>(async () => {
    const [posts, pins] = await Promise.all([boardPosts(team.id), boardPins(team.id)]);
    return { posts, pins, reactions: await boardReactions(posts.map((p) => p.id)) };
  }, [team.id]);
  useLiveTables(['posts', 'post_pins', 'post_reactions'], reload);

  const [topic, setTopic] = useState<string | null>(null);
  const [writing, setWriting] = useState<{ edit?: Post } | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Post | null>(null);

  // The "+" beside the tab bar writes a new line.
  useEffect(() => {
    const on = () => setWriting({});
    window.addEventListener('routine:post', on);
    return () => window.removeEventListener('routine:post', on);
  }, []);

  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const feed = data ? arrange(data.posts, data.pins, topic) : null;
  const topics = data ? usedTopics(data.posts) : [];
  const thread = threadId ? data?.posts.find((p) => p.id === threadId) ?? null : null;

  const patch = (fn: (d: Data) => Data) => data && setData(fn(data));

  async function toggleReaction(post: Post, kind: ReactionKind, mine: boolean) {
    if (!data) return;
    const before = data;
    patch((d) => ({
      ...d,
      reactions: mine
        ? d.reactions.filter((r) => !(r.post_id === post.id && r.user_id === me.id && r.kind === kind))
        : [...d.reactions, { id: `new-${Date.now()}`, post_id: post.id, user_id: me.id, kind }],
    }));
    try {
      await (mine ? unreact(post.id, me.id, kind) : react(post.id, kind));
    } catch {
      setData(before);
      toast('That did not save. Check your connection.', true);
    }
  }

  async function togglePin(post: Post, pinned: boolean) {
    try {
      await (pinned ? unpinPost(post.id) : pinPost(post.id, team.id));
      toast(pinned ? 'Unpinned' : 'Pinned to the top');
      reload();
    } catch {
      toast(pinned ? 'Only the person who pinned it or wrote it can unpin it.' : 'Not pinned. Check your connection.', true);
    }
  }

  async function remove(post: Post) {
    try {
      await deletePost(post.id);
      patch((d) => ({ ...d, posts: d.posts.filter((p) => p.id !== post.id && p.parent_id !== post.id) }));
      toast('Deleted');
    } catch {
      toast('Not deleted. Check your connection.', true);
    } finally {
      setRemoving(null);
    }
  }

  if (error)
    return (
      <div className="glass rounded-card p-4">
        <p className="text-body">{error}</p>
        <Button variant="plain" size="bare" className="mt-2" onClick={reload}>
          Try again
        </Button>
      </div>
    );
  if (!feed || !data) return <div className="glass h-40 animate-pulse rounded-card" role="status" aria-label="Loading" />;

  const row = (post: Post, pinned: boolean) => {
    const pin = data.pins.find((x) => x.post_id === post.id);
    return (
      <PostRow
        key={post.id}
        post={post}
        author={byId.get(post.user_id)}
        me={me}
        byId={byId}
        here={here.has(post.user_id) && post.user_id !== me.id}
        counts={tally(data.reactions, post.id, me.id)}
        replies={feed.replies.get(post.id)?.length ?? 0}
        pinned={pinned}
        canUnpin={!!pin && (pin.pinned_by === me.id || post.user_id === me.id)}
        onReact={(k, mine) => toggleReaction(post, k, mine)}
        onReply={() => setThreadId(post.id)}
        onPin={() => togglePin(post, pinned)}
        onEdit={() => setWriting({ edit: post })}
        onDelete={() => setRemoving(post)}
        onTopic={setTopic}
      />
    );
  };

  const empty = !feed.pinned.length && !feed.days.length;

  return (
    <motion.div variants={stagger.container} initial="initial" animate="animate" className="flex flex-col gap-4">
      {topic && (
        <motion.div variants={stagger.item} className="flex items-center gap-2">
          <span className="text-sub text-ink-2">Lines tagged</span>
          <button type="button" onClick={() => setTopic(null)} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-tint-fill px-4 text-sub font-semibold text-tint-ink">
            #{topic} <X className="size-4" aria-label="Show all lines" />
          </button>
        </motion.div>
      )}

      {empty && (
        <motion.section variants={stagger.item} className="glass flex flex-col items-start gap-3 rounded-card p-5">
          <p className="text-head font-semibold">{topic ? `No lines tagged #${topic}` : 'No lines yet'}</p>
          <p className="text-sub text-ink-2">An aim for today, something you learned, or a cheer for a teammate.</p>
          <Button variant="tint" onClick={() => setWriting({})}>
            <Plus /> Write a line
          </Button>
        </motion.section>
      )}

      {feed.pinned.length > 0 && (
        <motion.section variants={stagger.item} className="space-y-1.5">
          <h2 className="label-case flex items-center gap-1.5 px-4 text-sub font-medium text-ink-2">
            <Pin className="size-3.5" /> Pinned
          </h2>
          <div className="glass divide-y divide-line overflow-hidden rounded-card">{feed.pinned.map((p) => row(p, true))}</div>
        </motion.section>
      )}

      {feed.days.map((d) => (
        <motion.section key={d.date} variants={stagger.item} className="space-y-1.5">
          <h2 className="label-case px-4 text-sub font-medium text-ink-2">{dayName(d.date)}</h2>
          <div className="glass divide-y divide-line overflow-hidden rounded-card">
            <AnimatePresence initial={false}>{d.posts.map((p) => row(p, false))}</AnimatePresence>
          </div>
        </motion.section>
      ))}

      <PostSheet
        open={!!writing}
        onOpenChange={(o) => !o && setWriting(null)}
        me={me}
        team={team}
        people={people}
        topics={topics}
        edit={writing?.edit}
        onSaved={(p) =>
          patch((d) => ({ ...d, posts: d.posts.some((x) => x.id === p.id) ? d.posts.map((x) => (x.id === p.id ? p : x)) : [p, ...d.posts] }))
        }
      />
      <ThreadSheet
        post={thread}
        replies={thread ? feed.replies.get(thread.id) ?? [] : []}
        me={me}
        byId={byId}
        onClose={() => setThreadId(null)}
        onAdded={(p) => patch((d) => ({ ...d, posts: [p, ...d.posts] }))}
        onDeleted={(id) => patch((d) => ({ ...d, posts: d.posts.filter((x) => x.id !== id) }))}
      />
      <Sheet open={!!removing} onOpenChange={(o) => !o && setRemoving(null)} title="Delete this line?" description="Its replies go with it.">
        <div className="flex flex-col gap-2 pb-2">
          <Button variant="quiet" size="lg" className="text-danger" onClick={() => removing && remove(removing)}>
            <Trash2 /> Delete
          </Button>
          <Button variant="quiet" size="lg" onClick={() => setRemoving(null)}>
            Keep it
          </Button>
        </div>
      </Sheet>
    </motion.div>
  );
}

function dayName(date: string) {
  const today = todayISO();
  if (date === today) return 'Today';
  if (date === addDays(today, -1)) return 'Yesterday';
  return dayLabel(date);
}

/** "Cheer for Kofi and Mia": who a cheer is for, from its tags. */
function names(ids: string[], byId: Map<string, Profile>, me: Profile) {
  const list = ids.map((id) => (id === me.id ? 'you' : byId.get(id)?.name.split(' ')[0] ?? 'someone'));
  return list.length <= 2 ? list.join(' and ') : `${list.slice(0, -1).join(', ')} and ${list.at(-1)}`;
}

function KindLine({ post, byId, me }: { post: Post; byId: Map<string, Profile>; me: Profile }) {
  if (post.kind === 'reply') return null;
  const Icon = KIND_ICON[post.kind];
  const forMe = post.people.includes(me.id);
  return (
    <span className="inline-flex min-w-0 items-center gap-1 text-sub text-ink-2">
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{post.kind === 'cheer' ? `Cheer for ${names(post.people, byId, me)}` : KIND_LABEL[post.kind]}</span>
      {forMe && post.kind !== 'cheer' && <span className="shrink-0 font-semibold text-tint">, for you</span>}
    </span>
  );
}

function PostRow({
  post,
  author,
  me,
  byId,
  here,
  counts,
  replies,
  pinned,
  canUnpin,
  onReact,
  onReply,
  onPin,
  onEdit,
  onDelete,
  onTopic,
}: {
  post: Post;
  author?: Profile;
  me: Profile;
  byId: Map<string, Profile>;
  here: boolean;
  counts: ReturnType<typeof tally>;
  replies: number;
  pinned: boolean;
  canUnpin: boolean;
  onReact: (k: ReactionKind, mine: boolean) => void;
  onReply: () => void;
  onPin: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTopic: (t: string) => void;
}) {
  const mine = post.user_id === me.id;
  const name = author ? (mine ? 'You' : author.name) : 'Someone who left';
  const tagged = post.kind === 'cheer' ? [] : post.people;
  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      className="flex gap-3 px-4 pt-3 pb-1.5"
    >
      <a href={author ? `#/p/${author.id}/day/${post.date}` : undefined} className="shrink-0 self-start">
        <HereDot on={here}>
          <Avatar person={author ?? { name: '?', colour: me.colour }} size={38} />
        </HereDot>
      </a>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="flex items-baseline gap-2">
              <span className="title-case truncate text-body font-semibold">{name}</span>
              <span className="tabular shrink-0 text-sub text-ink-2">
                {clock(post.created_at)}
                {post.edited_at ? ', edited' : ''}
              </span>
            </p>
            <KindLine post={post} byId={byId} me={me} />
          </div>
          <Menu>
            <MenuTrigger asChild>
              <button type="button" aria-label="More" className="-mt-1.5 -mr-2 grid size-10 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-fill">
                <Ellipsis className="size-5" />
              </button>
            </MenuTrigger>
            <MenuContent>
              <MenuItem icon={<Reply />} onSelect={onReply}>
                Reply
              </MenuItem>
              {(!pinned || canUnpin) && (
                <MenuItem icon={pinned ? <PinOff /> : <Pin />} onSelect={onPin}>
                  {pinned ? 'Unpin' : 'Pin to the top'}
                </MenuItem>
              )}
              {mine && (
                <>
                  <MenuSeparator />
                  <MenuItem icon={<Pencil />} onSelect={onEdit}>
                    Edit
                  </MenuItem>
                  <MenuItem icon={<Trash2 />} danger onSelect={onDelete}>
                    Delete
                  </MenuItem>
                </>
              )}
            </MenuContent>
          </Menu>
        </div>

        <p className="mt-1 whitespace-pre-wrap break-words text-body">{post.body}</p>

        {(tagged.length > 0 || post.topics.length > 0) && (
          <p className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1 text-sub">
            {tagged.map((id) => (
              <a key={id} href={`#/p/${id}/day`} className={cn('font-medium', id === me.id ? 'text-tint' : 'text-ink-2')}>
                @{byId.get(id)?.name.split(' ')[0] ?? 'someone'}
              </a>
            ))}
            {post.topics.map((t) => (
              <button key={t} type="button" onClick={() => onTopic(t)} className="font-medium text-tint">
                #{t}
              </button>
            ))}
          </p>
        )}

        <div className="mt-1 -ml-2.5 flex items-center">
          {REACTIONS.map(({ kind, label }) => {
            const Icon = REACTION_ICON[kind];
            const c = counts[kind];
            return (
              <button
                key={kind}
                type="button"
                aria-label={c.count ? `${label}, ${c.count}` : label}
                aria-pressed={c.mine}
                onClick={() => onReact(kind, c.mine)}
                className={cn(
                  'inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-full px-2.5 text-sub font-semibold transition-colors active:scale-95',
                  c.mine ? 'bg-tint/12 text-tint' : 'text-ink-2 hover:bg-fill',
                )}
              >
                <motion.span key={`${kind}-${c.mine}`} initial={c.mine ? { scale: 0.6 } : false} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 18 }}>
                  <Icon className="size-[1.0625rem]" strokeWidth={c.mine ? 2.4 : 2} />
                </motion.span>
                {c.count > 0 && <span className="tabular">{c.count}</span>}
              </button>
            );
          })}
          <button
            type="button"
            onClick={onReply}
            aria-label={replies ? `${replies} ${replies === 1 ? 'reply' : 'replies'}` : 'Reply'}
            className="inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-full px-2.5 text-sub font-semibold text-ink-2 hover:bg-fill"
          >
            <MessageCircle className="size-[1.0625rem]" />
            {replies > 0 && <span className="tabular">{replies}</span>}
          </button>
        </div>
      </div>
    </motion.article>
  );
}

/** Write or edit a line: what kind, the words, who it tags and its topics. */
export function PostSheet({
  open,
  onOpenChange,
  me,
  team,
  people,
  topics,
  edit,
  kind: startKind,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  me: Profile;
  team: Team;
  people: Profile[];
  topics: string[];
  edit?: Post;
  kind?: Line;
  onSaved: (p: Post) => void;
}) {
  const [kind, setKind] = useState<Line>('aim');
  const [body, setBody] = useState('');
  const [tagged, setTagged] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind(edit && edit.kind !== 'reply' ? edit.kind : startKind ?? kindForHour(new Date().getHours()));
    setBody(edit?.body ?? '');
    setTagged(edit?.people ?? []);
    setChosen(edit?.topics ?? []);
    setDraft('');
  }, [open, edit, startKind]);

  const others = people.filter((p) => p.id !== me.id);
  const cheer = kind === 'cheer';
  const ready = body.trim().length > 0 && (!cheer || tagged.length > 0) && !busy;
  const hint = { aim: 'What you are going for today', learned: 'One thing you learned', cheer: 'Thanks, or a push for them' }[kind];

  function addTopic(raw: string) {
    const t = cleanTopic(raw);
    if (t && !chosen.includes(t) && chosen.length < 5) setChosen([...chosen, t]);
    setDraft('');
  }

  async function save() {
    if (!ready) return;
    setBusy(true);
    const final = draft.trim() ? [...new Set([...chosen, cleanTopic(draft)].filter(Boolean))].slice(0, 5) : chosen;
    try {
      const saved = edit
        ? await editPost(edit.id, { body: body.trim(), people: tagged, topics: final })
        : await addPost({ team_id: team.id, date: todayISO(), kind, body: body.trim(), people: tagged, topics: final });
      onSaved(saved);
      toast(edit ? 'Saved' : 'Posted to the Board');
      onOpenChange(false);
    } catch {
      toast('Not posted. Check your connection.', true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={edit ? 'Edit line' : 'New line'}
      left={
        <Button variant="plain" size="bare" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      }
      right={
        <Button variant="plain" size="bare" className="font-semibold" disabled={!ready} onClick={save}>
          {edit ? 'Save' : 'Post'}
        </Button>
      }
    >
      <div className="space-y-4 pb-3">
        {!edit && (
          <Segment
            label="Kind of line"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'aim', label: 'Aim' },
              { value: 'learned', label: 'Learned' },
              { value: 'cheer', label: 'Cheer' },
            ]}
          />
        )}
        <div>
          <Textarea autoFocus value={body} maxLength={500} rows={4} onChange={(e) => setBody(e.target.value)} placeholder={hint} aria-label="Line" />
          {body.length > 440 && <p className="tabular mt-1 px-1 text-right text-cap text-ink-2">{500 - body.length} left</p>}
        </div>

        {others.length > 0 && (
          <div>
            <Label>{cheer ? 'For' : 'Tag people'}</Label>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              {others.map((p) => {
                const on = tagged.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setTagged(on ? tagged.filter((x) => x !== p.id) : [...tagged, p.id].slice(0, 10))}
                    className={cn(
                      'inline-flex h-10 shrink-0 items-center gap-2 rounded-full pr-4 pl-1.5 text-sub font-semibold transition-colors',
                      on ? 'bg-tint-fill text-tint-ink' : 'bg-fill text-ink',
                    )}
                  >
                    <Avatar person={p} size={28} />
                    <span className="title-case">{p.name.split(' ')[0] || 'No name'}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="topic">Topics</Label>
          <div className="flex flex-wrap gap-2">
            {chosen.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setChosen(chosen.filter((x) => x !== t))}
                className="inline-flex h-10 items-center gap-1 rounded-full bg-tint-fill pr-3 pl-4 text-sub font-semibold text-tint-ink"
                aria-label={`Remove #${t}`}
              >
                #{t} <X className="size-4" />
              </button>
            ))}
            {chosen.length < 5 && (
              <Input
                id="topic"
                value={draft}
                maxLength={30}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTopic(draft);
                  }
                }}
                onBlur={() => draft.trim() && addTopic(draft)}
                placeholder="Add a topic"
                enterKeyHint="done"
                className="h-10 w-40 flex-1 rounded-full"
              />
            )}
          </div>
          {chosen.length < 5 && topics.some((t) => !chosen.includes(t)) && (
            <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              {topics
                .filter((t) => !chosen.includes(t))
                .slice(0, 8)
                .map((t) => (
                  <button key={t} type="button" onClick={() => addTopic(t)} className="h-10 shrink-0 rounded-full bg-fill px-4 text-sub font-medium text-ink-2 hover:text-ink">
                    #{t}
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}

/** A line and its replies; write a reply at the bottom. */
function ThreadSheet({
  post,
  replies,
  me,
  byId,
  onClose,
  onAdded,
  onDeleted,
}: {
  post: Post | null;
  replies: Post[];
  me: Profile;
  byId: Map<string, Profile>;
  onClose: () => void;
  onAdded: (p: Post) => void;
  onDeleted: (id: string) => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const last = useRef<Post | null>(null);
  if (post) last.current = post;
  const shown = post ?? last.current;

  useEffect(() => {
    if (post) setText('');
  }, [post?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [replies.length]);

  async function send() {
    const body = text.trim();
    if (!post || !body || busy) return;
    setBusy(true);
    try {
      onAdded(await addPost({ team_id: post.team_id, date: todayISO(), kind: 'reply', body, parent_id: post.id }));
      setText('');
    } catch {
      toast('Not sent. Check your connection.', true);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await deletePost(id);
      onDeleted(id);
    } catch {
      toast('Not deleted. Check your connection.', true);
    }
  }

  const author = shown ? byId.get(shown.user_id) : undefined;
  return (
    <Sheet
      open={!!post}
      onOpenChange={(o) => !o && onClose()}
      title="Replies"
      right={
        <Button variant="plain" size="bare" className="font-semibold" onClick={onClose}>
          Done
        </Button>
      }
    >
      {shown && (
        <div className="pb-3">
          <div className="flex gap-3 border-b border-line pb-3">
            <Avatar person={author ?? { name: '?', colour: me.colour }} size={34} />
            <div className="min-w-0 flex-1">
              <p className="title-case text-body font-semibold">{shown.user_id === me.id ? 'You' : author?.name ?? 'Someone who left'}</p>
              <KindLine post={shown} byId={byId} me={me} />
              <p className="mt-1 whitespace-pre-wrap break-words text-body">{shown.body}</p>
            </div>
          </div>
          <ul className="space-y-3 py-3">
            {replies.length === 0 && <li className="text-sub text-ink-2">No replies yet.</li>}
            {replies.map((r) => {
              const who = byId.get(r.user_id);
              return (
                <li key={r.id} className="flex gap-2.5">
                  <Avatar person={who ?? { name: '?', colour: me.colour }} size={28} />
                  <div className="min-w-0 flex-1 rounded-[16px] bg-fill px-3 py-2">
                    <p className="flex items-baseline gap-2">
                      <span className="title-case truncate text-sub font-semibold">{r.user_id === me.id ? 'You' : who?.name ?? 'Someone who left'}</span>
                      <span className="tabular text-cap text-ink-2">{clock(r.created_at)}</span>
                    </p>
                    <p className="whitespace-pre-wrap break-words text-body">{r.body}</p>
                  </div>
                  {r.user_id === me.id && (
                    <button type="button" aria-label="Delete reply" onClick={() => remove(r.id)} className="grid size-10 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-fill">
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <div ref={end} />
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <Input value={text} maxLength={500} onChange={(e) => setText(e.target.value)} placeholder="Reply" aria-label="Reply" enterKeyHint="send" className="rounded-full" />
            <Button type="submit" variant="tint" size="icon" aria-label="Send" disabled={!text.trim() || busy}>
              <Send />
            </Button>
          </form>
        </div>
      )}
    </Sheet>
  );
}
