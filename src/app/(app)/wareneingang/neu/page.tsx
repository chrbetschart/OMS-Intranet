"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import type { Artikel, WareneingangVorlage, PositionStatus } from "@/types/database";
import { ArrowLeft, Plus, Trash2, Download } from "lucide-react";
import Link from "next/link";

interface Position {
  id: string;
  artikel_id: string | null;
  bezeichnung: string;
  lieferant: string;
  bestellt: number;
  erhalten: number;
  einheit: string;
  status: PositionStatus;
  notiz: string;
}

export default function NeuerWareneingangPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [projekt, setProjekt] = useState("");
  const [lieferscheinNr, setLieferscheinNr] = useState("");
  const [datum, setDatum] = useState(new Date().toISOString().slice(0, 10));
  const [notizen, setNotizen] = useState("");
  const [positionen, setPositionen] = useState<Position[]>([]);
  const [artikel, setArtikel] = useState<Artikel[]>([]);
  const [vorlagen, setVorlagen] = useState<WareneingangVorlage[]>([]);
  const [vorlagenName, setVorlagenName] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("artikel").select("*").eq("aktiv", true).order("name"),
      supabase.from("wareneingang_vorlagen").select("*").order("name"),
    ]).then(([{ data: a }, { data: v }]) => {
      setArtikel(a || []);
      setVorlagen(v || []);
    });
  }, []);

  function addPosition() {
    setPositionen([...positionen, { id: crypto.randomUUID(), artikel_id: null, bezeichnung: "", lieferant: "", bestellt: 1, erhalten: 0, einheit: "Stk.", status: "Fehlt", notiz: "" }]);
  }

  function removePosition(id: string) {
    setPositionen(positionen.filter((p) => p.id !== id));
  }

  function updatePosition(id: string, field: keyof Position, value: string | number | null) {
    setPositionen(positionen.map((p) => {
      if (p.id !== id) return p;
      if (field === "artikel_id" && value) {
        const a = artikel.find((a) => a.id === value);
        if (a) return { ...p, artikel_id: String(value), bezeichnung: a.name, einheit: a.einheit };
      }
      if (field === "erhalten") {
        const erhalten = Number(value);
        const status: PositionStatus = erhalten === 0 ? "Fehlt" : erhalten < p.bestellt ? "Teilweise" : "Erhalten";
        return { ...p, erhalten, status };
      }
      return { ...p, [field]: value };
    }));
  }

  function parseAndAddFromPaste() {
    const lines = pasteText.trim().split("\n").filter((l) => l.trim());
    const newPos: Position[] = lines.map((line) => {
      const parts = line.split(/\t|;|,/).map((p) => p.trim());
      return {
        id: crypto.randomUUID(),
        artikel_id: null,
        bezeichnung: parts[0] || "Unbekannt",
        lieferant: parts[3] || "",
        bestellt: parseFloat(parts[1]) || 1,
        erhalten: 0,
        einheit: parts[2] || "Stk.",
        status: "Fehlt" as PositionStatus,
        notiz: "",
      };
    });
    setPositionen([...positionen, ...newPos]);
    setPasteText("");
    setShowPaste(false);
  }

  function loadVorlage(vorlage: WareneingangVorlage) {
    const newPos: Position[] = vorlage.positionen.map((p) => ({
      id: crypto.randomUUID(),
      artikel_id: null,
      bezeichnung: p.bezeichnung,
      lieferant: "",
      bestellt: 1,
      erhalten: 0,
      einheit: p.einheit,
      status: "Fehlt" as PositionStatus,
      notiz: "",
    }));
    setPositionen([...positionen, ...newPos]);
  }

  function berechneGesamtstatus(): "Ausstehend" | "Vollständig" | "Teilweise" | "Problem" {
    if (positionen.length === 0) return "Ausstehend";
    if (positionen.every((p) => p.status === "Erhalten")) return "Vollständig";
    if (positionen.some((p) => p.status === "Beschädigt")) return "Problem";
    if (positionen.some((p) => p.status === "Erhalten" || p.status === "Teilweise")) return "Teilweise";
    return "Ausstehend";
  }

  async function handleSave() {
    setSaving(true);

    const eingangsNummer = `WE-${Date.now()}`.slice(0, 13);
    const status = berechneGesamtstatus();
    // Derive lieferant from positions (join unique suppliers)
    const lieferantenListe = [...new Set(positionen.map((p) => p.lieferant).filter(Boolean))].join(", ") || "Diverse";

    const { data: we } = await supabase.from("wareneingaenge").insert({
      eingangs_nummer: eingangsNummer,
      projekt,
      lieferant: lieferantenListe,
      lieferschein_nummer: lieferscheinNr,
      datum,
      status,
      notizen: notizen || null,
      erstellt_von: profile!.id,
    }).select().single();

    if (we && positionen.length > 0) {
      await supabase.from("wareneingang_positionen").insert(
        positionen.map((p) => ({
          wareneingang_id: we.id,
          artikel_id: p.artikel_id,
          bezeichnung: p.bezeichnung,
          lieferant: p.lieferant || "",
          bestellt: p.bestellt,
          erhalten: p.erhalten,
          einheit: p.einheit,
          status: p.status,
          notiz: p.notiz || null,
        }))
      );

      // Lagerbestand erhöhen für erhaltene Artikel
      for (const p of positionen.filter((p) => p.artikel_id && p.erhalten > 0)) {
        await supabase.rpc("increment_bestand", {
          p_artikel_id: p.artikel_id,
          p_menge: p.erhalten,
        });
      }
    }

    // Vorlage speichern?
    if (vorlagenName && positionen.length > 0) {
      await supabase.from("wareneingang_vorlagen").insert({
        name: vorlagenName,
        positionen: positionen.map((p) => ({ bezeichnung: p.bezeichnung, einheit: p.einheit })),
        erstellt_von: profile!.id,
      });
    }

    router.push(`/wareneingang/${we?.id}`);
    setSaving(false);
  }

  const ic = "w-full px-3 py-2 rounded-lg text-sm outline-none";
  const is = { background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" };
  const lc = "block text-xs font-medium mb-1";

  const STATUS_OPTIONS: PositionStatus[] = ["Erhalten", "Teilweise", "Fehlt", "Beschädigt"];

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/wareneingang" className="flex items-center gap-1.5 text-sm" style={{ color: "var(--muted-foreground)" }}>
          <ArrowLeft size={15} /> Zurück
        </Link>
        <span style={{ color: "var(--border)" }}>|</span>
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Neue Lieferung erfassen</h1>
      </div>

      <div className="space-y-5">
        <Card title="Lieferungsdaten">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lc} style={{ color: "var(--muted-foreground)" }}>Projekt / Bestellnummer</label>
              <input value={projekt} onChange={(e) => setProjekt(e.target.value)} className={ic} style={is} placeholder="z.B. P-2024-001" />
            </div>
            <div>
              <label className={lc} style={{ color: "var(--muted-foreground)" }}>Lieferschein-Nummer</label>
              <input value={lieferscheinNr} onChange={(e) => setLieferscheinNr(e.target.value)} className={ic} style={is} placeholder="LS-XXXXX" />
            </div>
            <div>
              <label className={lc} style={{ color: "var(--muted-foreground)" }}>Datum</label>
              <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} className={ic} style={is} />
            </div>
            <div className="col-span-2">
              <label className={lc} style={{ color: "var(--muted-foreground)" }}>Notizen</label>
              <textarea value={notizen} onChange={(e) => setNotizen(e.target.value)} rows={2} className={ic} style={is} />
            </div>
          </div>
        </Card>

        <Card title="Positionen">
          {/* Toolbar */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button onClick={addPosition} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg" style={{ background: "var(--primary)", color: "white" }}>
              <Plus size={13} /> Position hinzufügen
            </button>
            <button onClick={() => setShowPaste(!showPaste)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg" style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
              <Download size={13} /> Aus Zwischenablage importieren
            </button>
            {vorlagen.length > 0 && (
              <select
                onChange={(e) => { const v = vorlagen.find((v) => v.id === e.target.value); if (v) loadVorlage(v); e.target.value = ""; }}
                className="text-xs px-3 py-1.5 rounded-lg outline-none"
                style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              >
                <option value="">Vorlage laden...</option>
                {vorlagen.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            )}
          </div>

          {/* Paste import */}
          {showPaste && (
            <div className="mb-4 p-3 rounded-lg" style={{ background: "var(--input)", border: "1px solid var(--border)" }}>
              <p className="text-xs mb-2" style={{ color: "var(--muted-foreground)" }}>Zeilen aus Excel einfügen (Spalten: Bezeichnung, Menge, Einheit — getrennt durch Tab, Semikolon oder Komma)</p>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={4}
                className={ic}
                style={is}
                placeholder={"HDMI Kabel 4K\t10\tStk.\nHDBaseT Sender\t5\tStk."}
              />
              <button onClick={parseAndAddFromPaste} className="mt-2 px-3 py-1.5 rounded text-xs font-medium" style={{ background: "var(--primary)", color: "white" }}>
                Importieren
              </button>
            </div>
          )}

          {positionen.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--muted-foreground)" }}>Noch keine Positionen. Füge eine Position hinzu oder importiere aus Excel.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Artikel / Bezeichnung", "Lieferant", "Bestellt", "Erhalten", "Einheit", "Status", "Notiz", ""].map((h) => (
                      <th key={h} className="text-left pb-2 text-xs font-medium pr-2" style={{ color: "var(--muted-foreground)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {positionen.map((p) => {
                    const statusColor: Record<PositionStatus, string> = { Erhalten: "#22c55e", Teilweise: "#3b82f6", Fehlt: "#f59e0b", Beschädigt: "#ef4444" };
                    return (
                      <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td className="py-2 pr-2">
                          <select value={p.artikel_id || ""} onChange={(e) => updatePosition(p.id, "artikel_id", e.target.value || null)} className={ic} style={{ ...is, minWidth: "140px" }}>
                            <option value="">Manuell</option>
                            {artikel.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                          </select>
                          {!p.artikel_id && (
                            <input value={p.bezeichnung} onChange={(e) => updatePosition(p.id, "bezeichnung", e.target.value)} className={`${ic} mt-1`} style={is} placeholder="Bezeichnung" />
                          )}
                        </td>
                        <td className="py-2 pr-2">
                          <input value={p.lieferant} onChange={(e) => updatePosition(p.id, "lieferant", e.target.value)} className={ic} style={{ ...is, width: "110px" }} placeholder="Lieferant" />
                        </td>
                        <td className="py-2 pr-2">
                          <input type="number" min={0} value={p.bestellt} onChange={(e) => updatePosition(p.id, "bestellt", parseFloat(e.target.value) || 0)} className={ic} style={{ ...is, width: "70px" }} />
                        </td>
                        <td className="py-2 pr-2">
                          <input type="number" min={0} value={p.erhalten} onChange={(e) => updatePosition(p.id, "erhalten", parseFloat(e.target.value) || 0)} className={ic} style={{ ...is, width: "70px" }} />
                        </td>
                        <td className="py-2 pr-2">
                          <input value={p.einheit} onChange={(e) => updatePosition(p.id, "einheit", e.target.value)} className={ic} style={{ ...is, width: "60px" }} />
                        </td>
                        <td className="py-2 pr-2">
                          <select value={p.status} onChange={(e) => updatePosition(p.id, "status", e.target.value)} className={ic} style={{ ...is, color: statusColor[p.status], width: "110px" }}>
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="py-2 pr-2">
                          <input value={p.notiz} onChange={(e) => updatePosition(p.id, "notiz", e.target.value)} className={ic} style={{ ...is, width: "120px" }} placeholder="Notiz" />
                        </td>
                        <td className="py-2">
                          <button onClick={() => removePosition(p.id)} style={{ color: "var(--destructive)" }}><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {positionen.length > 0 && (
            <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="flex items-center gap-3">
                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>Vorlage speichern als:</span>
                <input value={vorlagenName} onChange={(e) => setVorlagenName(e.target.value)} className="px-2 py-1 rounded text-xs outline-none" style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)", width: "160px" }} placeholder="Vorlagenname" />
              </div>
              <div className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                Gesamtstatus: <span style={{ color: { Vollständig: "#22c55e", Teilweise: "#3b82f6", Problem: "#ef4444", Ausstehend: "#f59e0b" }[berechneGesamtstatus()] }}>{berechneGesamtstatus()}</span>
              </div>
            </div>
          )}
        </Card>

        <div className="flex justify-end gap-3">
          <button onClick={() => router.back()} className="px-4 py-2 rounded-lg text-sm" style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}>Abbrechen</button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 rounded-lg text-sm font-semibold disabled:opacity-50" style={{ background: "var(--primary)", color: "white" }}>
            {saving ? "Wird gespeichert..." : "Lieferung speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--foreground)" }}>{title}</h2>
      {children}
    </div>
  );
}
