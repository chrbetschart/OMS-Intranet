"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import type { Wareneingang } from "@/types/database";
import { Plus, Search, Truck, ChevronRight } from "lucide-react";
import Link from "next/link";

const STATUS_COLOR: Record<string, string> = {
  Ausstehend: "#f59e0b",
  Vollständig: "#22c55e",
  Teilweise: "#3b82f6",
  Problem: "#ef4444",
};

export default function WareneingangPage() {
  const [eingaenge, setEingaenge] = useState<Wareneingang[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("wareneingaenge")
      .select("*")
      .order("datum", { ascending: false })
      .then(({ data }) => { setEingaenge(data || []); setLoading(false); });
  }, []);

  const filtered = eingaenge.filter((e) =>
    [e.projekt, e.lieferant, e.eingangs_nummer, e.lieferschein_nummer]
      .join(" ").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Wareneingang</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>{eingaenge.length} Lieferungen</p>
        </div>
        <Link href="/wareneingang/neu" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--primary)", color: "white" }}>
          <Plus size={16} /> Neue Lieferung
        </Link>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Projekt, Lieferant, Lieferschein..."
          className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
          style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
        />
      </div>

      {loading ? (
        <div className="text-center py-16" style={{ color: "var(--muted-foreground)" }}>Wird geladen...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: "var(--muted-foreground)" }}>
          <Truck size={40} className="mx-auto mb-3 opacity-30" />
          <p>Keine Lieferungen gefunden</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => (
            <Link
              key={e.id}
              href={`/wareneingang/${e.id}`}
              className="flex items-center justify-between p-4 rounded-xl transition-colors"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              onMouseEnter={(el) => ((el.currentTarget as HTMLElement).style.borderColor = "var(--primary)")}
              onMouseLeave={(el) => ((el.currentTarget as HTMLElement).style.borderColor = "var(--border)")}
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#0c2a3a" }}>
                  <Truck size={16} style={{ color: "#06b6d4" }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{e.lieferant}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: STATUS_COLOR[e.status] + "22", color: STATUS_COLOR[e.status] }}>
                      {e.status}
                    </span>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                    {e.eingangs_nummer} · {e.projekt} · LS: {e.lieferschein_nummer} · {formatDate(e.datum)}
                  </div>
                </div>
              </div>
              <ChevronRight size={16} style={{ color: "var(--muted-foreground)" }} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
