-- Live team: the Team screen moves the moment someone ticks a task, and shows who has the app open.
-- Only adds; nothing the site online today uses is changed or dropped.

-- Realtime sends a task change only to people whose row rules let them read that task,
-- so a day kept private never reaches anyone else.
alter publication supabase_realtime add table public.tasks;

-- "Here now": a dot on people who have the app open. Each person can hide theirs in Me.
alter table public.profiles add column show_here boolean not null default true;

-- Presence travels on a private channel per team ("team:<id>"). Only members of that team
-- may join it, see who is there, or announce themselves.
create function private.my_team_topics() returns setof text
language sql stable security definer set search_path = '' as $$
  select 'team:' || team_id::text from public.team_members where user_id = auth.uid();
$$;
revoke execute on function private.my_team_topics() from public, anon;
grant execute on function private.my_team_topics() to authenticated;

create policy team_presence_read on realtime.messages for select to authenticated
  using (realtime.messages.extension = 'presence' and (select realtime.topic()) in (select private.my_team_topics()));
create policy team_presence_write on realtime.messages for insert to authenticated
  with check (realtime.messages.extension = 'presence' and (select realtime.topic()) in (select private.my_team_topics()));
