"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useRouter, useParams } from "next/navigation";
import type { Artikel, Profile } from "@/types/database";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ReparaturBearbeitenPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [geraet, setGeraet] = useState("");
  const [fehler, setFehler] = useState("");
  const [typ, setTyp] = useState<"intern" | "extern">("intern");
  const [prioritaet, setPrioritaet] = useState<"Normal" | "Dringend">("Normal");
  const [zustaendigerId, setZustaendigerId] = useState("");
  const [artikelId, setArtikelId] = useState("");
  const [lieferant, setLieferant] = useState("");
  const [rmaNummer, setRmaNummer] = useState("");
  const [tracking, setTracking] = useState("");
  const [reparaturkosten, setReparaturkosten] = useState(0);
  const [notizen, setNotizen] = useState("");
  const [users, setUsers] = useState<Profile[]>([]);
  const [artikel, setArtikel] = useState<Artikel[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: r }, { data: u }, { data: a }] = await Promise.all([
        supabase.from("reparaturen").select("*").eq("id", id).single(),
        supabase.from("profiles").select("*").eq("aktiv", true),
        supabase.from("artikel").select("*").eq("aktiv", true).order("name"),
      ]);
      if (r) {
        setGeraet(r.geraet);
        setFehler(r.fehler_beschreibung);
        setTyp(r.typ);
        setPrioritaet(r.prioritaet);
        setZustaendigerId(r.zustaendiger_id || "");
        setArtikelId(r.artikel_id || "");
        setLieferant(r.lieferant || "");
        setRmaNummer(r.rma_nummer || "");
        setTracking(r.tracking_nummer || "");
        setReparaturkosten(r.reparaturkosten || 0);
        setNotizen(r.notizen || "");
      }
      setUsers(u || []);
      setArtikel(a || []);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSave() {
    if (!geraet || !fehler) return alert("Gerät und Fehlerbeschreibung sind erforderlich.");
    setSaving(true);

    await supabase.from("reparaturen").update({
      geraet,
      fehler_beschreibung: fehler,
      typ,
      prioritaet,
      zustaendiger_id: zustaendigerId || profile!.id,
      artikel_id: artikelId || null,
      lieferant: typ === "extern" ? lieferant : null,
      rma_nummer: typ === "extern" ? rmaNummer : null,
      tracking_nummer: typ === "extern" ? tracking : null,
      reparaturkosten: typ === "extern" ? reparaturkosten : null,
      notizen: notizen || null,
    }).eq("id", id);

    router.push(`/reparaturen/${id}`);
    setSaving(false);
  }

  const ic = "w-full px-3 py-2 rounded-lg text-sm outline-none";
  const is = { background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" };
  const lc = "block text-xs font-medium mb-1" as const;

  if (loading) return <div className="p-8 text-center" style={{ color: "var(--muted-foreground)" }}>Wird geladen...</div>;

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/reparaturen/${id}`} className="flex items-center gap-1.5 text-sm" style={{ color: "var(--muted-foreground)" }}>
          <ArrowLeft size={15} /> Zurück
        </Link>
        <span style={{ color: "var(--border)" }}>|</span>
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Reparatur bearbeiten</h1>
      </div>

      <div className="space-y-5">
        <Card title="Gerätedaten">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={lc} style={{ color: "var(--muted-foreground)" }}>Gerät / Bezeichnung *</label>
              <input value={geraet} onChange={(e) => setGeraet(e.target.value)} className={ic} style={is} />
            </div>
            <div className="col-span-2">
              <label className={lc} style={{ color: "var(--muted-foreground)" }}>Fehlerbeschreibung *</label>
              <textarea value={fehler} onChange={(e) => setFehler(e.target.value)} rows={3} className={ic} style={is} />
            </div>
            <div>
              <label className={lc} style={{ color: "var(--muted-foreground)" }}>Artikel aus Lager verknüpfen</label>
              <select value={artikelId} onChange={(e) => setArtikelId(e.target.value)} className={ic} style={is}>
                <option value="">Kein Artikel</option>
                {artikel.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className={lc} style={{ color: "var(--muted-foreground)" }}>Zuständiger</label>
              <select value={zustaendigerId} onChange={(e) => setZustaendigerId(e.target.value)} className={ic} style={is}>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className={lc} style={{ color: "var(--muted-foreground)" }}>Typ</label>
              <select value={typ} onChange={(e) => setTyp(e.target.value as "intern" | "extern")} className={ic} style={is}>
                <option value="intern">Intern</option>
                <option value="extern">Extern / RMA</option>
              </select>
            </div>
            <div>
              <label className={lc} style={{ color: "var(--muted-foreground)" }}>Priorität</label>
              <select value={prioritaet} onChange={(e) => setPrioritaet(e.target.value as "Normal" | "Dringend")} className={ic} style={is}>
                <option>Normal</option>
                <option>Dringend</option>
              </select>
            </div>
          </div>
        </Card>

        {typ === "extern" && (
          <Card title="RMA / Lieferanteninformationen">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lc} style={{ color: "var(--muted-foreground)" }}>Lieferant</label>
                <input value={lieferant} onChange={(e) => setLieferant(e.target.value)} className={ic} style={is} />
              </div>
              <div>
                <label className={lc} style={{ color: "var(--muted-foreground)" }}>RMA-Nummer</label>
                <input value={rmaNummer} onChange={(e) => setRmaNummer(e.target.value)} className={ic} style={is} />
              </div>
              <div>
                <label className={lc} style={{ color: "var(--muted-foreground)" }}>Tracking-Nummer</label>
                <input value={tracking} onChange={(e) => setTracking(e.target.value)} className={ic} style={is} />
              </div>
              <div>
                <label className={lc} style={{ color: "var(--muted-foreground)" }}>Reparaturkosten (CHF)</label>
                <input type="number" min={0} step={0.01} value={reparaturkosten} onChange={(e) => setReparaturkosten(parseFloat(e.target.value) || 0)} className={ic} style={is} />
              </div>
            </div>
          </Card>
        )}

        <Card title="Notizen">
          <textarea value={notizen} onChange={(e) => setNotizen(e.target.value)} rows={3} className={ic} style={is} />
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
