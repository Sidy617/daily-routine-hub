-- A 3D avatar each person can choose (character and skin tone), shown until they add a photo.
alter table public.profiles
  add column avatar text check (
    avatar is null
    or avatar ~ '^(person|student|office-worker|scientist|artist|teacher)-(default|light|medium-light|medium|medium-dark|dark)$'
  );

-- The sign-in page also needs the avatar choice.
drop function public.login_faces();
create function public.login_faces()
returns table (name text, photo_url text, avatar text, colour text, focus text)
language sql stable security definer set search_path = '' as $$
  select p.name, p.photo_url, p.avatar, p.colour, p.focus
  from public.team_members m
  join public.teams t on t.id = m.team_id
  join public.profiles p on p.id = m.user_id
  where t.show_on_login and p.show_on_login and p.name <> ''
  order by m.joined_at
  limit 12;
$$;
revoke execute on function public.login_faces() from public;
grant execute on function public.login_faces() to anon, authenticated;
