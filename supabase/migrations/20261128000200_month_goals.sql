-- Goals for the month, beside the week's goals. Read and written like week_goals:
-- teammates read them only if the person shares their days; each person writes only their own.
create table public.month_goals (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  month_start date not null check (extract(day from month_start) = 1),
  goals text not null default '' check (char_length(goals) <= 2000),
  updated_at timestamptz not null default now(),
  primary key (user_id, month_start)
);

alter table public.month_goals enable row level security;
create policy month_goals_read on public.month_goals for select to authenticated using (private.can_view(user_id));
create policy month_goals_insert on public.month_goals for insert to authenticated with check (user_id = auth.uid());
create policy month_goals_update on public.month_goals for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger month_goals_touch before update on public.month_goals for each row execute function public.touch_row();

revoke all on public.month_goals from anon;

notify pgrst, 'reload schema';
