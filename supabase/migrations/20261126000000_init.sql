-- Simulation Routine: first schema.
-- Rule of the house: everyone reads what their team shares; each person writes only their own rows.
-- Row rules (RLS) are on for every table. Nothing here is readable without signing in.

-- People ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 40),
  colour text not null default '#2563eb' check (colour ~ '^#[0-9a-fA-F]{6}$'),
  theme text not null default 'meulic' check (theme ~ '^[a-z0-9-]{1,32}$'),
  share_progress boolean, -- null until the person chooses
  created_at timestamptz not null default now()
);

-- Teams ----------------------------------------------------------------
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  invite_code text not null unique default encode(extensions.gen_random_bytes(6), 'hex'),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create index team_members_user_idx on public.team_members (user_id);

-- A person's routine: the blocks every new day starts with -------------
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  starts time not null,
  ends time not null,
  position int not null default 0,
  tasks text[] not null default '{}', -- tasks each new day starts with
  created_at timestamptz not null default now()
);
create index blocks_user_idx on public.blocks (user_id);

-- Days: the record of the past. Each day keeps its own copy of the blocks,
-- so changing the routine later never rewrites history.
create table public.days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  missed text not null default '' check (char_length(missed) <= 2000),
  fix text not null default '' check (char_length(fix) <= 2000),
  tomorrow text not null default '' check (char_length(tomorrow) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create table public.day_blocks (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.days (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  starts time not null,
  ends time not null,
  position int not null default 0
);
create index day_blocks_day_idx on public.day_blocks (day_id);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.days (id) on delete cascade,
  day_block_id uuid not null references public.day_blocks (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 200),
  status text not null default 'todo' check (status in ('todo', 'half', 'done')),
  note text not null default '' check (char_length(note) <= 500),
  position int not null default 0,
  updated_at timestamptz not null default now()
);
create index tasks_day_idx on public.tasks (day_id);
create index tasks_block_idx on public.tasks (day_block_id);

create table public.week_goals (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start date not null,
  goals text not null default '' check (char_length(goals) <= 2000),
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

-- Helpers (definer, fixed search path) ---------------------------------
create function public.my_team_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select team_id from public.team_members where user_id = auth.uid();
$$;

create function public.shares_team(other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.team_members a
    join public.team_members b on a.team_id = b.team_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

-- Can the signed-in person read this owner's routine?
create function public.can_view(owner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select owner = auth.uid()
    or (public.shares_team(owner)
        and coalesce((select p.share_progress from public.profiles p where p.id = owner), false));
$$;

create function public.owns_day(d uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.days where id = d and user_id = auth.uid());
$$;

-- Row rules ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.blocks enable row level security;
alter table public.days enable row level security;
alter table public.day_blocks enable row level security;
alter table public.tasks enable row level security;
alter table public.week_goals enable row level security;

create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_team(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy teams_read on public.teams for select to authenticated
  using (id in (select public.my_team_ids()));

create policy members_read on public.team_members for select to authenticated
  using (team_id in (select public.my_team_ids()));
create policy members_leave on public.team_members for delete to authenticated
  using (user_id = auth.uid());

create policy blocks_read on public.blocks for select to authenticated using (public.can_view(user_id));
create policy blocks_insert on public.blocks for insert to authenticated with check (user_id = auth.uid());
create policy blocks_update on public.blocks for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy blocks_delete on public.blocks for delete to authenticated using (user_id = auth.uid());

create policy days_read on public.days for select to authenticated using (public.can_view(user_id));
create policy days_insert on public.days for insert to authenticated with check (user_id = auth.uid());
create policy days_update on public.days for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy days_delete on public.days for delete to authenticated using (user_id = auth.uid());

create policy day_blocks_read on public.day_blocks for select to authenticated using (public.can_view(user_id));
create policy day_blocks_insert on public.day_blocks for insert to authenticated
  with check (user_id = auth.uid() and public.owns_day(day_id));
create policy day_blocks_update on public.day_blocks for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.owns_day(day_id));
create policy day_blocks_delete on public.day_blocks for delete to authenticated using (user_id = auth.uid());

create policy tasks_read on public.tasks for select to authenticated using (public.can_view(user_id));
create policy tasks_insert on public.tasks for insert to authenticated
  with check (user_id = auth.uid() and public.owns_day(day_id));
create policy tasks_update on public.tasks for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.owns_day(day_id));
create policy tasks_delete on public.tasks for delete to authenticated using (user_id = auth.uid());

create policy goals_read on public.week_goals for select to authenticated using (public.can_view(user_id));
create policy goals_insert on public.week_goals for insert to authenticated with check (user_id = auth.uid());
create policy goals_update on public.week_goals for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Nobody signed out reads anything.
revoke all on all tables in schema public from anon;

-- Keep a day's "updated" time true -------------------------------------
create function public.touch_day() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.days set updated_at = now() where id = coalesce(new.day_id, old.day_id);
  return null;
end $$;
create trigger tasks_touch_day after insert or update or delete on public.tasks
  for each row execute function public.touch_day();

create function public.touch_row() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger days_touch before update on public.days for each row execute function public.touch_row();
create trigger tasks_touch before update on public.tasks for each row execute function public.touch_row();
create trigger goals_touch before update on public.week_goals for each row execute function public.touch_row();

-- A profile for every new account --------------------------------------
create function public.on_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'name', ''), 40));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.on_new_user();

-- Actions ----------------------------------------------------------------
create function public.join_team(code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare t uuid;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select id into t from public.teams where invite_code = lower(trim(code));
  if t is null then raise exception 'invite not found'; end if;
  insert into public.team_members (team_id, user_id) values (t, auth.uid()) on conflict do nothing;
  return t;
end $$;

create function public.create_team(team_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare t uuid;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  insert into public.teams (name, created_by) values (trim(team_name), auth.uid()) returning id into t;
  insert into public.team_members (team_id, user_id) values (t, auth.uid());
  return t;
end $$;

-- Open (or create) my day: copies my routine's blocks and their starting tasks.
create function public.open_day(d date) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare day_id uuid; b record; nb uuid; i int;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  insert into public.days (user_id, date) values (auth.uid(), d)
    on conflict (user_id, date) do nothing returning id into day_id;
  if day_id is null then
    select id into day_id from public.days where user_id = auth.uid() and date = d;
    return day_id;
  end if;
  for b in select * from public.blocks where user_id = auth.uid() order by position, starts loop
    insert into public.day_blocks (day_id, user_id, name, starts, ends, position)
      values (day_id, auth.uid(), b.name, b.starts, b.ends, b.position) returning id into nb;
    if b.tasks is not null then
      for i in 1 .. coalesce(array_length(b.tasks, 1), 0) loop
        insert into public.tasks (day_id, day_block_id, user_id, text, position)
          values (day_id, nb, auth.uid(), b.tasks[i], i);
      end loop;
    end if;
  end loop;
  return day_id;
end $$;

revoke execute on function public.join_team(text), public.create_team(text), public.open_day(date) from public, anon;
grant execute on function public.join_team(text), public.create_team(text), public.open_day(date) to authenticated;
revoke execute on function public.my_team_ids(), public.shares_team(uuid), public.can_view(uuid), public.owns_day(uuid) from public, anon;
grant execute on function public.my_team_ids(), public.shares_team(uuid), public.can_view(uuid), public.owns_day(uuid) to authenticated;

-- Totals, read through the same row rules ------------------------------
create view public.day_totals with (security_invoker = true) as
select d.id as day_id, d.user_id, d.date, d.updated_at, d.missed <> '' as has_review,
  count(t.id)::int as total,
  (count(t.id) filter (where t.status = 'done'))::int as done,
  (count(t.id) filter (where t.status = 'half'))::int as half
from public.days d
left join public.tasks t on t.day_id = d.id
group by d.id;

create view public.block_totals with (security_invoker = true) as
select b.id, b.day_id, b.user_id, d.date, b.name, b.starts, b.position,
  count(t.id)::int as total,
  (count(t.id) filter (where t.status = 'done'))::int as done,
  (count(t.id) filter (where t.status = 'half'))::int as half
from public.day_blocks b
join public.days d on d.id = b.day_id
left join public.tasks t on t.day_block_id = b.id
group by b.id, d.date;

revoke all on public.day_totals, public.block_totals from anon;
grant select on public.day_totals, public.block_totals to authenticated;

-- The first team ---------------------------------------------------------
insert into public.teams (name) values ('Simulation');
