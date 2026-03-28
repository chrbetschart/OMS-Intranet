export type UserRole = "techniker" | "lagerverwalter" | "administrator";
export type AuftragTyp = "Folgeauftrag" | "Abgeschlossen" | "Zusatzauftrag";
export type ReparaturTyp = "intern" | "extern";
export type ReparaturPrioritaet = "Normal" | "Dringend";
export type ReparaturStatus =
  | "Offen"
  | "In Bearbeitung"
  | "Warte auf Teile"
  | "Beim Lieferanten"
  | "Abgeschlossen";
export type WareneingangStatus =
  | "Ausstehend"
  | "Vollständig"
  | "Teilweise"
  | "Problem";
export type PositionStatus =
  | "Erhalten"
  | "Teilweise"
  | "Fehlt"
  | "Beschädigt";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      rapporte: {
        Row: Rapport;
        Insert: Omit<Rapport, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Rapport, "id" | "created_at">>;
      };
      rapport_techniker: {
        Row: RapportTechniker;
        Insert: Omit<RapportTechniker, "id">;
        Update: Partial<Omit<RapportTechniker, "id">>;
      };
      rapport_material: {
        Row: RapportMaterial;
        Insert: Omit<RapportMaterial, "id">;
        Update: Partial<Omit<RapportMaterial, "id">>;
      };
      artikel: {
        Row: Artikel;
        Insert: Omit<Artikel, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Artikel, "id" | "created_at">>;
      };
      kategorien: {
        Row: Kategorie;
        Insert: Omit<Kategorie, "id" | "created_at">;
        Update: Partial<Omit<Kategorie, "id" | "created_at">>;
      };
      reparaturen: {
        Row: Reparatur;
        Insert: Omit<Reparatur, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Reparatur, "id" | "created_at">>;
      };
      reparatur_verlauf: {
        Row: ReparaturVerlauf;
        Insert: Omit<ReparaturVerlauf, "id" | "created_at">;
        Update: never;
      };
      wareneingaenge: {
        Row: Wareneingang;
        Insert: Omit<Wareneingang, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Wareneingang, "id" | "created_at">>;
      };
      wareneingang_positionen: {
        Row: WareneingangPosition;
        Insert: Omit<WareneingangPosition, "id">;
        Update: Partial<Omit<WareneingangPosition, "id">>;
      };
      wareneingang_vorlagen: {
        Row: WareneingangVorlage;
        Insert: Omit<WareneingangVorlage, "id" | "created_at">;
        Update: Partial<Omit<WareneingangVorlage, "id" | "created_at">>;
      };
    };
  };
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  aktiv: boolean;
  created_at: string;
}

export interface Rapport {
  id: string;
  rapport_nummer: string;
  datum: string;
  projekt_nummer: string;
  kundenname: string;
  adresse: string;
  email: string;
  telefon: string;
  auftragstyp: AuftragTyp;
  notizen: string;
  fahrtzeit: number;
  fahrzeug_rayon_index: number | null;
  hilfsmittel_items: boolean[] | null;
  fahrzeugpauschale: number;
  hilfsmittel: number;
  total_arbeitsaufwand: number;
  total_material: number;
  total_gesamt: number;
  auftraggeber_unterschrift: string | null;
  techniker_unterschrift: string | null;
  erstellt_von: string;
  abgeschlossen: boolean;
  created_at: string;
  updated_at: string;
}

export interface RapportTechniker {
  id: string;
  rapport_id: string;
  techniker_name: string;
  stunden: number;
  stundensatz: number;
  total: number;
}

export interface RapportMaterial {
  id: string;
  rapport_id: string;
  artikel_id: string | null;
  bezeichnung: string;
  menge: number;
  einheit: string;
  einzelpreis: number;
  total: number;
}

export interface Artikel {
  id: string;
  name: string;
  typ: string;
  marke: string;
  artikelnummer: string;
  kategorie_id: string | null;
  verkaufspreis: number;
  einkaufspreis: number;
  bestand: number;
  mindestbestand: number;
  einheit: string;
  aktiv: boolean;
  created_at: string;
  updated_at: string;
}

export interface Kategorie {
  id: string;
  name: string;
  farbe: string;
  created_at: string;
}

export interface Reparatur {
  id: string;
  fall_nummer: string;
  geraet: string;
  fehler_beschreibung: string;
  typ: ReparaturTyp;
  prioritaet: ReparaturPrioritaet;
  status: ReparaturStatus;
  zustaendiger_id: string;
  artikel_id: string | null;
  lieferant: string | null;
  rma_nummer: string | null;
  tracking_nummer: string | null;
  reparaturkosten: number | null;
  notizen: string | null;
  erstellt_von: string;
  created_at: string;
  updated_at: string;
}

export interface ReparaturVerlauf {
  id: string;
  reparatur_id: string;
  status: ReparaturStatus;
  notiz: string;
  erstellt_von: string;
  created_at: string;
}

export interface Wareneingang {
  id: string;
  eingangs_nummer: string;
  projekt: string;
  lieferant: string;
  lieferschein_nummer: string;
  datum: string;
  status: WareneingangStatus;
  notizen: string | null;
  erstellt_von: string;
  created_at: string;
  updated_at: string;
}

export interface WareneingangPosition {
  id: string;
  wareneingang_id: string;
  artikel_id: string | null;
  bezeichnung: string;
  bestellt: number;
  erhalten: number;
  einheit: string;
  status: PositionStatus;
  notiz: string | null;
}

export interface WareneingangVorlage {
  id: string;
  name: string;
  positionen: Array<{
    bezeichnung: string;
    einheit: string;
  }>;
  erstellt_von: string;
  created_at: string;
}
