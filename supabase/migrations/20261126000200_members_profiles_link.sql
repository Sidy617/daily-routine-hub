-- The Team screen reads each member's profile through team_members.
-- team_members.user_id pointed only at auth.users, so the API found no path to profiles
-- ("Could not find a relationship between 'team_members' and 'profiles'").
-- Every account gets a profile on sign-up, so this link always holds.
alter table public.team_members
  add constraint team_members_profile_fk foreign key (user_id) references public.profiles (id) on delete cascade;

notify pgrst, 'reload schema';
