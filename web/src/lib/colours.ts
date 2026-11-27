import type { CSSProperties } from 'react';

// Person colours: each person picks one; it tints their app and marks their avatar, rings and grid.
// Some are light (green, orange) and some dark (red, blue), so they are never used as picked for
// text or marks: the theme and the .person-colour rules in app.css adjust them to stay readable.
export const PERSON_COLOURS = ['#2563eb', '#30b0c7', '#34c759', '#ff9500', '#ff2d55', '#ca8a04', '#64748b', '#b91c1c'];

// Icon tiles in grouped lists, iOS Settings style.
export const TILE = {
  orange: '#ff9500',
  green: '#34c759',
  blue: '#0a84ff',
  pink: '#ff2d55',
  teal: '#30b0c7',
  brown: '#a2845e',
  grey: '#8e8e93',
} as const;

/** Hands a person's colour to the .person-colour rules in app.css, which keep it readable in light
 *  and dark: var(--mark) for rings, bars and squares, var(--heat) for fills that hold text. */
export function personStyle(colour: string, style: CSSProperties = {}): CSSProperties {
  return { ...style, ['--c' as string]: colour } as CSSProperties;
}
