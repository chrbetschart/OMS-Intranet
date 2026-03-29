"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { formatCHF } from "@/lib/utils";
import type { Artikel } from "@/types/database";
import SignatureCanvas from "./signature-canvas";
import { ArtikelPicker } from "./artikel-picker";
import { Plus, Trash2 } from "lucide-react";

// ── Feste Mitarbeiterliste ──────────────────────────────────────────
const TECHNIKER_LISTE = [
  { rolle: "Systemintegrator / Telematiker HF",         name: "Samuel Furrer",       stundensatz: 148 },
  { rolle: "Systemintegrator / Telematiker HF",         name: "Michael Ruckstuhl",   stundensatz: 148 },
  { rolle: "Systemintegrator / Systemtechniker HF",     name: "Christian Betschart", stundensatz: 148 },
  { rolle: "Systemintegrator / Informatiktechniker HF", name: "Pirmin Albisser",     stundensatz: 165 },
  { rolle: "Installateur / Techniker",                  name: "Lukas Roschi",        stundensatz: 130 },
  { rolle: "Lehrling 4. Lehrjahr",                      name: "Andrin Studer",       stundensatz: 80  },
  { rolle: "Lehrling 1. Lehrjahr",                      name: "Stefan Nikolic",      stundensatz: 65  },
];

// ── Fahrzeugpauschalen ──────────────────────────────────────────────
const FAHRZEUG_RAYONS = [
  { label: "Rayon 1 (inkl. Reisezeit)", beschreibung: "Bis 20km retour",  preis: 65  },
  { label: "Rayon 2 (inkl. Reisezeit)", beschreibung: "Bis 40km retour",  preis: 95  },
  { label: "Rayon 3 (inkl. Reisezeit)", beschreibung: "Bis 60km retour",  preis: 135 },
  { label: "Rayon 4 (inkl. Reisezeit)", beschreibung: "Bis 90km retour",  preis: 180 },
  { label: "Rayon 5 (inkl. Reisezeit)", beschreibung: "Bis 180km retour", preis: 270 },
];

// ── Hilfsmittel ────────────────────────────────────────────────────
const HILFSMITTEL_LISTE = [
  { name: "Klein und Hilfsmaterial",       preis: 24.50 },
  { name: "Bohrmaterial / Montagematerial", preis: 24.50 },
  { name: "Servicenotebook mit Lizenzen",   preis: 35.00 },
  { name: "Messgerät mit Messlizenz",       preis: 35.00 },
];

const AUFTRAGSTYPEN = [
  { label: "Folgeauftrag",          value: "Folgeauftrag"  },
  { label: "Auftrag Abgeschlossen", value: "Abgeschlossen" },
  { label: "Zusatzauftrag",         value: "Zusatzauftrag" },
] as const;

interface TechnikerRow { aktiv: boolean; stunden: number; }
interface HilfsmittelRow { aktiv: boolean; }
interface MaterialRow {
  id: string;
  artikel_id: string | null;
  anz: number;
  typ: string;
  marke: string;
  beschreibung: string;
  einzelpreis: number;
}

interface RapportFormProps {
  editId?: string;
}

export function RapportForm({ editId }: RapportFormProps = {}) {
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  // Stammdaten
  const [datum, setDatum] = useState(new Date().toISOString().slice(0, 10));
  const [projektNummer, setProjektNummer] = useState("");
  const [kundenname, setKundenname] = useState("");
  const [adresse, setAdresse] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [auftragstyp, setAuftragstyp] = useState<"Folgeauftrag" | "Abgeschlossen" | "Zusatzauftrag">("Folgeauftrag");
  const [notizen, setNotizen] = useState("");

  // Techniker
  const [technikerRows, setTechnikerRows] = useState<TechnikerRow[]>(
    TECHNIKER_LISTE.map(() => ({ aktiv: false, stunden: 0 }))
  );

  // Fahrzeug + Fahrtzeit
  const [selectedRayon, setSelectedRayon] = useState<number | null>(null);
  const [fahrtzeit, setFahrtzeit] = useState<number>(0);

  // Hilfsmittel
  const [hilfsmittelRows, setHilfsmittelRows] = useState<HilfsmittelRow[]>(
    HILFSMITTEL_LISTE.map(() => ({ aktiv: false }))
  );

  // Material
  const [material, setMaterial] = useState<MaterialRow[]>([]);
  const [artikel, setArtikel] = useState<Artikel[]>([]);
  const [kategorien, setKategorien] = useState<import("@/types/database").Kategorie[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Unterschriften
  const [auftraggeberSig, setAuftraggeberSig] = useState<string | null>(null);
  const [technikerSig, setTechnikerSig] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editId);

  useEffect(() => {
    supabase.from("artikel").select("*").eq("aktiv", true).then(({ data }) => setArtikel(data || []));
    supabase.from("kategorien").select("*").order("name").then(({ data }) => setKategorien(data || []));
    if (editId) loadExisting();
  }, []);

  async function loadExisting() {
    const [{ data: r }, { data: t }, { data: m }] = await Promise.all([
      supabase.from("rapporte").select("*").eq("id", editId).single(),
      supabase.from("rapport_techniker").select("*").eq("rapport_id", editId),
      supabase.from("rapport_material").select("*").eq("rapport_id", editId),
    ]);
    if (!r) { setLoading(false); return; }

    setDatum(r.datum);
    setProjektNummer(r.projekt_nummer || "");
    setKundenname(r.kundenname);
    setAdresse(r.adresse || "");
    setEmail(r.email || "");
    setTelefon(r.telefon || "");
    setAuftragstyp(r.auftragstyp);
    setNotizen(r.notizen || "");
    setFahrtzeit(r.fahrtzeit || 0);
    setSelectedRayon(r.fahrzeug_rayon_index ?? null);
    if (r.auftraggeber_unterschrift) setAuftraggeberSig(r.auftraggeber_unterschrift);
    if (r.techniker_unterschrift) setTechnikerSig(r.techniker_unterschrift);

    if (r.hilfsmittel_items && Array.isArray(r.hilfsmittel_items)) {
      setHilfsmittelRows(HILFSMITTEL_LISTE.map((_, i) => ({ aktiv: !!(r.hilfsmittel_items as boolean[])[i] })));
    }

    if (t && t.length > 0) {
      setTechnikerRows(TECHNIKER_LISTE.map(tech => {
        const saved = t.find(row => row.techniker_name.includes(tech.name));
        return { aktiv: !!saved, stunden: saved ? Number(saved.stunden) : 0 };
      }));
    }

    if (m && m.length > 0) {
      setMaterial(m.map(row => {
        const parts = row.bezeichnung.split(" – ");
        return {
          id: row.id,
          artikel_id: row.artikel_id,
          anz: Number(row.menge),
          typ: row.einheit || "",
          marke: parts.length > 1 ? parts[0] : "",
          beschreibung: parts.length > 1 ? parts.slice(1).join(" – ") : row.bezeichnung,
          einzelpreis: Number(row.einzelpreis),
        };
      }));
    }

    setLoading(false);
  }

  // ── Berechnungen ─────────────────────────────────────────────────
  const totalArbeitsaufwand = technikerRows.reduce((s, row, i) =>
    row.aktiv ? s + row.stunden * TECHNIKER_LISTE[i].stundensatz : s, 0
  );
  const fahrzeugTotal = selectedRayon !== null ? FAHRZEUG_RAYONS[selectedRayon].preis : 0;
  const hilfsmittelTotal = hilfsmittelRows.reduce((s, row, i) =>
    row.aktiv ? s + HILFSMITTEL_LISTE[i].preis : s, 0
  );
  const totalMaterial = material.reduce((s, m) => s + m.anz * m.einzelpreis, 0);
  const totalGesamt = totalArbeitsaufwand + fahrzeugTotal + hilfsmittelTotal + totalMaterial;

  // ── Techniker helpers ────────────────────────────────────────────
  function toggleTechniker(i: number) {
    setTechnikerRows(rows => rows.map((r, idx) => idx === i ? { ...r, aktiv: !r.aktiv } : r));
  }
  function setStunden(i: number, val: number) {
    setTechnikerRows(rows => rows.map((r, idx) => idx === i ? { ...r, stunden: val } : r));
  }

  // ── Material helpers ─────────────────────────────────────────────
  function addMaterialFromArtikel(a: import("@/types/database").Artikel) {
    setMaterial([...material, { id: crypto.randomUUID(), artikel_id: a.id, anz: 1, typ: a.typ, marke: a.marke, beschreibung: a.name, einzelpreis: a.verkaufspreis }]);
    setPickerOpen(false);
  }
  function addMaterialManual() {
    setMaterial([...material, { id: crypto.randomUUID(), artikel_id: null, anz: 1, typ: "", marke: "", beschreibung: "", einzelpreis: 0 }]);
    setPickerOpen(false);
  }
  function addMaterial() {
    setPickerOpen(true);
  }
  function removeMaterial(id: string) {
    setMaterial(material.filter(m => m.id !== id));
  }
  function updateMaterial(id: string, field: keyof MaterialRow, value: string | number | null) {
    setMaterial(material.map(m => {
      if (m.id !== id) return m;
      if (field === "artikel_id" && value) {
        const a = artikel.find(a => a.id === value);
        if (a) return { ...m, artikel_id: String(value), marke: a.marke, beschreibung: a.name, typ: a.typ, einzelpreis: a.verkaufspreis };
      }
      return { ...m, [field]: value };
    }));
  }

  // ── Speichern ────────────────────────────────────────────────────
  async function handleSave() {
    if (!kundenname) return alert("Kundenname ist erforderlich.");
    setSaving(true);

    const payload = {
      datum,
      projekt_nummer: projektNummer,
      kundenname,
      adresse,
      email,
      telefon,
      auftragstyp,
      notizen,
      fahrtzeit,
      fahrzeug_rayon_index: selectedRayon,
      hilfsmittel_items: hilfsmittelRows.map(r => r.aktiv),
      fahrzeugpauschale: fahrzeugTotal,
      hilfsmittel: hilfsmittelTotal,
      total_arbeitsaufwand: totalArbeitsaufwand + fahrzeugTotal + hilfsmittelTotal,
      total_material: totalMaterial,
      total_gesamt: totalGesamt,
      auftraggeber_unterschrift: auftraggeberSig,
      techniker_unterschrift: technikerSig,
      abgeschlossen: auftragstyp === "Abgeschlossen",
    };

    let rapportId: string;

    if (editId) {
      const { error } = await supabase.from("rapporte").update(payload).eq("id", editId);
      if (error) { alert("Fehler beim Speichern: " + error.message); setSaving(false); return; }
      rapportId = editId;
      await Promise.all([
        supabase.from("rapport_techniker").delete().eq("rapport_id", editId),
        supabase.from("rapport_material").delete().eq("rapport_id", editId),
      ]);
    } else {
      const rapportNummer = `R-${Date.now()}`.slice(0, 12);
      const { data: rapport, error } = await supabase.from("rapporte").insert({
        ...payload,
        rapport_nummer: rapportNummer,
        erstellt_von: profile!.id,
      }).select().single();
      if (error || !rapport) { alert("Fehler beim Speichern: " + error?.message); setSaving(false); return; }
      rapportId = rapport.id;
    }

    // Techniker speichern
    const aktiveTechniker = technikerRows
      .map((r, i) => ({ ...r, ...TECHNIKER_LISTE[i] }))
      .filter(r => r.aktiv && r.stunden > 0);
    if (aktiveTechniker.length > 0) {
      await supabase.from("rapport_techniker").insert(
        aktiveTechniker.map(t => ({
          rapport_id: rapportId,
          techniker_name: `${t.rolle} – ${t.name}`,
          stunden: t.stunden,
          stundensatz: t.stundensatz,
          total: t.stunden * t.stundensatz,
        }))
      );
    }

    // Material speichern
    if (material.length > 0) {
      await supabase.from("rapport_material").insert(
        material.map(m => ({
          rapport_id: rapportId,
          artikel_id: m.artikel_id,
          bezeichnung: [m.marke, m.beschreibung].filter(Boolean).join(" – "),
          menge: m.anz,
          einheit: m.typ,
          einzelpreis: m.einzelpreis,
          total: m.anz * m.einzelpreis,
        }))
      );
      // Bestand nur bei Neuanlage abbuchen
      if (!editId) {
        for (const m of material.filter(m => m.artikel_id)) {
          await supabase.rpc("decrement_bestand", { p_artikel_id: m.artikel_id, p_menge: m.anz });
        }
      }
    }

    router.push(`/rapporte/${rapportId}`);
  }

  if (loading) {
    return <div className="p-12 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>Wird geladen...</div>;
  }

  return (
    <div className="space-y-5">
      {/* Stammdaten */}
      <Section title="Stammdaten">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Datum">
            <input type="date" value={datum} onChange={e => setDatum(e.target.value)} className={ic} style={is} />
          </Field>
          <Field label="Service / Projektnummer">
            <input value={projektNummer} onChange={e => setProjektNummer(e.target.value)} className={ic} style={is} placeholder="z.B. P-2024-001" />
          </Field>
          <Field label="Kundenname *">
            <input value={kundenname} onChange={e => setKundenname(e.target.value)} className={ic} style={is} placeholder="Firma oder Person" />
          </Field>
          <Field label="Adresse / PLZ">
            <input value={adresse} onChange={e => setAdresse(e.target.value)} className={ic} style={is} placeholder="Strasse, PLZ Ort" />
          </Field>
          <Field label="Mail">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={ic} style={is} placeholder="kunde@beispiel.ch" />
          </Field>
          <Field label="Telefonnummer">
            <input value={telefon} onChange={e => setTelefon(e.target.value)} className={ic} style={is} placeholder="+41 00 000 00 00" />
          </Field>
        </div>

        {/* Auftragstyp */}
        <div className="mt-4">
          <label className="block text-xs font-medium mb-2" style={{ color: "var(--muted-foreground)" }}>Auftragstyp</label>
          <div className="flex gap-6 flex-wrap">
            {AUFTRAGSTYPEN.map(t => (
              <label key={t.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="auftragstyp"
                  value={t.value}
                  checked={auftragstyp === t.value}
                  onChange={() => setAuftragstyp(t.value as typeof auftragstyp)}
                  className="w-4 h-4 accent-blue-500"
                />
                <span className="text-sm" style={{ color: "var(--foreground)" }}>{t.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Notizen */}
        <div className="mt-4">
          <Field label="Notizen / Durchgeführte Arbeiten">
            <textarea value={notizen} onChange={e => setNotizen(e.target.value)} rows={4} className={ic} style={is} placeholder="Beschreibung der durchgeführten Arbeiten..." />
          </Field>
        </div>
      </Section>

      {/* Materialliste */}
      <Section title="Materialliste">
        {material.length > 0 && (
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Anz.", "Typ", "Marke", "Beschreibung", "EP (CHF)", ""].map(h => (
                    <th key={h} className="text-left pb-2 pr-3 text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {material.map(m => (
                  <tr key={m.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="py-2 pr-2">
                      <input type="number" min={1} value={m.anz} onChange={e => updateMaterial(m.id, "anz", parseInt(e.target.value) || 1)} className={ic} style={{ ...is, width: "60px" }} />
                    </td>
                    <td className="py-2 pr-2">
                      <input value={m.typ} onChange={e => updateMaterial(m.id, "typ", e.target.value)} className={ic} style={{ ...is, width: "90px" }} placeholder="Typ" />
                    </td>
                    <td className="py-2 pr-2">
                      <input value={m.marke} onChange={e => updateMaterial(m.id, "marke", e.target.value)} className={ic} style={{ ...is, width: "100px" }} placeholder="Marke" />
                    </td>
                    <td className="py-2 pr-2">
                      <div className="flex gap-1">
                        <select value={m.artikel_id || ""} onChange={e => updateMaterial(m.id, "artikel_id", e.target.value || null)} className={ic} style={{ ...is, width: "120px" }}>
                          <option value="">Manuell</option>
                          {artikel.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        {!m.artikel_id && (
                          <input value={m.beschreibung} onChange={e => updateMaterial(m.id, "beschreibung", e.target.value)} className={ic} style={{ ...is, minWidth: "120px" }} placeholder="Beschreibung" />
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-2">
                      <input type="number" min={0} step={0.01} value={m.einzelpreis} onChange={e => updateMaterial(m.id, "einzelpreis", parseFloat(e.target.value) || 0)} className={ic} style={{ ...is, width: "80px" }} />
                    </td>
                    <td className="py-2">
                      <button onClick={() => removeMaterial(m.id)} style={{ color: "var(--destructive)" }}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button onClick={addMaterial} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--primary)" }}>
          <Plus size={14} /> Position hinzufügen
        </button>
      </Section>

      {/* Arbeitsaufwand */}
      <Section title="Arbeitsaufwand">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="text-left pb-2 pr-3 text-xs font-medium w-8" style={{ color: "var(--muted-foreground)" }}></th>
                <th className="text-left pb-2 pr-3 text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Mitarbeiter</th>
                <th className="text-left pb-2 pr-3 text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Stundenansatz</th>
                <th className="text-left pb-2 pr-3 text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Anzahl Stunden</th>
                <th className="text-left pb-2 text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {TECHNIKER_LISTE.map((t, i) => (
                <tr key={t.name} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2 pr-3">
                    <input type="checkbox" checked={technikerRows[i].aktiv} onChange={() => toggleTechniker(i)} className="w-4 h-4 accent-blue-500" />
                  </td>
                  <td className="py-2 pr-3">
                    <div className="font-medium" style={{ color: "var(--foreground)" }}>{t.name}</div>
                    <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{t.rolle}</div>
                  </td>
                  <td className="py-2 pr-3" style={{ color: "var(--foreground)" }}>{formatCHF(t.stundensatz)}</td>
                  <td className="py-2 pr-3">
                    <input
                      type="number" min={0} step={0.5}
                      value={technikerRows[i].stunden}
                      onChange={e => setStunden(i, parseFloat(e.target.value) || 0)}
                      disabled={!technikerRows[i].aktiv}
                      className={ic}
                      style={{ ...is, width: "80px", opacity: technikerRows[i].aktiv ? 1 : 0.4 }}
                    />
                  </td>
                  <td className="py-2 font-medium" style={{ color: "var(--foreground)" }}>
                    {technikerRows[i].aktiv ? formatCHF(technikerRows[i].stunden * t.stundensatz) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Fahrzeugpauschale */}
        <div className="mt-5">
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>FAHRZEUGPAUSCHALE</p>
          <table className="w-full text-sm">
            <tbody>
              {FAHRZEUG_RAYONS.map((r, i) => (
                <tr key={r.label} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2 pr-3 w-8">
                    <input type="radio" name="rayon" checked={selectedRayon === i} onChange={() => setSelectedRayon(i)} className="w-4 h-4 accent-blue-500" />
                  </td>
                  <td className="py-2 pr-3" style={{ color: "var(--foreground)" }}>{r.label}</td>
                  <td className="py-2 pr-3 text-xs" style={{ color: "var(--muted-foreground)" }}>{r.beschreibung}</td>
                  <td className="py-2" style={{ color: "var(--foreground)" }}>{formatCHF(r.preis)}</td>
                </tr>
              ))}
              <tr>
                <td className="py-2 pr-3 w-8">
                  <input type="radio" name="rayon" checked={selectedRayon === null} onChange={() => setSelectedRayon(null)} className="w-4 h-4 accent-blue-500" />
                </td>
                <td className="py-2 text-xs" colSpan={3} style={{ color: "var(--muted-foreground)" }}>Keine Fahrzeugpauschale</td>
              </tr>
            </tbody>
          </table>

          {/* Fahrtzeit */}
          {selectedRayon !== null && (
            <div className="mt-3 flex items-center gap-3">
              <label className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>Fahrtzeit (Min.)</label>
              <input
                type="number"
                min={0}
                step={5}
                value={fahrtzeit}
                onChange={e => setFahrtzeit(parseInt(e.target.value) || 0)}
                className={ic}
                style={{ ...is, width: "100px" }}
                placeholder="0"
              />
            </div>
          )}
        </div>

        {/* Hilfsmittel */}
        <div className="mt-5">
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>HILFSMITTEL</p>
          <table className="w-full text-sm">
            <tbody>
              {HILFSMITTEL_LISTE.map((h, i) => (
                <tr key={h.name} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2 pr-3 w-8">
                    <input type="checkbox" checked={hilfsmittelRows[i].aktiv} onChange={() => setHilfsmittelRows(rows => rows.map((r, idx) => idx === i ? { aktiv: !r.aktiv } : r))} className="w-4 h-4 accent-blue-500" />
                  </td>
                  <td className="py-2 pr-3" style={{ color: "var(--foreground)" }}>{h.name}</td>
                  <td className="py-2 text-xs" style={{ color: "var(--muted-foreground)" }}>Hilfsmittel</td>
                  <td className="py-2" style={{ color: "var(--foreground)" }}>{formatCHF(h.preis)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Kostenübersicht */}
      <Section title="Kostenübersicht">
        <div className="space-y-2 max-w-sm ml-auto">
          <CostRow label="Arbeitsaufwand" value={totalArbeitsaufwand} />
          <CostRow label="Fahrzeugpauschale" value={fahrzeugTotal} />
          <CostRow label="Hilfsmittel" value={hilfsmittelTotal} />
          <CostRow label="Material" value={totalMaterial} />
          <div className="pt-2" style={{ borderTop: "1px solid var(--border)" }}>
            <CostRow label="Total (CHF)" value={totalGesamt} bold />
          </div>
        </div>
      </Section>

      {/* Unterschriften */}
      <Section title="Unterschriften">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: "var(--muted-foreground)" }}>Auftraggeber</p>
            <SignatureCanvas key={loading ? "load" : "ready-ag"} initialValue={auftraggeberSig} onSave={setAuftraggeberSig} />
          </div>
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: "var(--muted-foreground)" }}>Techniker</p>
            <SignatureCanvas key={loading ? "load" : "ready-tk"} initialValue={technikerSig} onSave={setTechnikerSig} />
          </div>
        </div>
      </Section>

      {/* Artikel Picker */}
      {pickerOpen && (
        <ArtikelPicker
          artikel={artikel}
          kategorien={kategorien}
          onSelect={addMaterialFromArtikel}
          onManual={addMaterialManual}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={() => router.back()} className="px-4 py-2 rounded-lg text-sm" style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}>
          Abbrechen
        </button>
        <button onClick={handleSave} disabled={saving} className="px-6 py-2 rounded-lg text-sm font-semibold disabled:opacity-50" style={{ background: "var(--primary)", color: "white" }}>
          {saving ? "Wird gespeichert..." : editId ? "Änderungen speichern" : "Rapport speichern"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--foreground)" }}>{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>{label}</label>
      {children}
    </div>
  );
}

function CostRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${bold ? "font-bold" : ""}`} style={{ color: bold ? "var(--foreground)" : "var(--muted-foreground)" }}>{label}</span>
      <span className={`text-sm ${bold ? "font-bold text-base" : ""}`} style={{ color: "var(--foreground)" }}>{formatCHF(value)}</span>
    </div>
  );
}

const ic = "w-full px-3 py-2 rounded-lg text-sm outline-none";
const is = { background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" };
