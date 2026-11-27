import type { Profile } from './types';

/** Can I see this person's days? Always my own; others only when they share. */
export const canSee = (p: Profile, me: Profile) => p.id === me.id || p.share_progress === true;
