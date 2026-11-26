-- Keep the row-rule helpers out of the public API, and triggers uncallable.
create schema if not exists private;
grant usage on schema private to authenticated;

alter function public.my_team_ids() set schema private;
alter function public.shares_team(uuid) set schema private;
alter function public.can_view(uuid) set schema private;
alter function public.owns_day(uuid) set schema private;

-- can_view calls shares_team by name, so point it at the new schema.
create or replace function private.can_view(owner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select owner = auth.uid()
    or (private.shares_team(owner)
        and coalesce((select p.share_progress from public.profiles p where p.id = owner), false));
$$;

revoke execute on function public.on_new_user(), public.touch_day() from public, anon, authenticated;
