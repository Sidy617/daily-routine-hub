import { useState } from 'react';
import { motion } from 'motion/react';
import { faceUrl } from '@/lib/avatars';
import { cn } from '@/lib/utils';

type Person = { name: string; colour: string; photo_url?: string | null; avatar?: string | null };

/** A photo, or the person's 3D avatar on a soft wash of their colour. */
export function Avatar({ person, size = 40, className }: { person: Person; size?: number; className?: string }) {
  const { url, isPhoto } = faceUrl(person);
  const [failed, setFailed] = useState<string | null>(null);
  const broken = failed === url;
  return (
    <span
      className={cn('relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full', className)}
      style={{
        width: size,
        height: size,
        background: isPhoto && !broken ? 'var(--fill)' : `color-mix(in srgb, ${person.colour} 24%, var(--glass-strong))`,
      }}
    >
      {broken ? (
        <span className="font-semibold text-ink" style={{ fontSize: size * 0.4 }}>
          {(person.name.trim()[0] ?? '?').toUpperCase()}
        </span>
      ) : (
        <img
          src={url}
          alt=""
          draggable={false}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(url)}
          className={isPhoto ? 'size-full object-cover' : 'size-[86%] translate-y-[7%] object-contain'}
        />
      )}
    </span>
  );
}

/** Overlapping circles of the team (after Magic UI's Avatar Circles, MIT). */
export function AvatarCircles({ people, max = 5, size = 38 }: { people: Person[]; max?: number; size?: number }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div className="flex -space-x-2.5">
      {shown.map((p, i) => (
        <motion.span
          key={`${p.name}-${i}`}
          initial={{ opacity: 0, y: 8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.08 + i * 0.06, type: 'spring', stiffness: 380, damping: 26 }}
          className="rounded-full ring-[2.5px] ring-[var(--glass-strong)]"
        >
          <Avatar person={p} size={size} />
        </motion.span>
      ))}
      {extra > 0 && (
        <span
          className="grid place-items-center rounded-full bg-fill text-cap font-semibold text-ink-2 ring-[2.5px] ring-[var(--glass-strong)]"
          style={{ width: size, height: size }}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}
