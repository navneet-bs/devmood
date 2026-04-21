-- devmood database schema
-- Run in the Supabase SQL editor (or via `supabase db push`).

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
    id          uuid primary key references auth.users(id) on delete cascade,
    username    text unique,
    avatar_url  text,
    timezone    text not null default 'UTC',
    created_at  timestamptz not null default now()
);

-- Reminder preferences — added in a later revision, so use add-column-if-missing
-- for safe re-runs on existing projects.
alter table public.profiles
    add column if not exists reminder_enabled    boolean not null default false,
    add column if not exists reminder_hour       smallint check (reminder_hour between 0 and 23),
    add column if not exists last_reminded_date  date;

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner"
    on public.profiles
    for select
    using (auth.uid() = id);

create policy "Users can insert their own profile"
    on public.profiles
    for insert
    with check (auth.uid() = id);

create policy "Users can update their own profile"
    on public.profiles
    for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

create policy "Users can delete their own profile"
    on public.profiles
    for delete
    using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- mood_logs
-- ---------------------------------------------------------------------------
create table if not exists public.mood_logs (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references public.profiles(id) on delete cascade,
    logged_at  timestamptz not null default now(),
    energy     int not null check (energy between 1 and 5),
    focus      int not null check (focus between 1 and 5),
    mood       int not null check (mood between 1 and 5),
    note       text,
    tags       text[] not null default '{}',
    created_at timestamptz not null default now()
);

create index if not exists mood_logs_user_logged_at_idx
    on public.mood_logs (user_id, logged_at desc);

alter table public.mood_logs enable row level security;

create policy "Mood logs are viewable by owner"
    on public.mood_logs
    for select
    using (auth.uid() = user_id);

create policy "Users can insert their own mood logs"
    on public.mood_logs
    for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own mood logs"
    on public.mood_logs
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete their own mood logs"
    on public.mood_logs
    for delete
    using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- streaks
-- ---------------------------------------------------------------------------
create table if not exists public.streaks (
    id                uuid primary key default gen_random_uuid(),
    user_id           uuid not null unique references public.profiles(id) on delete cascade,
    current_streak    int not null default 0,
    longest_streak    int not null default 0,
    last_logged_date  date,
    updated_at        timestamptz not null default now()
);

create index if not exists streaks_user_id_idx
    on public.streaks (user_id);

alter table public.streaks enable row level security;

create policy "Streaks are viewable by owner"
    on public.streaks
    for select
    using (auth.uid() = user_id);

create policy "Users can insert their own streak"
    on public.streaks
    for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own streak"
    on public.streaks
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete their own streak"
    on public.streaks
    for delete
    using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- triggers
-- ---------------------------------------------------------------------------

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, username)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- Keep streaks.updated_at current on every update.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists streaks_touch_updated_at on public.streaks;
create trigger streaks_touch_updated_at
    before update on public.streaks
    for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- account self-deletion
-- ---------------------------------------------------------------------------
-- Lets a signed-in user permanently delete their own auth row. Cascades
-- through profiles → mood_logs / streaks via FKs.
create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
    if auth.uid() is null then
        raise exception 'not authenticated';
    end if;
    delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_user() from public, anon;
grant execute on function public.delete_user() to authenticated;

-- ---------------------------------------------------------------------------
-- recaps (AI-generated weekly insights)
-- ---------------------------------------------------------------------------
create table if not exists public.recaps (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.profiles(id) on delete cascade,
    summary       text not null,
    insights      jsonb not null,
    log_count     int not null default 0,
    period_start  timestamptz,
    period_end    timestamptz,
    model         text,
    generated_at  timestamptz not null default now()
);

create index if not exists recaps_user_generated_at_idx
    on public.recaps (user_id, generated_at desc);

alter table public.recaps enable row level security;

create policy "Recaps are viewable by owner"
    on public.recaps
    for select
    using (auth.uid() = user_id);

create policy "Users can insert their own recaps"
    on public.recaps
    for insert
    with check (auth.uid() = user_id);

create policy "Users can delete their own recaps"
    on public.recaps
    for delete
    using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- github integration (OAuth tokens + daily stats for leaderboard)
-- ---------------------------------------------------------------------------

-- Token store. Sensitive — only the owner can select metadata; only the
-- service role (edge functions) can read/write the raw access_token.
create table if not exists public.github_tokens (
    user_id            uuid primary key references public.profiles(id) on delete cascade,
    access_token       text not null,
    scopes             text,
    github_user_id     bigint,
    github_username    text not null,
    github_avatar_url  text,
    connected_at       timestamptz not null default now(),
    last_synced_at     timestamptz,
    sync_error         text
);

alter table public.github_tokens enable row level security;

-- Users can read their own row (app uses this to show connection status),
-- but sensitive columns are filtered out on the client by selecting explicit
-- columns. The raw `access_token` is never fetched by the browser.
create policy "Users can view their own github connection"
    on public.github_tokens
    for select
    using (auth.uid() = user_id);

-- Users can disconnect (delete) their own row.
create policy "Users can disconnect their github connection"
    on public.github_tokens
    for delete
    using (auth.uid() = user_id);

-- No insert/update policies — only service-role edge functions write tokens.

-- Daily stats — readable by all authed users (leaderboard), writable only by
-- service role.
create table if not exists public.github_stats (
    id             uuid primary key default gen_random_uuid(),
    user_id        uuid not null references public.profiles(id) on delete cascade,
    date           date not null,
    merged_prs     int not null default 0,
    reviews_given  int not null default 0,
    repos_touched  int not null default 0,
    created_at     timestamptz not null default now(),
    unique (user_id, date)
);

create index if not exists github_stats_user_date_idx
    on public.github_stats (user_id, date desc);
create index if not exists github_stats_date_idx
    on public.github_stats (date desc);

alter table public.github_stats enable row level security;

-- Connected users opt in to the leaderboard by connecting. Anyone authed can
-- read the leaderboard stats; only the service role writes them.
create policy "Authenticated users can read github stats"
    on public.github_stats
    for select
    to authenticated
    using (true);

-- When a user disconnects, wipe their stats so they don't linger on the
-- leaderboard.
create or replace function public.cleanup_github_stats_on_disconnect()
returns trigger
language plpgsql
as $$
begin
    delete from public.github_stats where user_id = old.user_id;
    return old;
end;
$$;

drop trigger if exists cleanup_stats_on_token_delete on public.github_tokens;
create trigger cleanup_stats_on_token_delete
    before delete on public.github_tokens
    for each row execute function public.cleanup_github_stats_on_disconnect();

-- Public leaderboard display data (username + avatar only — never the
-- access_token). SECURITY DEFINER bypasses the per-owner RLS on
-- github_tokens so all authenticated users can render other people's
-- leaderboard rows.
create or replace function public.get_leaderboard_profiles()
returns table (
    user_id           uuid,
    github_username   text,
    github_avatar_url text
)
language sql
security definer
stable
set search_path = public
as $$
    select user_id, github_username, github_avatar_url
    from public.github_tokens;
$$;

revoke execute on function public.get_leaderboard_profiles() from public, anon;
grant execute on function public.get_leaderboard_profiles() to authenticated;
