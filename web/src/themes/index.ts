export interface Theme {
  id: string; // matches :root[data-theme-id='...'] in the theme's css file
  name: string;
  by: string; // whose design it is
  note: string; // a few words
  dark: 'device' | 'always' | 'never'; // follow the device's light or dark setting, always dark, or always light
  preview: { sky: string; card: string; ink: string; tint: string }; // drawn in the picker
}

// Add yours here after copying a theme file. See themes/README.md.
export const THEMES: Theme[] = [
  {
    id: 'meulic',
    name: 'Meulic',
    by: 'Meulic',
    note: 'Glass over a sky that follows the sun',
    dark: 'device',
    preview: { sky: 'linear-gradient(160deg, #ffd8c4, #dcebff 55%, #eef2f8)', card: 'rgb(255 255 255 / 0.6)', ink: '#0b0b0f', tint: '#0a84ff' },
  },
  {
    id: 'white',
    name: 'White',
    by: 'Meulic',
    note: 'Pure white, with the sun passing over',
    dark: 'never',
    preview: { sky: 'radial-gradient(80% 70% at 15% 10%, #ffe6d2, #ffffff 70%)', card: '#ffffff', ink: '#0b0b0f', tint: '#0a84ff' },
  },
  {
    id: 'original',
    name: 'Original',
    by: 'The first design',
    note: 'Dark with cyan',
    dark: 'always',
    preview: { sky: '#030712', card: '#111827', ink: '#f3f4f6', tint: '#06b6d4' },
  },
];

export const DEFAULT_THEME = 'meulic';

const prefersDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

/** Puts the theme on <html>: its id, light or dark, and the person's colour as the tint. */
export function applyTheme(id: string, personColour?: string) {
  const theme = THEMES.find((t) => t.id === id) ?? THEMES[0];
  const root = document.documentElement;
  root.dataset.themeId = theme.id;
  root.classList.toggle('dark', theme.dark === 'always' || (theme.dark === 'device' && prefersDark()));
  if (personColour) root.style.setProperty('--person', personColour);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim() || '#ffffff');
  try {
    localStorage.setItem('theme', theme.id);
    if (personColour) localStorage.setItem('person-colour', personColour);
  } catch {
    // private mode: the theme still applies for this visit
  }
}

/** Size on this device, picked in Me > Appearance. Everything is in rem, so one number scales the app.
 *  It belongs to the device, not the account: a phone and a laptop often want different sizes. */
export const APP_SIZES = [0.85, 0.9, 0.95, 1, 1.05, 1.1, 1.2];

export function savedAppSize(): number {
  try {
    const size = Number(localStorage.getItem('app-size'));
    return APP_SIZES.includes(size) ? size : 1;
  } catch {
    return 1;
  }
}

export function applyAppSize(size: number) {
  document.documentElement.style.setProperty('--app-size', String(size));
  try {
    localStorage.setItem('app-size', String(size));
  } catch {
    // private mode: the size still applies for this visit
  }
}
