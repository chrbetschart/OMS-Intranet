"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatDate, formatDateTime, formatCHF, daysBetween } from "@/lib/utils";
import type { Reparatur, ReparaturVerlauf, ReparaturStatus } from "@/types/database";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Printer } from "lucide-react";

const STATUSES: ReparaturStatus[] = ["Offen", "In Bearbeitung", "Warte auf Teile", "Beim Lieferanten", "Abgeschlossen"];
const STATUS_COLOR: Record<string, string> = {
  "Offen": "#f59e0b",
  "In Bearbeitung": "#3b82f6",
  "Warte auf Teile": "#8b5cf6",
  "Beim Lieferanten": "#06b6d4",
  "Abgeschlossen": "#22c55e",
};

export default function ReparaturDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const supabase = createClient();

  const [reparatur, setReparatur] = useState<Reparatur | null>(null);
  const [verlauf, setVerlauf] = useState<ReparaturVerlauf[]>([]);
  const [loading, setLoading] = useState(true);
  const [neuerStatus, setNeuerStatus] = useState<ReparaturStatus>("Offen");
  const [notiz, setNotiz] = useState("");
  const [updating, setUpdating] = useState(false);

  async function load() {
    const id = params.id as string;
    const [{ data: r }, { data: v }] = await Promise.all([
      supabase.from("reparaturen").select("*").eq("id", id).single(),
      supabase.from("reparatur_verlauf").select("*").eq("reparatur_id", id).order("created_at"),
    ]);
    setReparatur(r);
    setVerlauf(v || []);
    if (r) setNeuerStatus(r.status);
    setLoading(false);
  }

  useEffect(() => { load(); }, [params.id]);

  async function handleStatusUpdate() {
    if (!reparatur || !profile) return;
    setUpdating(true);

    await supabase.from("reparaturen").update({ status: neuerStatus }).eq("id", reparatur.id);
    await supabase.from("reparatur_verlauf").insert({
      reparatur_id: reparatur.id,
      status: neuerStatus,
      notiz: notiz || `Status geändert auf: ${neuerStatus}`,
      erstellt_von: profile.id,
    });

    setNotiz("");
    setUpdating(false);
    load();
  }

  if (loading) return <div className="p-8 text-center" style={{ color: "var(--muted-foreground)" }}>Wird geladen...</div>;
  if (!reparatur) return <div className="p-8 text-center" style={{ color: "var(--muted-foreground)" }}>Fall nicht gefunden.</div>;

  const daysSince = daysBetween(new Date(reparatur.created_at), new Date());
  const warn = reparatur.status !== "Abgeschlossen" && daysSince >= 14;
  const critical = reparatur.status !== "Abgeschlossen" && daysSince >= 30;

  const ic = "w-full px-3 py-2 rounded-lg text-sm outline-none";
  const is = { background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" };

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/reparaturen" className="flex items-center gap-1.5 text-sm" style={{ color: "var(--muted-foreground)" }}>
            <ArrowLeft size={15} /> Zurück
          </Link>
          <span style={{ color: "var(--border)" }}>|</span>
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>{reparatur.fall_nummer}</h1>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: STATUS_COLOR[reparatur.status] + "22", color: STATUS_COLOR[reparatur.status] }}>
            {reparatur.status}
          </span>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm" style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
          <Printer size={15} /> Begleitschein
        </button>
      </div>

      {(warn || critical) && (
        <div className="flex items-center gap-2 p-3 rounded-lg mb-4 text-sm" style={{ background: critical ? "#450a0a" : "#451a03", border: `1px solid ${critical ? "#ef4444" : "#f59e0b"}`, color: critical ? "#ef4444" : "#f59e0b" }}>
          <AlertTriangle size={16} />
          Dieser Fall ist seit {daysSince} Tagen offen!
        </div>
      )}

      <div className="space-y-5">
        <Card title="Geräteinformationen">
          <div className="grid grid-cols-2 gap-3">
            <Info label="Gerät" value={reparatur.geraet} />
            <Info label="Typ" value={reparatur.typ === "extern" ? "Extern / RMA" : "Intern"} />
            <Info label="Priorität" value={reparatur.prioritaet} />
            <Info label="Eröffnet am" value={formatDate(reparatur.created_at)} />
            <div className="col-span-2">
              <Info label="Fehlerbeschreibung" value={reparatur.fehler_beschreibung} />
            </div>
            {reparatur.notizen && <div className="col-span-2"><Info label="Notizen" value={reparatur.notizen} /></div>}
          </div>
        </Card>

        {reparatur.typ === "extern" && (
          <Card title="RMA-Informationen">
            <div className="grid grid-cols-2 gap-3">
              <Info label="Lieferant" value={reparatur.lieferant || "—"} />
              <Info label="RMA-Nummer" value={reparatur.rma_nummer || "—"} />
              <Info label="Tracking" value={reparatur.tracking_nummer || "—"} />
              <Info label="Reparaturkosten" value={reparatur.reparaturkosten ? formatCHF(reparatur.reparaturkosten) : "—"} />
            </div>
          </Card>
        )}

        {/* Status updaten */}
        <Card title="Status aktualisieren">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>Neuer Status</label>
              <select value={neuerStatus} onChange={(e) => setNeuerStatus(e.target.value as ReparaturStatus)} className={ic} style={is}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>Notiz</label>
              <input value={notiz} onChange={(e) => setNotiz(e.target.value)} className={ic} style={is} placeholder="Optionale Notiz zum Status..." />
            </div>
            <button onClick={handleStatusUpdate} disabled={updating || neuerStatus === reparatur.status} className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ background: "var(--primary)", color: "white" }}>
              {updating ? "Wird aktualisiert..." : "Status speichern"}
            </button>
          </div>
        </Card>

        {/* Verlauf */}
        <Card title="Statusverlauf">
          <div className="space-y-3">
            {verlauf.map((v, i) => (
              <div key={v.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: STATUS_COLOR[v.status] || "var(--muted-foreground)" }} />
                  {i < verlauf.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: "var(--border)" }} />}
                </div>
                <div className="pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: STATUS_COLOR[v.status] || "var(--foreground)" }}>{v.status}</span>
                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{formatDateTime(v.created_at)}</span>
                  </div>
                  {v.notiz && <p className="text-sm mt-0.5" style={{ color: "var(--foreground)" }}>{v.notiz}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</p>
      <p className="text-sm font-medium mt-0.5" style={{ color: "var(--foreground)" }}>{value}</p>
    </div>
  );
}
