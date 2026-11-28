-- The Board: short lines the team shares (an aim, something learned, a cheer for someone),
-- with replies, tags for people and topics, pins and reactions. Only adds.
--
-- Who reads: everyone in the team, even people who keep their days private. Posting is a choice;
-- the day itself stays private.
-- Who writes: each person writes, edits and deletes only their own lines and reactions.
-- Pins belong to the team: anyone in it can pin a line; the person who pinned it or the
-- line's author can unpin it.

create function private.in_team(t uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.team_members where team_id = t and user_id = auth.uid());
$$;

-- Everyone tagged in a line must be in the line's team.
create function private.all_in_team(people uuid[], t uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (
    select 1 from unnest(people) as p(id)
    where not exists (select 1 from public.team_members m where m.team_id = t and m.user_id = p.id)
  );
$$;

-- Topics are short lowercase words: letters, digits and dashes.
create function private.topics_ok(topics text[]) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(bool_and(t ~ '^[a-z0-9][a-z0-9-]{0,23}$'), true) from unnest(topics) as t;
$$;

revoke execute on function private.in_team(uuid), private.all_in_team(uuid[], uuid) from public, anon;
grant execute on function private.in_team(uuid), private.all_in_team(uuid[], uuid) to authenticated;

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  date date not null, -- the writer's own day
  kind text not null check (kind in ('aim', 'learned', 'cheer', 'reply')),
  body text not null check (char_length(btrim(body)) between 1 and 500),
  parent_id uuid references public.posts (id) on delete cascade,
  people uuid[] not null default '{}' check (cardinality(people) <= 10),
  topics text[] not null default '{}' check (cardinality(topics) <= 5 and private.topics_ok(topics)),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  check ((kind = 'reply') = (parent_id is not null)),
  check (kind <> 'cheer' or cardinality(people) >= 1)
);
create index posts_team_idx on public.posts (team_id, created_at desc);
create index posts_parent_idx on public.posts (parent_id);
create index posts_user_date_idx on public.posts (user_id, date);
create index posts_topics_idx on public.posts using gin (topics);
create index posts_people_idx on public.posts using gin (people);

-- An edit changes the words and tags only; who, where and when stay as written.
create function private.post_edit() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.team_id <> old.team_id or new.user_id <> old.user_id or new.kind <> old.kind
     or new.parent_id is distinct from old.parent_id or new.date <> old.date or new.created_at <> old.created_at then
    raise exception 'only the words and tags of a line can change';
  end if;
  new.edited_at = now();
  return new;
end $$;
create trigger posts_edit before update on public.posts for each row execute function private.post_edit();

create table public.post_pins (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique references public.posts (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  pinned_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  pinned_at timestamptz not null default now()
);
create index post_pins_team_idx on public.post_pins (team_id);

create table public.post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('clap', 'on_it', 'idea')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id, kind)
);
create index post_reactions_post_idx on public.post_reactions (post_id);

alter table public.posts enable row level security;
alter table public.post_pins enable row level security;
alter table public.post_reactions enable row level security;

create policy posts_read on public.posts for select to authenticated using (private.in_team(team_id));
create policy posts_insert on public.posts for insert to authenticated
  with check (
    user_id = auth.uid()
    and private.in_team(team_id)
    and private.all_in_team(people, team_id)
    -- a reply answers a line (not another reply) in the same team
    and (parent_id is null or exists (
      select 1 from public.posts p where p.id = posts.parent_id and p.team_id = posts.team_id and p.parent_id is null
    ))
  );
create policy posts_update on public.posts for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and private.in_team(team_id) and private.all_in_team(people, team_id));
create policy posts_delete on public.posts for delete to authenticated using (user_id = auth.uid());

create policy pins_read on public.post_pins for select to authenticated using (private.in_team(team_id));
create policy pins_insert on public.post_pins for insert to authenticated
  with check (
    pinned_by = auth.uid()
    and private.in_team(team_id)
    and exists (select 1 from public.posts p where p.id = post_id and p.team_id = post_pins.team_id)
  );
create policy pins_delete on public.post_pins for delete to authenticated
  using (
    private.in_team(team_id)
    and (pinned_by = auth.uid() or exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()))
  );

create policy reactions_read on public.post_reactions for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));
create policy reactions_insert on public.post_reactions for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id));
create policy reactions_delete on public.post_reactions for delete to authenticated using (user_id = auth.uid());

revoke all on public.posts, public.post_pins, public.post_reactions from anon;

-- New lines, pins and reactions reach the team live, through the same read rules.
alter publication supabase_realtime add table public.posts, public.post_pins, public.post_reactions;

notify pgrst, 'reload schema';
