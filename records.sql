-- 生活紀錄資料表：倒數日、午餐記帳、小確幸、每日心情共用（執行一次即可，重複執行也不會出錯）
create table if not exists public.personal_records (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 kind text not null check (kind in ('countdown','meal','joy','mood')),
 day date not null default current_date,
 title text not null default '' check (length(title) <= 200),
 amount numeric(10,2),
 data jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.personal_records enable row level security;
drop policy if exists "管理自己的紀錄" on public.personal_records;
create policy "管理自己的紀錄" on public.personal_records for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.personal_records from anon;
grant select, insert, update, delete on public.personal_records to authenticated;
create index if not exists personal_records_user_kind_day on public.personal_records(user_id, kind, day);
notify pgrst, 'reload schema';
