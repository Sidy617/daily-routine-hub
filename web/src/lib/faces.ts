// A drawn face for anyone without a photo yet: the same name always gives the same face,
// drawn on this device (no name is sent anywhere). Art: Notionists by Zoish, CC0, via DiceBear (MIT).
// The drawing kit is large, so it loads after the page shows; until then a coloured initial stands in.
import { useEffect, useState } from 'react';

type Draw = (name: string, colour: string) => string;
let drawer: Draw | null = null;
let loading: Promise<Draw> | null = null;
const cache = new Map<string, string>();

/** The person's colour mixed toward white, so the drawing reads on it. */
export function pale(hex: string, amount = 0.72): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return 'eef0f3';
  const n = parseInt(m[1], 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount).toString(16).padStart(2, '0');
  return mix((n >> 16) & 255) + mix((n >> 8) & 255) + mix(n & 255);
}

function loadDrawer(): Promise<Draw> {
  loading ??= Promise.all([import('@dicebear/core'), import('@dicebear/notionists')]).then(([core, style]) => {
    drawer = (name, colour) => {
      const key = `${name}|${colour}`;
      let uri = cache.get(key);
      if (!uri) {
        uri = core.createAvatar(style, { seed: name.trim() || 'someone', backgroundColor: [pale(colour)] }).toDataUri();
        cache.set(key, uri);
      }
      return uri;
    };
    return drawer;
  });
  return loading;
}

type Person = { name: string; colour: string; photo_url?: string | null };

/** The photo, the drawn face once ready, or null while the drawing kit loads. */
export function useFace(p: Person): string | null {
  const [ready, setReady] = useState(!!drawer);
  useEffect(() => {
    if (p.photo_url || drawer) return;
    let live = true;
    loadDrawer()
      .then(() => live && setReady(true))
      .catch(() => undefined); // offline: the initial stays, which is fine
    return () => {
      live = false;
    };
  }, [p.photo_url]);
  if (p.photo_url) return p.photo_url;
  return ready && drawer ? drawer(p.name, p.colour) : null;
}

/** Squares and shrinks a photo on the device before upload (480px JPEG), so uploads stay small. */
export async function squarePhoto(file: File, size = 480): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('That file is not a picture we can read.'));
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('This browser cannot prepare the photo.');
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    return await new Promise<Blob>((resolve, reject) =>
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not prepare the photo.'))), 'image/jpeg', 0.85),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
