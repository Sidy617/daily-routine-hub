import { useEffect, useState } from 'react';
import { Download, Share } from 'lucide-react';
import { APP_NAME, ORG_NAME } from '@/lib/config';
import { dayLabel, hm } from '@/lib/dates';
import { faceUrl } from '@/lib/avatars';
import type { FullDay, Profile, Status } from '@/lib/types';
import { Button } from './ui/button';
import { Sheet } from './ui/sheet';
import { toast } from './ui/toast';

type Nav = Navigator & { canShare?: (d: { files: File[] }) => boolean };

/**
 * Makes the day into one picture (every block, every task, the review) and shows it first.
 * Share and Save are then fresh taps, which phones require for the share menu.
 */
export function ShareButton({ full, person }: { full: FullDay; person: Profile }) {
  const [open, setOpen] = useState(false);
  const [card, setCard] = useState<{ blob: Blob; url: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const name = `routine-${full.day.date}.png`;

  useEffect(() => {
    if (!open) return;
    let live = true;
    setCard(null);
    setFailed(false);
    makeCard(full, person)
      .then((blob) => live && setCard({ blob, url: URL.createObjectURL(blob) }))
      .catch((e) => {
        console.error('share card failed:', e);
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
    // The picture is made from the day as it is when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => void (card && URL.revokeObjectURL(card.url)), [card]);

  const file = card ? new File([card.blob], name, { type: 'image/png' }) : null;
  const canShare = !!file && !!(navigator as Nav).canShare?.({ files: [file] });

  async function share() {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: `${person.name}, ${dayLabel(full.day.date)}` });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') save();
    }
  }

  function save() {
    if (!card) return;
    const a = document.createElement('a');
    a.href = card.url;
    a.download = name;
    a.click();
    toast('Picture saved');
  }

  return (
    <>
      <Button variant="glass" size="icon" onClick={() => setOpen(true)} aria-label="Share this day">
        <Share />
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Share your day"
        right={
          <Button variant="plain" size="bare" className="font-semibold" onClick={() => setOpen(false)}>
            Done
          </Button>
        }
      >
        <div className="space-y-4 pb-2">
          <div className="max-h-[52dvh] overflow-y-auto rounded-[20px] bg-fill">
            {card ? (
              <img src={card.url} alt={`${person.name}'s day as a picture`} className="block w-full" />
            ) : failed ? (
              <p className="p-6 text-center text-sub text-danger">Could not make the picture.</p>
            ) : (
              <div className="aspect-[4/5] animate-pulse" aria-label="Making the picture" role="status" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="quiet" size="lg" disabled={!card} onClick={save}>
              <Download /> Save
            </Button>
            <Button variant="tint" size="lg" disabled={!card || !canShare} onClick={share}>
              <Share /> Share
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}

// Drawing ---------------------------------------------------------------------------

const W = 1080;
const PAD = 72;

type Palette = { bg: string; panel: string; ink: string; mute: string; faint: string; line: string; tint: string; skyA: string; skyB: string };

function palette(colour: string): Palette {
  const dark = document.documentElement.classList.contains('dark');
  return dark
    ? { bg: '#07090d', panel: '#15171c', ink: '#f5f5f7', mute: '#a1a1aa', faint: '#52525b', line: '#26282e', tint: colour, skyA: '#1b2a4a', skyB: '#07090d' }
    : { bg: '#eef2f8', panel: '#ffffff', ink: '#0b0b0f', mute: '#6b7080', faint: '#b4b8c2', line: '#e8eaef', tint: colour, skyA: '#ffd8c4', skyB: '#dcebff' };
}

function loadImage(src: string, cors: boolean): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (cors) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Splits text into lines that fit the width. */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width <= max || !line) line = next;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

async function makeCard(full: FullDay, person: Profile): Promise<Blob> {
  await document.fonts?.ready;
  const face = faceUrl(person);
  const img = await loadImage(face.url, face.isPhoto);
  try {
    return await draw(full, person, img, face.isPhoto);
  } catch {
    // A photo from another address can block saving the picture; fall back to the initial.
    return draw(full, person, null, false);
  }
}

async function draw(full: FullDay, person: Profile, img: HTMLImageElement | null, isPhoto: boolean): Promise<Blob> {
  const p = palette(person.colour);
  const font = getComputedStyle(document.documentElement).getPropertyValue('--font').trim() || 'system-ui, sans-serif';
  const measure = document.createElement('canvas').getContext('2d');
  if (!measure) throw new Error('no canvas');

  // Lay out first, to know the height.
  type Line = { kind: 'block' | 'task' | 'note' | 'head' | 'q' | 'a' | 'gap'; text?: string; status?: Status; sub?: string; first?: boolean };
  const items: Line[] = [];
  const textW = W - PAD * 2 - 64 - 56;
  for (const b of full.blocks) {
    const tasks = full.tasks.filter((t) => t.day_block_id === b.id);
    const done = tasks.filter((t) => t.status === 'done').length;
    items.push({ kind: 'block', text: b.name, sub: `${hm(b.starts)} to ${hm(b.ends)}${tasks.length ? `   ${done}/${tasks.length}` : ''}` });
    if (!tasks.length) items.push({ kind: 'note', text: 'Nothing planned' });
    for (const t of tasks) {
      measure.font = `500 34px ${font}`;
      wrap(measure, t.text, textW).forEach((l, i) => items.push({ kind: 'task', text: l, status: t.status, first: i === 0 }));
      if (t.note) {
        measure.font = `400 28px ${font}`;
        wrap(measure, t.note, textW).forEach((l) => items.push({ kind: 'note', text: l }));
      }
    }
    items.push({ kind: 'gap' });
  }
  const review = [
    ["What didn't happen", full.day.missed],
    ['The fix', full.day.fix],
    ["Tomorrow's top three", full.day.tomorrow],
  ].filter(([, v]) => v.trim());
  if (review.length) {
    items.push({ kind: 'head', text: 'Evening review' });
    for (const [q, a] of review) {
      items.push({ kind: 'q', text: q });
      measure.font = `400 32px ${font}`;
      a.split('\n')
        .filter((x) => x.trim())
        .forEach((para) => wrap(measure, para, W - PAD * 2 - 56).forEach((l) => items.push({ kind: 'a', text: l })));
    }
  }
  const step: Record<Line['kind'], number> = { block: 96, task: 50, note: 40, head: 84, q: 52, a: 44, gap: 26 };
  const listH = items.reduce((s, it) => s + step[it.kind], 0);
  const HEAD = 400;
  const H = HEAD + listH + 200;

  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('no canvas');

  // Sky band
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);
  const sky = ctx.createLinearGradient(0, 0, W, HEAD + 80);
  sky.addColorStop(0, p.skyA);
  sky.addColorStop(1, p.skyB);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, HEAD + 120);

  // Face
  const R = 66;
  const fx = PAD + R;
  const fy = 150;
  ctx.save();
  ctx.beginPath();
  ctx.arc(fx, fy, R, 0, Math.PI * 2);
  ctx.fillStyle = mix(person.colour, p.panel, 0.75);
  ctx.fill();
  ctx.clip();
  if (img) {
    // A photo fills the circle; a 3D avatar sits inside it, like in the app.
    if (isPhoto) ctx.drawImage(img, fx - R, fy - R, R * 2, R * 2);
    else ctx.drawImage(img, fx - R * 0.86, fy - R * 0.72, R * 1.72, R * 1.72);
  } else {
    ctx.fillStyle = p.ink;
    ctx.font = `700 56px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((person.name.trim()[0] ?? '?').toUpperCase(), fx, fy + 3);
  }
  ctx.restore();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = p.ink;
  ctx.font = `700 54px ${font}`;
  ctx.fillText(fit(ctx, person.name || 'Me', 560), fx + R + 32, fy - 6);
  ctx.fillStyle = p.mute;
  ctx.font = `500 32px ${font}`;
  ctx.fillText(dayLabel(full.day.date), fx + R + 32, fy + 42);

  // Ring
  const total = full.tasks.length;
  const done = full.tasks.filter((t) => t.status === 'done').length;
  const half = full.tasks.filter((t) => t.status === 'half').length;
  const rx = W - PAD - 70;
  const ry = fy;
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';
  ctx.strokeStyle = mix(p.ink, p.panel, 0.88);
  ctx.beginPath();
  ctx.arc(rx, ry, 62, 0, Math.PI * 2);
  ctx.stroke();
  if (total) {
    ctx.strokeStyle = person.colour;
    ctx.beginPath();
    ctx.arc(rx, ry, 62, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ((done + half / 2) / total));
    ctx.stroke();
  }
  ctx.fillStyle = p.ink;
  ctx.textAlign = 'center';
  ctx.font = `700 40px ${font}`;
  ctx.fillText(`${done}/${total}`, rx, ry + 14);
  ctx.textAlign = 'left';

  // Panel with the list
  const top = HEAD - 60;
  ctx.fillStyle = p.panel;
  roundRect(ctx, PAD - 24, top, W - (PAD - 24) * 2, listH + 96, 44);
  ctx.fill();

  let y = top + 48;
  const x0 = PAD + 8;
  for (const it of items) {
    y += step[it.kind];
    if (it.kind === 'block') {
      ctx.fillStyle = p.ink;
      ctx.font = `700 38px ${font}`;
      ctx.fillText(fit(ctx, it.text ?? '', 600), x0, y - 36);
      ctx.fillStyle = p.mute;
      ctx.font = `500 28px ${font}`;
      ctx.fillText(it.sub ?? '', x0, y);
    } else if (it.kind === 'task') {
      if (it.first) markAt(ctx, x0 + 18, y - 11, it.status ?? 'todo', p);
      ctx.fillStyle = it.status === 'done' ? p.mute : p.ink;
      ctx.font = `500 34px ${font}`;
      ctx.fillText(it.text ?? '', x0 + 56, y);
    } else if (it.kind === 'note') {
      ctx.fillStyle = p.mute;
      ctx.font = `400 28px ${font}`;
      ctx.fillText(it.text ?? '', x0 + 56, y);
    } else if (it.kind === 'head') {
      ctx.strokeStyle = p.line;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0, y - 66);
      ctx.lineTo(W - PAD - 8, y - 66);
      ctx.stroke();
      ctx.fillStyle = p.ink;
      ctx.font = `700 38px ${font}`;
      ctx.fillText(it.text ?? '', x0, y);
    } else if (it.kind === 'q') {
      ctx.fillStyle = person.colour;
      ctx.font = `600 28px ${font}`;
      ctx.fillText(it.text ?? '', x0, y);
    } else if (it.kind === 'a') {
      ctx.fillStyle = p.ink;
      ctx.font = `400 32px ${font}`;
      ctx.fillText(it.text ?? '', x0, y);
    }
  }

  // Footer
  ctx.fillStyle = p.mute;
  ctx.font = `600 28px ${font}`;
  ctx.fillText(`${ORG_NAME} ${APP_NAME}`, PAD, H - 64);

  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('no image'))), 'image/png'));
}

function markAt(ctx: CanvasRenderingContext2D, x: number, y: number, status: Status, p: Palette) {
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, 16, 0, Math.PI * 2);
  if (status === 'done') {
    ctx.fillStyle = p.tint;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 7, y + 0.5);
    ctx.lineTo(x - 2, y + 5.5);
    ctx.lineTo(x + 8, y - 5.5);
    ctx.stroke();
  } else if (status === 'half') {
    ctx.strokeStyle = p.tint;
    ctx.stroke();
    ctx.fillStyle = p.tint;
    ctx.beginPath();
    ctx.arc(x, y, 16, -Math.PI / 2, Math.PI / 2);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.strokeStyle = p.faint;
    ctx.stroke();
  }
}

function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}...`).width > max) t = t.slice(0, -1);
  return `${t}...`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Mixes two hex colours: amount 0 is a, 1 is b. */
function mix(a: string, b: string, amount: number) {
  const pa = parseInt(a.replace('#', ''), 16);
  const pb = parseInt(b.replace('#', ''), 16);
  if (Number.isNaN(pa) || Number.isNaN(pb)) return b;
  const ch = (n: number, s: number) => (n >> s) & 255;
  const m = (s: number) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * amount);
  return `rgb(${m(16)}, ${m(8)}, ${m(0)})`;
}
