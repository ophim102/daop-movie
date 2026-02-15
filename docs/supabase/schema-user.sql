-- Supabase User Project: Auth + dữ liệu người dùng (favorites, watch history)
-- Chạy trong SQL Editor của project Supabase User

-- Bảng profiles (mở rộng auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Bảng favorites
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_uid uuid not null references auth.users(id) on delete cascade,
  movie_slug text not null,
  created_at timestamptz default now(),
  unique(user_uid, movie_slug)
);

-- Bảng watch_history
create table if not exists public.watch_history (
  id uuid primary key default gen_random_uuid(),
  user_uid uuid not null references auth.users(id) on delete cascade,
  movie_slug text not null,
  episode text,
  timestamp integer default 0,
  last_watched timestamptz default now(),
  unique(user_uid, movie_slug)
);

-- Bảng user_changes (đồng bộ delta)
create table if not exists public.user_changes (
  id uuid primary key default gen_random_uuid(),
  user_uid uuid not null references auth.users(id) on delete cascade,
  change_type text not null,
  item_key text not null,
  new_value jsonb,
  created_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.favorites enable row level security;
alter table public.watch_history enable row level security;
alter table public.user_changes enable row level security;

create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Users can manage own favorites" on public.favorites for all using (auth.uid() = user_uid);
create policy "Users can manage own watch_history" on public.watch_history for all using (auth.uid() = user_uid);
create policy "Users can read own user_changes" on public.user_changes for select using (auth.uid() = user_uid);

-- Trigger tạo profile khi đăng ký
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
