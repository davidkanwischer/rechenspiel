-- Im Supabase-Dashboard unter "SQL Editor" komplett einfügen und ausführen (kann mehrfach ausgeführt werden).
create table if not exists public.progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

drop policy if exists "eigenen Stand lesen" on public.progress;
create policy "eigenen Stand lesen" on public.progress
  for select using (auth.uid() = user_id);
drop policy if exists "eigenen Stand anlegen" on public.progress;
create policy "eigenen Stand anlegen" on public.progress
  for insert with check (auth.uid() = user_id);
drop policy if exists "eigenen Stand ändern" on public.progress;
create policy "eigenen Stand ändern" on public.progress
  for update using (auth.uid() = user_id);

-- ===== Freunde einladen =====
-- Danach ebenfalls im SQL Editor ausführen (kann mehrfach ausgeführt werden).

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  invite_code text unique not null,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "eigenes Profil lesen" on public.profiles;
create policy "eigenes Profil lesen" on public.profiles for select using (auth.uid() = user_id);

create table if not exists public.referrals (
  invitee uuid primary key references auth.users (id) on delete cascade,
  inviter uuid not null references auth.users (id) on delete cascade,
  qualified boolean not null default false, -- Freund hat Stufe 3 erreicht
  claimed boolean not null default false,   -- Einladender hat seine XP abgeholt
  created_at timestamptz not null default now()
);
alter table public.referrals enable row level security;
drop policy if exists "eigene Einladungen lesen" on public.referrals;
create policy "eigene Einladungen lesen" on public.referrals
  for select using (auth.uid() = inviter or auth.uid() = invitee);

-- Eigenen Einladungscode holen (wird beim ersten Mal erzeugt)
create or replace function public.my_invite_code() returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if auth.uid() is null then raise exception 'nicht angemeldet'; end if;
  select invite_code into c from profiles where user_id = auth.uid();
  while c is null loop
    begin
      c := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
      insert into profiles (user_id, invite_code) values (auth.uid(), c);
    exception when unique_violation then
      c := null;
      select invite_code into c from profiles where user_id = auth.uid();
    end;
  end loop;
  return c;
end $$;

-- Einladung einlösen (nur neue Konten, nicht sich selbst, max. 10 pro Einladendem)
create or replace function public.redeem_invite(code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare inv uuid; n int; created timestamptz;
begin
  if auth.uid() is null then return false; end if;
  select user_id into inv from profiles where invite_code = upper(trim(code));
  if inv is null or inv = auth.uid() then return false; end if;
  if exists (select 1 from referrals where invitee = auth.uid()) then return false; end if;
  if exists (select 1 from referrals where inviter = auth.uid() and invitee = inv) then return false; end if;
  select created_at into created from auth.users where id = auth.uid();
  if created < now() - interval '7 days' then return false; end if;
  select count(*) into n from referrals where inviter = inv;
  if n >= 10 then return false; end if;
  insert into referrals (invitee, inviter) values (auth.uid(), inv);
  return true;
end $$;

-- Freund meldet: Stufe 3 erreicht (geprüft am gespeicherten Spielstand, 260 XP = Stufe 3)
create or replace function public.qualify_referral() returns boolean
language plpgsql security definer set search_path = public as $$
declare x int;
begin
  select coalesce((data ->> 'xp')::int, 0) into x from progress where user_id = auth.uid();
  if x is null or x < 260 then return false; end if;
  update referrals set qualified = true where invitee = auth.uid() and not qualified;
  return found;
end $$;

-- Einladender holt XP ab: liefert die Anzahl neu abgeholter Freunde
create or replace function public.claim_referrals() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with c as (
    update referrals set claimed = true
    where inviter = auth.uid() and qualified and not claimed
    returning 1
  ) select count(*) into n from c;
  return n;
end $$;

revoke execute on function public.my_invite_code(), public.redeem_invite(text), public.qualify_referral(), public.claim_referrals() from public, anon;
grant execute on function public.my_invite_code(), public.redeem_invite(text), public.qualify_referral(), public.claim_referrals() to authenticated;
