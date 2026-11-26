import { useState } from 'react';
import { ORG_NAME } from '../lib/config';
import { dayLabel, hm } from '../lib/dates';
import type { FullDay, Profile } from '../lib/types';

/** Draws the day as one picture (1080 x 1350) in the person's theme, then shares or saves it. */
export function ShareButton({ full, person }: { full: FullDay; person: Profile }) {
  const [state, setState] = useState<'idle' | 'busy' | 'failed'>('idle');

  async function share() {
    setState('busy');
    try {
      const blob = await drawCard(full, person);
      const file = new File([blob], `routine-${full.day.date}.png`, { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: `${person.name}, ${dayLabel(full.day.date)}` });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
      setState('idle');
    } catch (e) {
      // Closing the share sheet is not a failure.
      setState((e as Error).name === 'AbortError' ? 'idle' : 'failed');
    }
  }

  return (
    <>
      <button className="btn" onClick={share} disabled={state === 'busy'}>
        Share
      </button>
      {state === 'failed' && <span className="problem-line">Could not make the picture.</span>}
    </>
  );
}

function token(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

async function drawCard(full: FullDay, person: Profile): Promise<Blob> {
  await document.fonts?.ready;
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('no canvas');
  const bg = token('--bg', 'white');
  const ink = token('--ink', 'black');
  const mute = token('--mute', 'gray');
  const line = token('--line', 'lightgray');
  const font = token('--font', 'system-ui, sans-serif');
  const M = 88;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const done = full.tasks.filter((t) => t.status === 'done').length;
  const total = full.tasks.length;

  ctx.fillStyle = person.colour;
  ctx.beginPath();
  ctx.arc(M + 36, M + 36, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'white';
  ctx.font = `700 36px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((person.name.trim()[0] ?? '?').toUpperCase(), M + 36, M + 38);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = ink;
  ctx.font = `700 40px ${font}`;
  ctx.fillText(person.name || 'Me', M + 96, M + 32);
  ctx.fillStyle = mute;
  ctx.font = `500 32px ${font}`;
  ctx.fillText(dayLabel(full.day.date), M + 96, M + 74);

  ctx.fillStyle = ink;
  ctx.font = `700 150px ${font}`;
  ctx.fillText(`${done} of ${total}`, M, 380);
  ctx.fillStyle = mute;
  ctx.font = `500 36px ${font}`;
  ctx.fillText('tasks done', M, 436);

  let y = 540;
  const barX = M + 360;
  const barW = W - M - barX;
  for (const b of full.blocks.slice(0, 8)) {
    const tasks = full.tasks.filter((t) => t.day_block_id === b.id);
    const d = tasks.filter((t) => t.status === 'done').length + tasks.filter((t) => t.status === 'half').length / 2;
    ctx.fillStyle = mute;
    ctx.font = `500 28px ${font}`;
    ctx.fillText(hm(b.starts), M, y);
    ctx.fillStyle = ink;
    ctx.font = `600 32px ${font}`;
    ctx.fillText(fit(ctx, b.name, 230), M + 110, y);
    ctx.fillStyle = line;
    roundRect(ctx, barX, y - 22, barW, 18, 9);
    if (tasks.length) {
      ctx.fillStyle = person.colour;
      roundRect(ctx, barX, y - 22, Math.max(18, (barW * d) / tasks.length), 18, 9);
    }
    y += 76;
  }

  const next = full.day.tomorrow.trim();
  if (next) {
    y += 20;
    ctx.fillStyle = mute;
    ctx.font = `600 30px ${font}`;
    ctx.fillText('Tomorrow', M, y);
    ctx.fillStyle = ink;
    ctx.font = `500 32px ${font}`;
    for (const l of next.split('\n').filter(Boolean).slice(0, 3)) {
      y += 50;
      ctx.fillText(fit(ctx, l, W - 2 * M), M, y);
    }
  }

  ctx.fillStyle = mute;
  ctx.font = `600 28px ${font}`;
  ctx.fillText(ORG_NAME, M, H - M);

  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('no image'))), 'image/png'));
}

function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '...').width > max) t = t.slice(0, -1);
  return t + '...';
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.fill();
}
