-- 行事曆資料表（第一次使用、或要加上「公事／私事」時執行一次即可，重複執行也不會出錯）
create table if not exists public.personal_tasks (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 title text not null check(length(trim(title))>0),
 due_date date,
 due_time time,
 completed_at timestamptz,
 created_at timestamptz not null default now(),
 version integer not null default 1
);
-- 公事 work／私事 personal
alter table public.personal_tasks add column if not exists category text not null default 'personal';
alter table public.personal_tasks drop constraint if exists personal_tasks_category_check;
alter table public.personal_tasks add constraint personal_tasks_category_check check (category in ('work','personal'));

alter table public.personal_tasks enable row level security;
drop policy if exists "管理自己的待辦" on public.personal_tasks;
create policy "管理自己的待辦" on public.personal_tasks for all to authenticated
using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
revoke all on public.personal_tasks from anon;
grant select,insert,update,delete on public.personal_tasks to authenticated;
create index if not exists personal_tasks_user_date on public.personal_tasks(user_id,due_date);
create or replace function public.personal_task_version() returns trigger language plpgsql set search_path='' as $$
begin new.version:=old.version+1; return new; end; $$;
drop trigger if exists task_version on public.personal_tasks;
create trigger task_version before update on public.personal_tasks for each row execute function public.personal_task_version();
-- 讓網站馬上認得新資料表
notify pgrst, 'reload schema';
