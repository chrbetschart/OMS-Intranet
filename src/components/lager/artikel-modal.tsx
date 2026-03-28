"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Artikel, Kategorie } from "@/types/database";
import { X, Trash2 } from "lucide-react";

interface Props {
  artikel: Artikel | null;
  kategorien: Kategorie[];
  onClose: () => void;
  onSaved: () => void;
}

export function ArtikelModal({ artikel, kategorien, onClose, onSaved }: Props) {
  const supabase = createClient();
  const isEdit = !!artikel;

  const [name, setName] = useState(artikel?.name || "");
  const [typ, setTyp] = useState(artikel?.typ || "");
  const [marke, setMarke] = useState(artikel?.marke || "");
  const [artikelnummer, setArtikelnummer] = useState(artikel?.artikelnummer || "");
  const [kategorieId, setKategorieId] = useState(artikel?.kategorie_id || "");
  const [verkaufspreis, setVerkaufspreis] = useState(artikel?.verkaufspreis || 0);
  const [einkaufspreis, setEinkaufspreis] = useState(artikel?.einkaufspreis || 0);
  const [bestand, setBestand] = useState(artikel?.bestand || 0);
  const [mindestbestand, setMindestbestand] = useState(artikel?.mindestbestand || 0);
  const [einheit, setEinheit] = useState(artikel?.einheit || "Stk.");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name) return alert("Name ist erforderlich.");
    setSaving(true);

    const payload = {
      name, typ, marke, artikelnummer,
      kategorie_id: kategorieId || null,
      verkaufspreis, einkaufspreis, bestand, mindestbestand, einheit,
    };

    if (isEdit) {
      await supabase.from("artikel").update(payload).eq("id", artikel.id);
    } else {
      await supabase.from("artikel").insert({ ...payload, aktiv: true });
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  async function handleDelete() {
    if (!confirm("Artikel wirklich archivieren?")) return;
    await supabase.from("artikel").update({ aktiv: false }).eq("id", artikel!.id);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
            {isEdit ? "Artikel bearbeiten" : "Neuer Artikel"}
          </h2>
          <button onClick={onClose} style={{ color: "var(--muted-foreground)" }}><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name *" colSpan>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} style={inputStyle} placeholder="Produktname" />
            </Field>
            <Field label="Typ">
              <input value={typ} onChange={(e) => setTyp(e.target.value)} className={inputCls} style={inputStyle} placeholder="z.B. Kabel, Gerät" />
            </Field>
            <Field label="Marke">
              <input value={marke} onChange={(e) => setMarke(e.target.value)} className={inputCls} style={inputStyle} placeholder="Hersteller" />
            </Field>
            <Field label="Artikelnummer">
              <input value={artikelnummer} onChange={(e) => setArtikelnummer(e.target.value)} className={inputCls} style={inputStyle} placeholder="ART-001" />
            </Field>
            <Field label="Kategorie" colSpan>
              <select value={kategorieId} onChange={(e) => setKategorieId(e.target.value)} className={inputCls} style={inputStyle}>
                <option value="">Keine Kategorie</option>
                {kategorien.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </Field>
            <Field label="Verkaufspreis (CHF)">
              <input type="number" min={0} step={0.01} value={verkaufspreis} onChange={(e) => setVerkaufspreis(parseFloat(e.target.value) || 0)} className={inputCls} style={inputStyle} />
            </Field>
            <Field label="Einkaufspreis (CHF)">
              <input type="number" min={0} step={0.01} value={einkaufspreis} onChange={(e) => setEinkaufspreis(parseFloat(e.target.value) || 0)} className={inputCls} style={inputStyle} />
            </Field>
            <Field label="Bestand">
              <input type="number" min={0} value={bestand} onChange={(e) => setBestand(parseInt(e.target.value) || 0)} className={inputCls} style={inputStyle} />
            </Field>
            <Field label="Mindestbestand">
              <input type="number" min={0} value={mindestbestand} onChange={(e) => setMindestbestand(parseInt(e.target.value) || 0)} className={inputCls} style={inputStyle} />
            </Field>
            <Field label="Einheit">
              <input value={einheit} onChange={(e) => setEinheit(e.target.value)} className={inputCls} style={inputStyle} placeholder="Stk., m, kg..." />
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: "1px solid var(--border)" }}>
          {isEdit ? (
            <button onClick={handleDelete} className="flex items-center gap-1.5 text-sm" style={{ color: "var(--destructive)" }}>
              <Trash2 size={14} /> Archivieren
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
              Abbrechen
            </button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ background: "var(--primary)", color: "white" }}>
              {saving ? "Speichern..." : "Speichern"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, colSpan }: { label: string; children: React.ReactNode; colSpan?: boolean }) {
  return (
    <div className={colSpan ? "col-span-2" : ""}>
      <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 rounded-lg text-sm outline-none";
const inputStyle = { background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" };
