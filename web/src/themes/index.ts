export interface Theme {
  id: string; // matches :root[data-theme-id='...'] in the theme's css file
  name: string;
  by: string; // whose design it is
  note: string; // a few words
  dark: 'device' | 'always'; // follow the device's light or dark setting, or always dark
  preview: { sky: string; card: string; ink: string; tint: string }; // drawn in the picker
}

// Add yours here after copying a theme file. See themes/README.md.
export const THEMES: Theme[] = [
  {
    id: 'meulic',
    name: 'Meulic',
    by: 'Meulic',
    note: 'Glass over a sky that follows your day',
    dark: 'device',
    preview: { sky: 'linear-gradient(160deg, #ffd8c4, #dcebff 55%, #eef2f8)', card: 'rgb(255 255 255 / 0.6)', ink: '#0b0b0f', tint: '#0a84ff' },
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
  root.classList.toggle('dark', theme.dark === 'always' || prefersDark());
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

/** Morning, day, evening or night, from the clock: the Meulic sky follows it. */
export function daypart(date = new Date()): 'dawn' | 'day' | 'dusk' | 'night' {
  const h = date.getHours();
  if (h >= 5 && h < 9) return 'dawn';
  if (h >= 9 && h < 16) return 'day';
  if (h >= 16 && h < 19) return 'dusk';
  return 'night';
}
