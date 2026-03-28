"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatCHF } from "@/lib/utils";
import type { Rapport } from "@/types/database";
import Link from "next/link";
import { Search, FileText, ChevronRight } from "lucide-react";

const AUFTRAGSTYPEN = ["Alle", "Folgeauftrag", "Abgeschlossen", "Zusatzauftrag"];
const AUFTRAGSTYP_COLOR: Record<string, string> = {
  Abgeschlossen: "#22c55e",
  Folgeauftrag: "#f59e0b",
  Zusatzauftrag: "#3b82f6",
};

export default function ArchivPage() {
  const [rapporte, setRapporte] = useState<Rapport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTyp, setFilterTyp] = useState("Alle");
  const [filterVon, setFilterVon] = useState("");
  const [filterBis, setFilterBis] = useState("");
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("rapporte")
      .select("*")
      .order("datum", { ascending: false })
      .then(({ data }) => {
        setRapporte(data || []);
        setLoading(false);
      });
  }, []);

  const filtered = rapporte.filter((r) => {
    const matchSearch = [r.kundenname, r.projekt_nummer, r.rapport_nummer]
      .join(" ").toLowerCase().includes(search.toLowerCase());
    const matchTyp = filterTyp === "Alle" || r.auftragstyp === filterTyp;
    const matchVon = !filterVon || r.datum >= filterVon;
    const matchBis = !filterBis || r.datum <= filterBis;
    return matchSearch && matchTyp && matchVon && matchBis;
  });

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Archiv</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>{rapporte.length} Rapporte gespeichert</p>
      </div>

      {/* Filter */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kunde, Projektnummer, Rapportnummer..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
          />
        </div>
        <select
          value={filterTyp}
          onChange={(e) => setFilterTyp(e.target.value)}
          className="px-3 py-2.5 rounded-lg text-sm outline-none"
          style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
        >
          {AUFTRAGSTYPEN.map((t) => <option key={t}>{t}</option>)}
        </select>
        <input type="date" value={filterVon} onChange={(e) => setFilterVon(e.target.value)} className="px-3 py-2.5 rounded-lg text-sm outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
        <input type="date" value={filterBis} onChange={(e) => setFilterBis(e.target.value)} className="px-3 py-2.5 rounded-lg text-sm outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
      </div>

      {loading ? (
        <div className="text-center py-16" style={{ color: "var(--muted-foreground)" }}>Wird geladen...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: "var(--muted-foreground)" }}>
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p>Keine Rapporte gefunden</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <Link
              key={r.id}
              href={`/rapporte/${r.id}`}
              className="flex items-center justify-between p-4 rounded-xl transition-colors"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--primary)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--border)")}
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#1e3a5f" }}>
                  <FileText size={16} style={{ color: "var(--primary)" }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{r.kundenname}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: (AUFTRAGSTYP_COLOR[r.auftragstyp] || "#888") + "22", color: AUFTRAGSTYP_COLOR[r.auftragstyp] || "#888" }}>
                      {r.auftragstyp}
                    </span>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                    {r.rapport_nummer} · {formatDate(r.datum)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium hidden sm:block" style={{ color: "var(--foreground)" }}>{formatCHF(r.total_gesamt)}</span>
                <ChevronRight size={16} style={{ color: "var(--muted-foreground)" }} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
