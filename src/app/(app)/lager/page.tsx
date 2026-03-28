"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCHF } from "@/lib/utils";
import type { Artikel, Kategorie } from "@/types/database";
import { Plus, Search, Package, AlertTriangle, Edit2 } from "lucide-react";
import { ArtikelModal } from "@/components/lager/artikel-modal";

export default function LagerPage() {
  const [artikel, setArtikel] = useState<Artikel[]>([]);
  const [kategorien, setKategorien] = useState<Kategorie[]>([]);
  const [search, setSearch] = useState("");
  const [filterKat, setFilterKat] = useState<string>("alle");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Artikel | null>(null);
  const supabase = createClient();

  async function load() {
    const [{ data: a }, { data: k }] = await Promise.all([
      supabase.from("artikel").select("*").eq("aktiv", true).order("name"),
      supabase.from("kategorien").select("*").order("name"),
    ]);
    setArtikel(a || []);
    setKategorien(k || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = artikel.filter((a) => {
    const matchSearch = [a.name, a.artikelnummer, a.marke].join(" ").toLowerCase().includes(search.toLowerCase());
    const matchKat = filterKat === "alle" || a.kategorie_id === filterKat;
    return matchSearch && matchKat;
  });

  const unterMindestbestand = artikel.filter((a) => a.bestand <= a.mindestbestand).length;

  function openNew() { setEditing(null); setModalOpen(true); }
  function openEdit(a: Artikel) { setEditing(a); setModalOpen(true); }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Lagerverwaltung</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            {artikel.length} Artikel
            {unterMindestbestand > 0 && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#450a0a", color: "#ef4444" }}>
                ⚠ {unterMindestbestand} unter Mindestbestand
              </span>
            )}
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: "var(--primary)", color: "white" }}
        >
          <Plus size={16} /> Artikel anlegen
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, Artikelnummer, Marke..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
          />
        </div>
        <select
          value={filterKat}
          onChange={(e) => setFilterKat(e.target.value)}
          className="px-3 py-2.5 rounded-lg text-sm outline-none"
          style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
        >
          <option value="alle">Alle Kategorien</option>
          {kategorien.map((k) => (
            <option key={k.id} value={k.id}>{k.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16" style={{ color: "var(--muted-foreground)" }}>Wird geladen...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: "var(--muted-foreground)" }}>
          <Package size={40} className="mx-auto mb-3 opacity-30" />
          <p>Keine Artikel gefunden</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-sm">
            <thead style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
              <tr>
                {["Artikel", "Kategorie", "Bestand", "Mindestbestand", "Einheit", "VK-Preis", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const kat = kategorien.find((k) => k.id === a.kategorie_id);
                const unterMin = a.bestand <= a.mindestbestand;
                return (
                  <tr key={a.id} style={{ borderBottom: "1px solid var(--border)", background: "var(--background)" }}>
                    <td className="px-4 py-3">
                      <div className="font-medium" style={{ color: "var(--foreground)" }}>{a.name}</div>
                      {a.marke && <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{a.marke} · {a.artikelnummer}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {kat ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: kat.farbe + "33", color: kat.farbe }}>
                          {kat.name}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold" style={{ color: unterMin ? "#ef4444" : "#22c55e" }}>
                        {a.bestand}
                        {unterMin && <AlertTriangle size={13} className="inline ml-1 mb-0.5" />}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--muted-foreground)" }}>{a.mindestbestand}</td>
                    <td className="px-4 py-3" style={{ color: "var(--muted-foreground)" }}>{a.einheit}</td>
                    <td className="px-4 py-3" style={{ color: "var(--foreground)" }}>{formatCHF(a.verkaufspreis)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--muted-foreground)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
                      >
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <ArtikelModal
          artikel={editing}
          kategorien={kategorien}
          onClose={() => setModalOpen(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}
