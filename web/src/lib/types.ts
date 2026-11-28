export type Status = 'todo' | 'half' | 'done';

export interface Profile {
  id: string;
  name: string;
  colour: string;
  theme: string;
  share_progress: boolean | null;
  photo_url: string | null;
  avatar: string | null;
  focus: string;
  show_on_login: boolean;
  /** A dot on my picture while I have the app open. */
  show_here: boolean;
}

/** What the public sign-in page may show about a team member. */
export interface LoginFace {
  name: string;
  photo_url: string | null;
  avatar: string | null;
  colour: string;
  focus: string;
}

export interface Team {
  id: string;
  name: string;
  invite_code: string;
}

export interface Block {
  id: string;
  user_id: string;
  name: string;
  starts: string;
  ends: string;
  position: number;
  tasks: string[];
}

export interface Day {
  id: string;
  user_id: string;
  date: string;
  missed: string;
  fix: string;
  tomorrow: string;
  updated_at: string;
}

export interface DayBlock {
  id: string;
  day_id: string;
  name: string;
  starts: string;
  ends: string;
  position: number;
}

export interface Task {
  id: string;
  day_id: string;
  day_block_id: string;
  text: string;
  status: Status;
  note: string;
  position: number;
}

export interface DayTotal {
  day_id: string;
  user_id: string;
  date: string;
  updated_at: string;
  total: number;
  done: number;
  half: number;
}

export interface BlockTotal {
  id: string;
  day_id: string;
  user_id: string;
  date: string;
  name: string;
  starts: string;
  position: number;
  total: number;
  done: number;
  half: number;
}

export interface FullDay {
  day: Day;
  blocks: DayBlock[];
  tasks: Task[];
}

/** A line on the team's Board. A reply answers a line; people and topics are its tags. */
export type PostKind = 'aim' | 'learned' | 'cheer' | 'reply';

export interface Post {
  id: string;
  team_id: string;
  user_id: string;
  /** The writer's own day. */
  date: string;
  kind: PostKind;
  body: string;
  parent_id: string | null;
  people: string[];
  topics: string[];
  created_at: string;
  edited_at: string | null;
}

export interface Pin {
  id: string;
  post_id: string;
  team_id: string;
  pinned_by: string;
  pinned_at: string;
}

export type ReactionKind = 'clap' | 'on_it' | 'idea';

export interface Reaction {
  id: string;
  post_id: string;
  user_id: string;
  kind: ReactionKind;
}
