"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import type { Wareneingang, WareneingangPosition } from "@/types/database";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  Ausstehend: "#f59e0b",
  Vollständig: "#22c55e",
  Teilweise: "#3b82f6",
  Problem: "#ef4444",
  Erhalten: "#22c55e",
  Fehlt: "#f59e0b",
  Beschädigt: "#ef4444",
};

export default function WareneingangDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [we, setWe] = useState<Wareneingang | null>(null);
  const [positionen, setPositionen] = useState<WareneingangPosition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id as string;
    Promise.all([
      supabase.from("wareneingaenge").select("*").eq("id", id).single(),
      supabase.from("wareneingang_positionen").select("*").eq("wareneingang_id", id),
    ]).then(([{ data: w }, { data: p }]) => {
      setWe(w);
      setPositionen(p || []);
      setLoading(false);
    });
  }, [params.id]);

  if (loading) return <div className="p-8 text-center" style={{ color: "var(--muted-foreground)" }}>Wird geladen...</div>;
  if (!we) return <div className="p-8 text-center" style={{ color: "var(--muted-foreground)" }}>Lieferung nicht gefunden.</div>;

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/wareneingang" className="flex items-center gap-1.5 text-sm" style={{ color: "var(--muted-foreground)" }}>
            <ArrowLeft size={15} /> Zurück
          </Link>
          <span style={{ color: "var(--border)" }}>|</span>
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>{we.eingangs_nummer}</h1>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: STATUS_COLOR[we.status] + "22", color: STATUS_COLOR[we.status] }}>
            {we.status}
          </span>
        </div>
        <button
          onClick={() => router.push(`/wareneingang/${we.id}/bearbeiten`)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
        >
          <Pencil size={14} /> Bearbeiten
        </button>
      </div>

      <div className="space-y-5">
        <Card title="Lieferungsdaten">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Info label="Lieferant" value={we.lieferant} />
            <Info label="Projekt" value={we.projekt || "—"} />
            <Info label="Datum" value={formatDate(we.datum)} />
            <Info label="Lieferschein-Nr." value={we.lieferschein_nummer || "—"} />
          </div>
          {we.notizen && <div className="mt-3"><Info label="Notizen" value={we.notizen} /></div>}
        </Card>

        <Card title="Positionen">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Bezeichnung", "Bestellt", "Erhalten", "Einheit", "Status", "Notiz"].map((h) => (
                    <th key={h} className="text-left pb-2 text-xs font-medium pr-3" style={{ color: "var(--muted-foreground)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positionen.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="py-2.5 pr-3 font-medium" style={{ color: "var(--foreground)" }}>{p.bezeichnung}</td>
                    <td className="py-2.5 pr-3" style={{ color: "var(--muted-foreground)" }}>{p.bestellt}</td>
                    <td className="py-2.5 pr-3" style={{ color: "var(--foreground)" }}>{p.erhalten}</td>
                    <td className="py-2.5 pr-3" style={{ color: "var(--muted-foreground)" }}>{p.einheit}</td>
                    <td className="py-2.5 pr-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: (STATUS_COLOR[p.status] || "#888") + "22", color: STATUS_COLOR[p.status] || "#888" }}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-xs" style={{ color: "var(--muted-foreground)" }}>{p.notiz || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
