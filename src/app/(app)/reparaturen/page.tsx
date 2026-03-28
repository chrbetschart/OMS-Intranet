"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, daysBetween } from "@/lib/utils";
import type { Reparatur } from "@/types/database";
import { Plus, Search, Wrench, AlertTriangle, ChevronRight } from "lucide-react";
import Link from "next/link";

const STATUS_COLOR: Record<string, string> = {
  "Offen": "#f59e0b",
  "In Bearbeitung": "#3b82f6",
  "Warte auf Teile": "#8b5cf6",
  "Beim Lieferanten": "#06b6d4",
  "Abgeschlossen": "#22c55e",
};

const PRIO_COLOR: Record<string, string> = {
  Normal: "#64748b",
  Dringend: "#ef4444",
};

export default function ReparaturenPage() {
  const [reparaturen, setReparaturen] = useState<Reparatur[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Alle");
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("reparaturen")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => { setReparaturen(data || []); setLoading(false); });
  }, []);

  const filtered = reparaturen.filter((r) => {
    const matchSearch = [r.geraet, r.fall_nummer, r.lieferant || ""].join(" ").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "Alle" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const offen = reparaturen.filter((r) => r.status !== "Abgeschlossen");

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Reparaturen & RMA</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            {offen.length} offene Fälle
          </p>
        </div>
        <Link
          href="/reparaturen/neu"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: "var(--primary)", color: "white" }}
        >
          <Plus size={16} /> Neuer Fall
        </Link>
      </div>

      {/* Filter */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Gerät, Fallnummer, Lieferant..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 rounded-lg text-sm outline-none"
          style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
        >
          {["Alle", "Offen", "In Bearbeitung", "Warte auf Teile", "Beim Lieferanten", "Abgeschlossen"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16" style={{ color: "var(--muted-foreground)" }}>Wird geladen...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: "var(--muted-foreground)" }}>
          <Wrench size={40} className="mx-auto mb-3 opacity-30" />
          <p>Keine Fälle gefunden</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const daysSince = daysBetween(new Date(r.created_at), new Date());
            const warn = r.status !== "Abgeschlossen" && daysSince >= 14;
            const critical = r.status !== "Abgeschlossen" && daysSince >= 30;
            return (
              <Link
                key={r.id}
                href={`/reparaturen/${r.id}`}
                className="flex items-center justify-between p-4 rounded-xl transition-colors"
                style={{ background: "var(--card)", border: `1px solid ${critical ? "#ef444466" : warn ? "#f59e0b66" : "var(--border)"}` }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--primary)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = critical ? "#ef444466" : warn ? "#f59e0b66" : "var(--border)")}
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#2d1a00" }}>
                    <Wrench size={16} style={{ color: "#f59e0b" }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{r.geraet}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: STATUS_COLOR[r.status] + "22", color: STATUS_COLOR[r.status] }}>
                        {r.status}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: PRIO_COLOR[r.prioritaet] + "22", color: PRIO_COLOR[r.prioritaet] }}>
                        {r.prioritaet}
                      </span>
                      {(warn || critical) && (
                        <span className="text-xs flex items-center gap-1" style={{ color: critical ? "#ef4444" : "#f59e0b" }}>
                          <AlertTriangle size={12} /> {daysSince} Tage offen
                        </span>
                      )}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                      {r.fall_nummer} · {r.typ === "extern" ? `Extern / RMA${r.lieferant ? ` · ${r.lieferant}` : ""}` : "Intern"} · {formatDate(r.created_at)}
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: "var(--muted-foreground)" }} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
