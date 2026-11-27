import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Our type sizes (text-large ... text-cap) are sizes, not colours. Without this, merging
// "text-head" with "text-tint-ink" would drop the colour, or the size.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['large', 'title', 'head', 'body', 'sub', 'cap'] }],
    },
  },
});

/** Joins class names; later Tailwind classes win over earlier ones. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** A size in px at 100%, as rem, so the app's size setting (Me, Appearance) scales it too. */
export const rem = (px: number) => `${px / 16}rem`;
