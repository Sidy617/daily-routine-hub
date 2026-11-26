import './meulic.css';
import './original.css';

export interface Theme {
  id: string; // matches :root[data-theme-id='...'] in the theme's css file
  name: string;
  by: string; // whose design it is
  note: string; // a few words
  swatches: [string, string, string]; // ground, ink, line: shown in the picker
}

// Add yours here after copying a theme file. See themes/README.md.
export const THEMES: Theme[] = [
  { id: 'meulic', name: 'Meulic', by: 'Meulic', note: 'Calm, white, few words', swatches: ['#ffffff', '#0b0b10', '#eceef2'] },
  { id: 'original', name: 'Original', by: 'The first design', note: 'Dark with cyan', swatches: ['#030712', '#06b6d4', '#1f2937'] },
];

export const DEFAULT_THEME = 'meulic';

export function applyTheme(id: string) {
  const known = THEMES.some((t) => t.id === id) ? id : DEFAULT_THEME;
  document.documentElement.dataset.themeId = known;
  try {
    localStorage.setItem('theme', known);
  } catch {
    // private mode: the theme still applies for this visit
  }
}
