-- 織圖工坊雲端同步資料表（執行一次即可，重複執行也不會出錯）
create table if not exists public.knit_projects (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 id text not null,
 data jsonb not null default '{}'::jsonb,
 deleted boolean not null default false,
 updated_at timestamptz not null default now(),
 primary key (user_id, id)
);
alter table public.knit_projects enable row level security;
drop policy if exists "管理自己的織圖" on public.knit_projects;
create policy "管理自己的織圖" on public.knit_projects for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.knit_projects from anon;
grant select, insert, update, delete on public.knit_projects to authenticated;
create index if not exists knit_projects_user_updated on public.knit_projects(user_id, updated_at);
-- 由伺服器記錄更新時間，各裝置時間不準也不影響同步
create or replace function public.knit_touch() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end; $$;
drop trigger if exists knit_touch on public.knit_projects;
create trigger knit_touch before insert or update on public.knit_projects for each row execute function public.knit_touch();
notify pgrst, 'reload schema';
