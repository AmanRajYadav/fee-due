-- Fluence fee tracker: tables.
--
-- Paste into the Supabase SQL Editor and press Run. Safe to run more than once.
--
-- There is no login. The app is a single-user personal tool and, by the
-- owner's choice, holds nothing private: no phone numbers, no parent details.
-- So the tables are open to the public (anon) key that ships in the app.
-- That also means anyone who has the app's address can change the data. To
-- lock it down later, replace the four "open" policies at the bottom with ones
-- that check auth.uid().

create table if not exists public.students (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  branch     text not null check (branch in ('Mangla', 'Sarkanda')),
  -- Day of the month the fee falls due. null = not decided yet, so no dues.
  due_day    int check (due_day between 1 and 31),
  -- Monthly fee in rupees. 0 = learns for free, so no dues.
  fee        int not null default 2500 check (fee >= 0),
  -- Dues before this date are not tracked.
  start_on   date not null default current_date,
  -- false = removed from the lists; past payments are kept.
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Dues are never stored. The app works them out from each student's due day;
-- only what was actually paid is saved here.
create table if not exists public.payments (
  id         uuid primary key default gen_random_uuid(),
  receipt_no bigint generated always as identity unique,
  student_id uuid not null references public.students (id) on delete restrict,
  -- 'YYYY-MM': the month the due date falls in.
  period     text not null check (period ~ '^\d{4}-\d{2}$'),
  amount     int not null check (amount > 0),
  paid_on    date not null default current_date,
  mode       text not null check (mode in ('cash', 'upi')),
  -- Copied from the due when it was paid, so later changes to the student's
  -- fee or due day never rewrite a month that is already paid.
  fee_due    int not null,
  due_date   date not null,
  covers_to  date not null,
  created_at timestamptz not null default now()
);
create index if not exists payments_student_idx on public.payments (student_id);

create table if not exists public.reminders (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  period     text not null check (period ~ '^\d{4}-\d{2}$'),
  -- 'image' = shared the fee-due image; 'manual' = logged by hand.
  kind       text not null check (kind in ('image', 'manual')),
  at         timestamptz not null default now()
);
create index if not exists reminders_student_idx on public.reminders (student_id);

-- One row only.
create table if not exists public.settings (
  id     int primary key default 1 check (id = 1),
  upi_id text not null default ''
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- Access -------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete
  on public.students, public.payments, public.reminders, public.settings
  to anon, authenticated;

alter table public.students  enable row level security;
alter table public.payments  enable row level security;
alter table public.reminders enable row level security;
alter table public.settings  enable row level security;

drop policy if exists "open" on public.students;
drop policy if exists "open" on public.payments;
drop policy if exists "open" on public.reminders;
drop policy if exists "open" on public.settings;

create policy "open" on public.students  for all to anon, authenticated using (true) with check (true);
create policy "open" on public.payments  for all to anon, authenticated using (true) with check (true);
create policy "open" on public.reminders for all to anon, authenticated using (true) with check (true);
create policy "open" on public.settings  for all to anon, authenticated using (true) with check (true);
