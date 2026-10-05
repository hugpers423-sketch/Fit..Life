-- NutriFlow · esquema MVP de usuario
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  sexo text not null check (sexo in ('m','f')),
  edad int not null check (edad between 14 and 100),
  altura_cm numeric not null check (altura_cm between 100 and 230),
  peso_kg numeric not null check (peso_kg between 30 and 300),
  peso_objetivo_kg numeric,
  actividad text not null default 'ligera' check (actividad in ('sedentaria','ligera','moderada','alta')),
  objetivo text not null default 'mantener' check (objetivo in ('perder','mantener','ganar')),
  kcal_meta int not null,
  prot_meta int not null,
  carb_meta int not null,
  grasa_meta int not null,
  created_at timestamptz not null default now()
);

create table public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fecha date not null,
  tipo text not null check (tipo in ('desayuno','almuerzo','cena','snack')),
  nombre text not null,
  kcal int not null check (kcal >= 0),
  proteina_g numeric not null default 0,
  carbs_g numeric not null default 0,
  grasa_g numeric not null default 0,
  created_at timestamptz not null default now()
);
create index on public.meal_logs (user_id, fecha);

create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fecha date not null,
  nombre text not null,
  minutos int not null check (minutos > 0),
  kcal_quemadas int not null default 0 check (kcal_quemadas >= 0),
  created_at timestamptz not null default now()
);
create index on public.workout_logs (user_id, fecha);

create table public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fecha date not null,
  peso_kg numeric not null check (peso_kg between 30 and 300),
  unique (user_id, fecha)
);

alter table public.profiles enable row level security;
alter table public.meal_logs enable row level security;
alter table public.workout_logs enable row level security;
alter table public.weight_logs enable row level security;

create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own meals" on public.meal_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own workouts" on public.workout_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own weights" on public.weight_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
