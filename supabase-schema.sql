-- ============================================================
-- OMS Intranet – Supabase Datenbankschema
-- Ausführen in: Supabase Dashboard > SQL Editor
-- ============================================================

-- Erweiterungen
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (Benutzer)
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null unique,
  name text not null,
  role text not null default 'techniker' check (role in ('techniker', 'lagerverwalter', 'administrator')),
  aktiv boolean not null default true,
  created_at timestamptz not null default now()
);

-- Trigger: Profil automatisch bei neuem Auth-User anlegen
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', new.email), 'techniker');
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- KATEGORIEN (Lager)
-- ============================================================
create table public.kategorien (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  farbe text not null default '#3b82f6',
  created_at timestamptz not null default now()
);

-- Standardkategorien
insert into public.kategorien (name, farbe) values
  ('Audio', '#8b5cf6'),
  ('Video', '#3b82f6'),
  ('Kabel', '#22c55e'),
  ('Netzwerk', '#06b6d4'),
  ('Werkzeug', '#f59e0b'),
  ('Sonstiges', '#64748b');

-- ============================================================
-- ARTIKEL (Lager)
-- ============================================================
create table public.artikel (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  typ text not null default '',
  marke text not null default '',
  artikelnummer text not null default '',
  kategorie_id uuid references public.kategorien on delete set null,
  verkaufspreis numeric(10,2) not null default 0,
  einkaufspreis numeric(10,2) not null default 0,
  bestand integer not null default 0,
  mindestbestand integer not null default 0,
  einheit text not null default 'Stk.',
  aktiv boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger: updated_at automatisch setzen
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger artikel_updated_at before update on public.artikel
  for each row execute procedure update_updated_at();

-- RPC: Bestand abbuchen (Rapport)
create or replace function decrement_bestand(p_artikel_id uuid, p_menge numeric)
returns void language plpgsql security definer as $$
begin
  update public.artikel
  set bestand = greatest(0, bestand - p_menge::integer)
  where id = p_artikel_id;
end;
$$;

-- RPC: Bestand erhöhen (Wareneingang)
create or replace function increment_bestand(p_artikel_id uuid, p_menge numeric)
returns void language plpgsql security definer as $$
begin
  update public.artikel
  set bestand = bestand + p_menge::integer
  where id = p_artikel_id;
end;
$$;

-- ============================================================
-- RAPPORTE
-- ============================================================
create table public.rapporte (
  id uuid primary key default uuid_generate_v4(),
  rapport_nummer text not null unique,
  datum date not null default current_date,
  projekt_nummer text not null default '',
  kundenname text not null,
  adresse text not null default '',
  email text not null default '',
  telefon text not null default '',
  auftragstyp text not null default 'Folgeauftrag'
    check (auftragstyp in ('Folgeauftrag', 'Abgeschlossen', 'Zusatzauftrag')),
  notizen text not null default '',
  fahrzeugpauschale numeric(10,2) not null default 0,
  hilfsmittel numeric(10,2) not null default 0,
  total_arbeitsaufwand numeric(10,2) not null default 0,
  total_material numeric(10,2) not null default 0,
  total_gesamt numeric(10,2) not null default 0,
  auftraggeber_unterschrift text,
  techniker_unterschrift text,
  erstellt_von uuid references public.profiles on delete set null,
  abgeschlossen boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger rapporte_updated_at before update on public.rapporte
  for each row execute procedure update_updated_at();

create table public.rapport_techniker (
  id uuid primary key default uuid_generate_v4(),
  rapport_id uuid references public.rapporte on delete cascade not null,
  techniker_name text not null,
  stunden numeric(8,2) not null default 0,
  stundensatz numeric(10,2) not null default 120,
  total numeric(10,2) not null default 0
);

create table public.rapport_material (
  id uuid primary key default uuid_generate_v4(),
  rapport_id uuid references public.rapporte on delete cascade not null,
  artikel_id uuid references public.artikel on delete set null,
  bezeichnung text not null,
  menge numeric(10,3) not null default 1,
  einheit text not null default 'Stk.',
  einzelpreis numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0
);

-- ============================================================
-- REPARATUREN
-- ============================================================
create table public.reparaturen (
  id uuid primary key default uuid_generate_v4(),
  fall_nummer text not null unique,
  geraet text not null,
  fehler_beschreibung text not null,
  typ text not null default 'intern' check (typ in ('intern', 'extern')),
  prioritaet text not null default 'Normal' check (prioritaet in ('Normal', 'Dringend')),
  status text not null default 'Offen'
    check (status in ('Offen', 'In Bearbeitung', 'Warte auf Teile', 'Beim Lieferanten', 'Abgeschlossen')),
  zustaendiger_id uuid references public.profiles on delete set null,
  artikel_id uuid references public.artikel on delete set null,
  lieferant text,
  rma_nummer text,
  tracking_nummer text,
  reparaturkosten numeric(10,2),
  notizen text,
  erstellt_von uuid references public.profiles on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger reparaturen_updated_at before update on public.reparaturen
  for each row execute procedure update_updated_at();

create table public.reparatur_verlauf (
  id uuid primary key default uuid_generate_v4(),
  reparatur_id uuid references public.reparaturen on delete cascade not null,
  status text not null,
  notiz text not null default '',
  erstellt_von uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- WARENEINGANG
-- ============================================================
create table public.wareneingaenge (
  id uuid primary key default uuid_generate_v4(),
  eingangs_nummer text not null unique,
  projekt text not null default '',
  lieferant text not null,
  lieferschein_nummer text not null default '',
  datum date not null default current_date,
  status text not null default 'Ausstehend'
    check (status in ('Ausstehend', 'Vollständig', 'Teilweise', 'Problem')),
  notizen text,
  erstellt_von uuid references public.profiles on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger wareneingaenge_updated_at before update on public.wareneingaenge
  for each row execute procedure update_updated_at();

create table public.wareneingang_positionen (
  id uuid primary key default uuid_generate_v4(),
  wareneingang_id uuid references public.wareneingaenge on delete cascade not null,
  artikel_id uuid references public.artikel on delete set null,
  bezeichnung text not null,
  bestellt numeric(10,3) not null default 1,
  erhalten numeric(10,3) not null default 0,
  einheit text not null default 'Stk.',
  status text not null default 'Fehlt'
    check (status in ('Erhalten', 'Teilweise', 'Fehlt', 'Beschädigt')),
  notiz text
);

create table public.wareneingang_vorlagen (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  positionen jsonb not null default '[]',
  erstellt_von uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Alle authentifizierten Benutzer können lesen/schreiben.
-- Admin-Schutz wird in der App-Logik gehandhabt.
-- ============================================================
alter table public.profiles enable row level security;
alter table public.kategorien enable row level security;
alter table public.artikel enable row level security;
alter table public.rapporte enable row level security;
alter table public.rapport_techniker enable row level security;
alter table public.rapport_material enable row level security;
alter table public.reparaturen enable row level security;
alter table public.reparatur_verlauf enable row level security;
alter table public.wareneingaenge enable row level security;
alter table public.wareneingang_positionen enable row level security;
alter table public.wareneingang_vorlagen enable row level security;

-- Policy: Authentifizierte Benutzer haben vollen Zugriff
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'profiles','kategorien','artikel','rapporte','rapport_techniker',
    'rapport_material','reparaturen','reparatur_verlauf',
    'wareneingaenge','wareneingang_positionen','wareneingang_vorlagen'
  ]
  loop
    execute format('create policy "auth_all_%s" on public.%I for all to authenticated using (true) with check (true)', tbl, tbl);
  end loop;
end $$;
