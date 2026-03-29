"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import type { Artikel, PositionStatus } from "@/types/database";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

interface Position {
  id: string;
  db_id?: string;
  artikel_id: string | null;
  bezeichnung: string;
  bestellt: number;
  erhalten: number;
  einheit: string;
  status: PositionStatus;
  notiz: string;
}

export default function WareneingangBearbeitenPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [projekt, setProjekt] = useState("");
  const [lieferant, setLieferant] = useState("");
  const [lieferscheinNr, setLieferscheinNr] = useState("");
  const [datum, setDatum] = useState("");
  const [notizen, setNotizen] = useState("");
  const [positionen, setPositionen] = useState<Position[]>([]);
  const [artikel, setArtikel] = useState<Artikel[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: w }, { data: p }, { data: a }] = await Promise.all([
        supabase.from("wareneingaenge").select("*").eq("id", id).single(),
        supabase.from("wareneingang_positionen").select("*").eq("wareneingang_id", id),
        supabase.from("artikel").select("*").eq("aktiv", true).order("name"),
      ]);
      if (w) {
        setProjekt(w.projekt || "");
        setLieferant(w.lieferant);
        setLieferscheinNr(w.lieferschein_nummer || "");
        setDatum(w.datum);
        setNotizen(w.notizen || "");
      }
      setPositionen((p || []).map((row) => ({
        id: crypto.randomUUID(),
        db_id: row.id,
        artikel_id: row.artikel_id,
        bezeichnung: row.bezeichnung,
        bestellt: Number(row.bestellt),
        erhalten: Number(row.erhalten),
        einheit: row.einheit,
        status: row.status,
        notiz: row.notiz || "",
      })));
      setArtikel(a || []);
      setLoading(false);
    }
    load();
  }, [id]);

  function addPosition() {
    setPositionen([...positionen, { id: crypto.randomUUID(), artikel_id: null, bezeichnung: "", bestellt: 1, erhalten: 0, einheit: "Stk.", status: "Fehlt", notiz: "" }]);
  }
  function removePosition(pid: string) {
    setPositionen(positionen.filter((p) => p.id !== pid));
  }
  function updatePosition(pid: string, field: keyof Position, value: string | number | null) {
    setPositionen(positionen.map((p) => {
      if (p.id !== pid) return p;
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

  function berechneGesamtstatus(): "Ausstehend" | "Vollständig" | "Teilweise" | "Problem" {
    if (positionen.length === 0) return "Ausstehend";
    if (positionen.every((p) => p.status === "Erhalten")) return "Vollständig";
    if (positionen.some((p) => p.status === "Beschädigt")) return "Problem";
    if (positionen.some((p) => p.status === "Erhalten" || p.status === "Teilweise")) return "Teilweise";
    return "Ausstehend";
  }

  async function handleSave() {
    if (!lieferant) return alert("Lieferant ist erforderlich.");
    setSaving(true);

    await supabase.from("wareneingaenge").update({
      projekt,
      lieferant,
      lieferschein_nummer: lieferscheinNr,
      datum,
      status: berechneGesamtstatus(),
      notizen: notizen || null,
    }).eq("id", id);

    // Delete all existing positions and re-insert
    await supabase.from("wareneingang_positionen").delete().eq("wareneingang_id", id);
    if (positionen.length > 0) {
      await supabase.from("wareneingang_positionen").insert(
        positionen.map((p) => ({
          wareneingang_id: id,
          artikel_id: p.artikel_id,
          bezeichnung: p.bezeichnung,
          bestellt: p.bestellt,
          erhalten: p.erhalten,
          einheit: p.einheit,
          status: p.status,
          notiz: p.notiz || null,
        }))
      );
    }

    router.push(`/wareneingang/${id}`);
    setSaving(false);
  }

  const ic = "w-full px-3 py-2 rounded-lg text-sm outline-none";
  const is = { background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" };
  const lc = "block text-xs font-medium mb-1" as const;
  const STATUS_OPTIONS: PositionStatus[] = ["Erhalten", "Teilweise", "Fehlt", "Beschädigt"];

  if (loading) return <div className="p-8 text-center" style={{ color: "var(--muted-foreground)" }}>Wird geladen...</div>;

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/wareneingang/${id}`} className="flex items-center gap-1.5 text-sm" style={{ color: "var(--muted-foreground)" }}>
          <ArrowLeft size={15} /> Zurück
        </Link>
        <span style={{ color: "var(--border)" }}>|</span>
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Lieferung bearbeiten</h1>
      </div>

      <div className="space-y-5">
        <Card title="Lieferungsdaten">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lc} style={{ color: "var(--muted-foreground)" }}>Projekt</label>
              <input value={projekt} onChange={(e) => setProjekt(e.target.value)} className={ic} style={is} />
            </div>
            <div>
              <label className={lc} style={{ color: "var(--muted-foreground)" }}>Lieferant *</label>
              <input value={lieferant} onChange={(e) => setLieferant(e.target.value)} className={ic} style={is} />
            </div>
            <div>
              <label className={lc} style={{ color: "var(--muted-foreground)" }}>Lieferschein-Nummer</label>
              <input value={lieferscheinNr} onChange={(e) => setLieferscheinNr(e.target.value)} className={ic} style={is} />
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
          <button onClick={addPosition} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg mb-4" style={{ background: "var(--primary)", color: "white" }}>
            <Plus size={13} /> Position hinzufügen
          </button>
          {positionen.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--muted-foreground)" }}>Keine Positionen</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Artikel / Bezeichnung", "Bestellt", "Erhalten", "Einheit", "Status", "Notiz", ""].map((h) => (
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
                        <td className="py-2 pr-2"><input type="number" min={0} value={p.bestellt} onChange={(e) => updatePosition(p.id, "bestellt", parseFloat(e.target.value) || 0)} className={ic} style={{ ...is, width: "70px" }} /></td>
                        <td className="py-2 pr-2"><input type="number" min={0} value={p.erhalten} onChange={(e) => updatePosition(p.id, "erhalten", parseFloat(e.target.value) || 0)} className={ic} style={{ ...is, width: "70px" }} /></td>
                        <td className="py-2 pr-2"><input value={p.einheit} onChange={(e) => updatePosition(p.id, "einheit", e.target.value)} className={ic} style={{ ...is, width: "60px" }} /></td>
                        <td className="py-2 pr-2">
                          <select value={p.status} onChange={(e) => updatePosition(p.id, "status", e.target.value)} className={ic} style={{ ...is, color: statusColor[p.status], width: "110px" }}>
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="py-2 pr-2"><input value={p.notiz} onChange={(e) => updatePosition(p.id, "notiz", e.target.value)} className={ic} style={{ ...is, width: "120px" }} placeholder="Notiz" /></td>
                        <td className="py-2"><button onClick={() => removePosition(p.id)} style={{ color: "var(--destructive)" }}><Trash2 size={14} /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="flex justify-end gap-3">
          <button onClick={() => router.back()} className="px-4 py-2 rounded-lg text-sm" style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}>Abbrechen</button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 rounded-lg text-sm font-semibold disabled:opacity-50" style={{ background: "var(--primary)", color: "white" }}>
            {saving ? "Wird gespeichert..." : "Änderungen speichern"}
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
