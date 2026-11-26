import { useEffect } from 'react';
import { daypart } from '@/themes';

/** The sky behind the app. It follows the clock: dawn, day, dusk and night. */
export function Wallpaper() {
  useEffect(() => {
    const set = () => {
      document.documentElement.dataset.daypart = daypart();
    };
    set();
    const t = window.setInterval(set, 5 * 60 * 1000);
    return () => window.clearInterval(t);
  }, []);
  return <div className="wallpaper" aria-hidden="true" />;
}
