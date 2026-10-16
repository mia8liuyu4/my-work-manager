-- 筆記圖片 + 餐廳清單同步（執行一次即可，重複執行也不會出錯）

-- 1) 筆記裡的圖片
create table if not exists public.note_images (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 data text not null check (length(data) < 3000000),
 created_at timestamptz not null default now()
);
alter table public.note_images enable row level security;
drop policy if exists "管理自己的筆記圖片" on public.note_images;
create policy "管理自己的筆記圖片" on public.note_images for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.note_images from anon;
grant select, insert, update, delete on public.note_images to authenticated;

-- 2) 各種小設定與清單（目前用來同步「今天吃什麼」的餐廳清單）
create table if not exists public.app_state (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 key text not null,
 data jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now(),
 primary key (user_id, key)
);
alter table public.app_state enable row level security;
drop policy if exists "管理自己的設定" on public.app_state;
create policy "管理自己的設定" on public.app_state for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.app_state from anon;
grant select, insert, update, delete on public.app_state to authenticated;
create or replace function public.app_state_touch() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end; $$;
drop trigger if exists app_state_touch on public.app_state;
create trigger app_state_touch before insert or update on public.app_state for each row execute function public.app_state_touch();

notify pgrst, 'reload schema';
