-- Faces on the sign-in page: a photo and a "what I work on" line per person,
-- a public list of the team's faces, and a photo store where each person writes only their own.

alter table public.profiles
  add column photo_url text,
  add column focus text not null default '' check (char_length(focus) <= 40),
  add column show_on_login boolean not null default true;

-- A photo can only come from this project's avatar store, from the person's own folder.
-- No outside links: every visitor of the sign-in page would load them.
alter table public.profiles
  add constraint profiles_photo_own check (
    photo_url is null
    or photo_url like 'https://sqnhrrrvvqveaskpamro.supabase.co/storage/v1/object/public/avatars/' || id::text || '/%'
  );

alter table public.teams add column show_on_login boolean not null default false;
update public.teams set show_on_login = true where name = 'Simulation';

-- The sign-in page's list: first-chosen names, photos and focus of members who allow it.
create function public.login_faces()
returns table (name text, photo_url text, colour text, focus text)
language sql stable security definer set search_path = '' as $$
  select p.name, p.photo_url, p.colour, p.focus
  from public.team_members m
  join public.teams t on t.id = m.team_id
  join public.profiles p on p.id = m.user_id
  where t.show_on_login and p.show_on_login and p.name <> ''
  order by m.joined_at
  limit 12;
$$;
revoke execute on function public.login_faces() from public;
grant execute on function public.login_faces() to anon, authenticated;

-- Photo store: public to read (photos show before sign-in), 1 MB, images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_update_own on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
