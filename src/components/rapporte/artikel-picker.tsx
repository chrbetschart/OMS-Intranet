"use client";

import { useState, useMemo } from "react";
import type { Artikel, Kategorie } from "@/types/database";
import { Search, X, Package } from "lucide-react";
import { formatCHF } from "@/lib/utils";

interface Props {
  artikel: Artikel[];
  kategorien: Kategorie[];
  onSelect: (a: Artikel) => void;
  onManual: () => void;
  onClose: () => void;
}

export function ArtikelPicker({ artikel, kategorien, onSelect, onManual, onClose }: Props) {
  const [search, setSearch] = useState("");
  const [filterKat, setFilterKat] = useState<string>("alle");

  const filtered = useMemo(() => {
    return artikel.filter((a) => {
      const matchSearch = search.trim() === "" || [a.name, a.marke, a.artikelnummer, a.typ].join(" ").toLowerCase().includes(search.toLowerCase());
      const matchKat = filterKat === "alle" || a.kategorie_id === filterKat;
      return matchSearch && matchKat;
    });
  }, [artikel, search, filterKat]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)" }}>
      <div className="w-full max-w-2xl rounded-2xl flex flex-col" style={{ background: "var(--card)", border: "1px solid var(--border)", maxHeight: "80vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>Artikel aus Lager auswählen</h2>
          <button onClick={onClose} style={{ color: "var(--muted-foreground)" }}><X size={18} /></button>
        </div>

        {/* Search */}
        <div className="px-5 pt-4 pb-3 shrink-0">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }} />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, Artikelnummer, Marke..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            />
          </div>
        </div>

        {/* Category filter */}
        <div className="px-5 pb-3 flex gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setFilterKat("alle")}
            className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors"
            style={{ background: filterKat === "alle" ? "var(--primary)" : "var(--secondary)", color: filterKat === "alle" ? "white" : "var(--foreground)", border: "1px solid var(--border)" }}
          >
            Alle
          </button>
          {kategorien.map((k) => (
            <button
              key={k.id}
              onClick={() => setFilterKat(k.id)}
              className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors"
              style={{
                background: filterKat === k.id ? k.farbe : "var(--secondary)",
                color: filterKat === k.id ? "white" : "var(--foreground)",
                border: `1px solid ${filterKat === k.id ? k.farbe : "var(--border)"}`,
              }}
            >
              {k.name}
            </button>
          ))}
        </div>

        {/* Article list */}
        <div className="overflow-y-auto flex-1 px-3 pb-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12" style={{ color: "var(--muted-foreground)" }}>
              <Package size={36} className="mb-3 opacity-30" />
              <p className="text-sm">Kein Artikel gefunden</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((a) => {
                const kat = kategorien.find((k) => k.id === a.kategorie_id);
                const unterMin = a.bestand <= a.mindestbestand;
                return (
                  <button
                    key={a.id}
                    onClick={() => onSelect(a)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors"
                    style={{ background: "var(--background)", border: "1px solid var(--border)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {a.bild_url ? (
                        <img src={a.bild_url} alt={a.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: kat ? kat.farbe + "22" : "var(--secondary)", color: kat?.farbe || "var(--muted-foreground)" }}>
                          <Package size={18} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>{a.name}</div>
                        <div className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
                          {[a.marke, a.artikelnummer].filter(Boolean).join(" · ")}
                          {kat && <span> · <span style={{ color: kat.farbe }}>{kat.name}</span></span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{formatCHF(a.verkaufspreis)}</div>
                      <div className="text-xs" style={{ color: unterMin ? "#ef4444" : "#22c55e" }}>
                        {a.bestand} {a.einheit}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 shrink-0 flex items-center justify-between" style={{ borderTop: "1px solid var(--border)" }}>
          <button onClick={onManual} className="text-sm" style={{ color: "var(--primary)" }}>
            + Manuell eingeben
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
