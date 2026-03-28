"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatCHF } from "@/lib/utils";
import type { Rapport } from "@/types/database";
import Link from "next/link";
import { Plus, Search, FileText, ChevronRight } from "lucide-react";

const AUFTRAGSTYP_COLOR: Record<string, string> = {
  Abgeschlossen: "#22c55e",
  Folgeauftrag: "#f59e0b",
  Zusatzauftrag: "#3b82f6",
};

export default function RapportListPage() {
  const [rapporte, setRapporte] = useState<Rapport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("rapporte")
        .select("*")
        .order("created_at", { ascending: false });
      setRapporte(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = rapporte.filter((r) =>
    [r.kundenname, r.projekt_nummer, r.rapport_nummer]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Servicerapporte</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>{rapporte.length} Rapporte total</p>
        </div>
        <Link
          href="/rapporte/neu"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: "var(--primary)", color: "white" }}
        >
          <Plus size={16} />
          Neuer Rapport
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Kunde, Projektnummer, Rapportnummer..."
          className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
        />
      </div>

      {/* List */}
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
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: (AUFTRAGSTYP_COLOR[r.auftragstyp] || "#888") + "22",
                        color: AUFTRAGSTYP_COLOR[r.auftragstyp] || "#888",
                      }}
                    >
                      {r.auftragstyp}
                    </span>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                    {r.rapport_nummer} · {r.projekt_nummer ? `Proj. ${r.projekt_nummer} · ` : ""}{formatDate(r.datum)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium hidden sm:block" style={{ color: "var(--foreground)" }}>
                  {formatCHF(r.total_gesamt)}
                </span>
                <ChevronRight size={16} style={{ color: "var(--muted-foreground)" }} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
