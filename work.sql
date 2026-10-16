-- 工作區雲端同步資料表（專案、任務、每週清單）（執行一次即可，重複執行也不會出錯）
create table if not exists public.work_items (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 id text not null,
 data jsonb not null default '{}'::jsonb,
 deleted boolean not null default false,
 updated_at timestamptz not null default now(),
 primary key (user_id, id)
);
alter table public.work_items enable row level security;
drop policy if exists "管理自己的工作" on public.work_items;
create policy "管理自己的工作" on public.work_items for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.work_items from anon;
grant select, insert, update, delete on public.work_items to authenticated;
create index if not exists work_items_user_updated on public.work_items(user_id, updated_at);
-- 由伺服器記錄更新時間，各裝置時間不準也不影響同步
create or replace function public.work_touch() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end; $$;
drop trigger if exists work_touch on public.work_items;
create trigger work_touch before insert or update on public.work_items for each row execute function public.work_touch();
notify pgrst, 'reload schema';
