"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import type { Artikel, Profile } from "@/types/database";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NeueReparaturPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [geraet, setGeraet] = useState("");
  const [fehler, setFehler] = useState("");
  const [typ, setTyp] = useState<"intern" | "extern">("intern");
  const [prioritaet, setPrioritaet] = useState<"Normal" | "Dringend">("Normal");
  const [zustaendigerId, setZustaendigerId] = useState(profile?.id || "");
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
    Promise.all([
      supabase.from("profiles").select("*").eq("aktiv", true),
      supabase.from("artikel").select("*").eq("aktiv", true).order("name"),
    ]).then(([{ data: u }, { data: a }]) => {
      setUsers(u || []);
      setArtikel(a || []);
      if (!zustaendigerId && profile?.id) setZustaendigerId(profile.id);
    });
  }, []);

  async function handleSave() {
    if (!geraet || !fehler) return alert("Gerät und Fehlerbeschreibung sind erforderlich.");
    setSaving(true);

    const fallNummer = `REP-${Date.now()}`.slice(0, 14);

    const { data: rep } = await supabase.from("reparaturen").insert({
      fall_nummer: fallNummer,
      geraet,
      fehler_beschreibung: fehler,
      typ,
      prioritaet,
      status: "Offen",
      zustaendiger_id: zustaendigerId || profile!.id,
      artikel_id: artikelId || null,
      lieferant: typ === "extern" ? lieferant : null,
      rma_nummer: typ === "extern" ? rmaNummer : null,
      tracking_nummer: typ === "extern" ? tracking : null,
      reparaturkosten: typ === "extern" ? reparaturkosten : null,
      notizen: notizen || null,
      erstellt_von: profile!.id,
    }).select().single();

    if (rep) {
      await supabase.from("reparatur_verlauf").insert({
        reparatur_id: rep.id,
        status: "Offen",
        notiz: "Fall eröffnet",
        erstellt_von: profile!.id,
      });
      router.push(`/reparaturen/${rep.id}`);
    }
    setSaving(false);
  }

  const ic = "w-full px-3 py-2 rounded-lg text-sm outline-none";
  const is = { background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" };

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/reparaturen" className="flex items-center gap-1.5 text-sm" style={{ color: "var(--muted-foreground)" }}>
          <ArrowLeft size={15} /> Zurück
        </Link>
        <span style={{ color: "var(--border)" }}>|</span>
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Neuer Reparaturfall</h1>
      </div>

      <div className="space-y-5">
        <Card title="Gerätedaten">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={lc}>Gerät / Bezeichnung *</label>
              <input value={geraet} onChange={(e) => setGeraet(e.target.value)} className={ic} style={is} placeholder="z.B. Samsung TV 65&quot;" />
            </div>
            <div className="col-span-2">
              <label className={lc}>Fehlerbeschreibung *</label>
              <textarea value={fehler} onChange={(e) => setFehler(e.target.value)} rows={3} className={ic} style={is} placeholder="Was ist das Problem?" />
            </div>
            <div>
              <label className={lc}>Artikel aus Lager verknüpfen</label>
              <select value={artikelId} onChange={(e) => setArtikelId(e.target.value)} className={ic} style={is}>
                <option value="">Kein Artikel</option>
                {artikel.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className={lc}>Zuständiger</label>
              <select value={zustaendigerId} onChange={(e) => setZustaendigerId(e.target.value)} className={ic} style={is}>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className={lc}>Typ</label>
              <select value={typ} onChange={(e) => setTyp(e.target.value as "intern" | "extern")} className={ic} style={is}>
                <option value="intern">Intern</option>
                <option value="extern">Extern / RMA</option>
              </select>
            </div>
            <div>
              <label className={lc}>Priorität</label>
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
                <label className={lc}>Lieferant</label>
                <input value={lieferant} onChange={(e) => setLieferant(e.target.value)} className={ic} style={is} placeholder="Lieferantenname" />
              </div>
              <div>
                <label className={lc}>RMA-Nummer</label>
                <input value={rmaNummer} onChange={(e) => setRmaNummer(e.target.value)} className={ic} style={is} placeholder="RMA-XXXXX" />
              </div>
              <div>
                <label className={lc}>Tracking-Nummer</label>
                <input value={tracking} onChange={(e) => setTracking(e.target.value)} className={ic} style={is} placeholder="Sendungsverfolgung" />
              </div>
              <div>
                <label className={lc}>Reparaturkosten (CHF)</label>
                <input type="number" min={0} step={0.01} value={reparaturkosten} onChange={(e) => setReparaturkosten(parseFloat(e.target.value) || 0)} className={ic} style={is} />
              </div>
            </div>
          </Card>
        )}

        <Card title="Notizen">
          <textarea value={notizen} onChange={(e) => setNotizen(e.target.value)} rows={3} className={ic} style={is} placeholder="Interne Notizen..." />
        </Card>

        <div className="flex justify-end gap-3">
          <button onClick={() => router.back()} className="px-4 py-2 rounded-lg text-sm" style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}>Abbrechen</button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 rounded-lg text-sm font-semibold disabled:opacity-50" style={{ background: "var(--primary)", color: "white" }}>
            {saving ? "Wird gespeichert..." : "Fall eröffnen"}
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

const lc = "block text-xs font-medium mb-1";
