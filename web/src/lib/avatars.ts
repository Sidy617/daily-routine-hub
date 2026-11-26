// 3D avatars: Microsoft Fluent Emoji 3D people (MIT), in web/public/avatars.
// Until someone picks one or adds a photo, the name picks a character in the neutral
// default tone: the app never guesses anyone's skin tone; each person chooses it in Me.

export const CHARACTERS = ['person', 'student', 'office-worker', 'scientist', 'artist', 'teacher'] as const;
export const TONES = ['default', 'light', 'medium-light', 'medium', 'medium-dark', 'dark'] as const;
export type Character = (typeof CHARACTERS)[number];
export type Tone = (typeof TONES)[number];

export const CHARACTER_NAMES: Record<Character, string> = {
  person: 'Person',
  student: 'Student',
  'office-worker': 'Office',
  scientist: 'Scientist',
  artist: 'Artist',
  teacher: 'Teacher',
};

/** Swatches for the tone picker (the Fluent default tone is the yellow one). */
export const TONE_SWATCHES: Record<Tone, string> = {
  default: '#ffc83d',
  light: '#f7d7c4',
  'medium-light': '#d8b094',
  medium: '#bb9167',
  'medium-dark': '#8e562e',
  dark: '#613d30',
};

const VALID = new RegExp(`^(${CHARACTERS.join('|')})-(${TONES.join('|')})$`);

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}

export function avatarKey(p: { name: string; avatar?: string | null }): string {
  if (p.avatar && VALID.test(p.avatar)) return p.avatar;
  return `${CHARACTERS[hash(p.name.trim().toLowerCase() || 'someone') % CHARACTERS.length]}-default`;
}

export function splitKey(key: string): { character: Character; tone: Tone } {
  // Longest tone first, so "medium-light" is not read as "light".
  const tone = [...TONES].sort((a, b) => b.length - a.length).find((t) => key.endsWith(`-${t}`)) ?? 'default';
  const character = (key.slice(0, key.length - tone.length - 1) as Character) || 'person';
  return { character: CHARACTERS.includes(character) ? character : 'person', tone };
}

export const avatarUrl = (key: string) => `${import.meta.env.BASE_URL}avatars/${key}.png`;

/** The photo if there is one, else the 3D avatar. */
export function faceUrl(p: { name: string; avatar?: string | null; photo_url?: string | null }): { url: string; isPhoto: boolean } {
  if (p.photo_url) return { url: p.photo_url, isPhoto: true };
  return { url: avatarUrl(avatarKey(p)), isPhoto: false };
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
