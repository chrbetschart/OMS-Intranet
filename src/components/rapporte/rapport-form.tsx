"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { formatCHF } from "@/lib/utils";
import type { Artikel, RapportMaterial, RapportTechniker } from "@/types/database";
import SignatureCanvas from "./signature-canvas";
import { Plus, Trash2, ChevronDown } from "lucide-react";

const AUFTRAGSTYPEN = ["Folgeauftrag", "Abgeschlossen", "Zusatzauftrag"] as const;

interface TechnikerRow {
  id: string;
  name: string;
  stunden: number;
  stundensatz: number;
}

interface MaterialRow {
  id: string;
  artikel_id: string | null;
  bezeichnung: string;
  menge: number;
  einheit: string;
  einzelpreis: number;
}

export function RapportForm() {
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  // Felder
  const [datum, setDatum] = useState(new Date().toISOString().slice(0, 10));
  const [projektNummer, setProjektNummer] = useState("");
  const [kundenname, setKundenname] = useState("");
  const [adresse, setAdresse] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [auftragstyp, setAuftragstyp] = useState<typeof AUFTRAGSTYPEN[number]>("Folgeauftrag");
  const [notizen, setNotizen] = useState("");
  const [fahrzeugpauschale, setFahrzeugpauschale] = useState(0);
  const [hilfsmittel, setHilfsmittel] = useState(0);

  const [techniker, setTechniker] = useState<TechnikerRow[]>([
    { id: crypto.randomUUID(), name: profile?.name || "", stunden: 0, stundensatz: 120 },
  ]);
  const [material, setMaterial] = useState<MaterialRow[]>([]);
  const [artikel, setArtikel] = useState<Artikel[]>([]);

  const [auftraggeberSig, setAuftraggeberSig] = useState<string | null>(null);
  const [technikerSig, setTechnikerSig] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("artikel").select("*").eq("aktiv", true).then(({ data }) => setArtikel(data || []));
  }, []);

  const totalArbeitsaufwand =
    techniker.reduce((s, t) => s + t.stunden * t.stundensatz, 0) +
    fahrzeugpauschale +
    hilfsmittel;
  const totalMaterial = material.reduce((s, m) => s + m.menge * m.einzelpreis, 0);
  const totalGesamt = totalArbeitsaufwand + totalMaterial;

  function addTechniker() {
    setTechniker([...techniker, { id: crypto.randomUUID(), name: "", stunden: 0, stundensatz: 120 }]);
  }

  function removeTechniker(id: string) {
    setTechniker(techniker.filter((t) => t.id !== id));
  }

  function updateTechniker(id: string, field: keyof TechnikerRow, value: string | number) {
    setTechniker(techniker.map((t) => t.id === id ? { ...t, [field]: value } : t));
  }

  function addMaterial() {
    setMaterial([...material, { id: crypto.randomUUID(), artikel_id: null, bezeichnung: "", menge: 1, einheit: "Stk.", einzelpreis: 0 }]);
  }

  function removeMaterial(id: string) {
    setMaterial(material.filter((m) => m.id !== id));
  }

  function updateMaterial(id: string, field: keyof MaterialRow, value: string | number | null) {
    setMaterial(material.map((m) => {
      if (m.id !== id) return m;
      if (field === "artikel_id" && value) {
        const a = artikel.find((a) => a.id === value);
        if (a) return { ...m, artikel_id: String(value), bezeichnung: a.name, einheit: a.einheit, einzelpreis: a.verkaufspreis };
      }
      return { ...m, [field]: value };
    }));
  }

  async function handleSave() {
    if (!kundenname) return alert("Kundenname ist erforderlich.");
    setSaving(true);

    const rapportNummer = `R-${Date.now()}`.slice(0, 12);

    const { data: rapport, error } = await supabase
      .from("rapporte")
      .insert({
        rapport_nummer: rapportNummer,
        datum,
        projekt_nummer: projektNummer,
        kundenname,
        adresse,
        email,
        telefon,
        auftragstyp,
        notizen,
        fahrzeugpauschale,
        hilfsmittel,
        total_arbeitsaufwand: totalArbeitsaufwand,
        total_material: totalMaterial,
        total_gesamt: totalGesamt,
        auftraggeber_unterschrift: auftraggeberSig,
        techniker_unterschrift: technikerSig,
        erstellt_von: profile!.id,
        abgeschlossen: auftragstyp === "Abgeschlossen",
      })
      .select()
      .single();

    if (error || !rapport) {
      alert("Fehler beim Speichern: " + error?.message);
      setSaving(false);
      return;
    }

    // Techniker
    await supabase.from("rapport_techniker").insert(
      techniker.map((t) => ({
        rapport_id: rapport.id,
        techniker_name: t.name,
        stunden: t.stunden,
        stundensatz: t.stundensatz,
        total: t.stunden * t.stundensatz,
      }))
    );

    // Material
    if (material.length > 0) {
      await supabase.from("rapport_material").insert(
        material.map((m) => ({
          rapport_id: rapport.id,
          artikel_id: m.artikel_id,
          bezeichnung: m.bezeichnung,
          menge: m.menge,
          einheit: m.einheit,
          einzelpreis: m.einzelpreis,
          total: m.menge * m.einzelpreis,
        }))
      );

      // Lagerbestand abbuchen
      for (const m of material.filter((m) => m.artikel_id)) {
        await supabase.rpc("decrement_bestand", {
          p_artikel_id: m.artikel_id,
          p_menge: m.menge,
        });
      }
    }

    router.push(`/rapporte/${rapport.id}`);
  }

  return (
    <div className="space-y-6">
      {/* Stammdaten */}
      <Section title="Stammdaten">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Datum">
            <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Projektnummer">
            <input value={projektNummer} onChange={(e) => setProjektNummer(e.target.value)} className={inputCls} style={inputStyle} placeholder="z.B. P-2024-001" />
          </Field>
          <Field label="Kundenname *">
            <input value={kundenname} onChange={(e) => setKundenname(e.target.value)} className={inputCls} style={inputStyle} placeholder="Firma oder Person" />
          </Field>
          <Field label="Adresse">
            <input value={adresse} onChange={(e) => setAdresse(e.target.value)} className={inputCls} style={inputStyle} placeholder="Strasse, PLZ Ort" />
          </Field>
          <Field label="E-Mail">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} style={inputStyle} placeholder="kunde@beispiel.ch" />
          </Field>
          <Field label="Telefon">
            <input value={telefon} onChange={(e) => setTelefon(e.target.value)} className={inputCls} style={inputStyle} placeholder="+41 00 000 00 00" />
          </Field>
          <Field label="Auftragstyp">
            <select value={auftragstyp} onChange={(e) => setAuftragstyp(e.target.value as typeof auftragstyp)} className={inputCls} style={inputStyle}>
              {AUFTRAGSTYPEN.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Notizen / Durchgeführte Arbeiten">
          <textarea
            value={notizen}
            onChange={(e) => setNotizen(e.target.value)}
            rows={4}
            className={inputCls}
            style={inputStyle}
            placeholder="Beschreibung der durchgeführten Arbeiten..."
          />
        </Field>
      </Section>

      {/* Arbeitsaufwand */}
      <Section title="Arbeitsaufwand">
        <div className="space-y-2">
          {techniker.map((t) => (
            <div key={t.id} className="flex gap-2 items-end">
              <Field label="Techniker" className="flex-1">
                <input value={t.name} onChange={(e) => updateTechniker(t.id, "name", e.target.value)} className={inputCls} style={inputStyle} placeholder="Name" />
              </Field>
              <Field label="Stunden">
                <input type="number" min={0} step={0.5} value={t.stunden} onChange={(e) => updateTechniker(t.id, "stunden", parseFloat(e.target.value) || 0)} className={inputCls} style={{ ...inputStyle, width: "80px" }} />
              </Field>
              <Field label="Satz (CHF/h)">
                <input type="number" min={0} value={t.stundensatz} onChange={(e) => updateTechniker(t.id, "stundensatz", parseFloat(e.target.value) || 0)} className={inputCls} style={{ ...inputStyle, width: "100px" }} />
              </Field>
              <div className="pb-0.5">
                <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{formatCHF(t.stunden * t.stundensatz)}</span>
              </div>
              {techniker.length > 1 && (
                <button onClick={() => removeTechniker(t.id)} className="pb-0.5" style={{ color: "var(--destructive)" }}>
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button onClick={addTechniker} className="flex items-center gap-1.5 text-xs mt-2" style={{ color: "var(--primary)" }}>
          <Plus size={14} /> Techniker hinzufügen
        </button>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <Field label="Fahrzeugpauschale (CHF)">
            <input type="number" min={0} value={fahrzeugpauschale} onChange={(e) => setFahrzeugpauschale(parseFloat(e.target.value) || 0)} className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Hilfsmittel (CHF)">
            <input type="number" min={0} value={hilfsmittel} onChange={(e) => setHilfsmittel(parseFloat(e.target.value) || 0)} className={inputCls} style={inputStyle} />
          </Field>
        </div>
      </Section>

      {/* Material */}
      <Section title="Materialliste">
        {material.length > 0 && (
          <div className="space-y-2 mb-2">
            {material.map((m) => (
              <div key={m.id} className="flex gap-2 items-end flex-wrap">
                <Field label="Artikel / Bezeichnung" className="flex-1 min-w-[160px]">
                  <select
                    value={m.artikel_id || ""}
                    onChange={(e) => updateMaterial(m.id, "artikel_id", e.target.value || null)}
                    className={inputCls}
                    style={inputStyle}
                  >
                    <option value="">Manuell eingeben</option>
                    {artikel.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </Field>
                {!m.artikel_id && (
                  <Field label="Bezeichnung">
                    <input value={m.bezeichnung} onChange={(e) => updateMaterial(m.id, "bezeichnung", e.target.value)} className={inputCls} style={{ ...inputStyle, width: "160px" }} placeholder="z.B. HDMI Kabel" />
                  </Field>
                )}
                <Field label="Menge">
                  <input type="number" min={0} step={0.1} value={m.menge} onChange={(e) => updateMaterial(m.id, "menge", parseFloat(e.target.value) || 0)} className={inputCls} style={{ ...inputStyle, width: "70px" }} />
                </Field>
                <Field label="Einheit">
                  <input value={m.einheit} onChange={(e) => updateMaterial(m.id, "einheit", e.target.value)} className={inputCls} style={{ ...inputStyle, width: "70px" }} />
                </Field>
                <Field label="EP (CHF)">
                  <input type="number" min={0} step={0.01} value={m.einzelpreis} onChange={(e) => updateMaterial(m.id, "einzelpreis", parseFloat(e.target.value) || 0)} className={inputCls} style={{ ...inputStyle, width: "90px" }} />
                </Field>
                <div className="pb-0.5">
                  <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{formatCHF(m.menge * m.einzelpreis)}</span>
                </div>
                <button onClick={() => removeMaterial(m.id)} className="pb-0.5" style={{ color: "var(--destructive)" }}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
        <button onClick={addMaterial} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--primary)" }}>
          <Plus size={14} /> Position hinzufügen
        </button>
      </Section>

      {/* Kostenübersicht */}
      <Section title="Kostenübersicht">
        <div className="space-y-2">
          <CostRow label="Arbeitsaufwand (inkl. Fahrzeug/Hilfsmittel)" value={totalArbeitsaufwand} />
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
            <SignatureCanvas onSave={setAuftraggeberSig} />
          </div>
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: "var(--muted-foreground)" }}>Techniker</p>
            <SignatureCanvas onSave={setTechnikerSig} />
          </div>
        </div>
      </Section>

      {/* Speichern */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded-lg text-sm"
          style={{ background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}
        >
          Abbrechen
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          style={{ background: "var(--primary)", color: "white" }}
        >
          {saving ? "Wird gespeichert..." : "Rapport speichern"}
        </button>
      </div>
    </div>
  );
}

// --- Sub-components ---

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--foreground)" }}>{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
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

const inputCls = "w-full px-3 py-2 rounded-lg text-sm outline-none";
const inputStyle = {
  background: "var(--input)",
  border: "1px solid var(--border)",
  color: "var(--foreground)",
};
