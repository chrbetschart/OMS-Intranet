"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatCHF, formatDateTime } from "@/lib/utils";
import type { Rapport, RapportTechniker, RapportMaterial } from "@/types/database";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileDown, Printer } from "lucide-react";
import SignatureCanvas from "@/components/rapporte/signature-canvas";

const AUFTRAGSTYP_COLOR: Record<string, string> = {
  Abgeschlossen: "#22c55e",
  Folgeauftrag: "#f59e0b",
  Zusatzauftrag: "#3b82f6",
};

export default function RapportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [technikerRows, setTechnikerRows] = useState<RapportTechniker[]>([]);
  const [materialRows, setMaterialRows] = useState<RapportMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const id = params.id as string;
      const [{ data: r }, { data: t }, { data: m }] = await Promise.all([
        supabase.from("rapporte").select("*").eq("id", id).single(),
        supabase.from("rapport_techniker").select("*").eq("rapport_id", id),
        supabase.from("rapport_material").select("*").eq("rapport_id", id),
      ]);
      setRapport(r);
      setTechnikerRows(t || []);
      setMaterialRows(m || []);
      setLoading(false);
    }
    load();
  }, [params.id]);

  function handlePrint() {
    window.print();
  }

  if (loading) return <div className="p-8 text-center" style={{ color: "var(--muted-foreground)" }}>Wird geladen...</div>;
  if (!rapport) return <div className="p-8 text-center" style={{ color: "var(--muted-foreground)" }}>Rapport nicht gefunden.</div>;

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/rapporte" className="flex items-center gap-1.5 text-sm" style={{ color: "var(--muted-foreground)" }}>
            <ArrowLeft size={15} /> Zurück
          </Link>
          <span style={{ color: "var(--border)" }}>|</span>
          <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>{rapport.rapport_nummer}</h1>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              background: (AUFTRAGSTYP_COLOR[rapport.auftragstyp] || "#888") + "22",
              color: AUFTRAGSTYP_COLOR[rapport.auftragstyp] || "#888",
            }}
          >
            {rapport.auftragstyp}
          </span>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
        >
          <Printer size={15} /> PDF / Drucken
        </button>
      </div>

      {/* Print-friendly rapport */}
      <div className="space-y-5 print:text-black print:bg-white">
        {/* Kundendaten */}
        <Card title="Kundendaten">
          <Grid>
            <InfoField label="Datum" value={formatDate(rapport.datum)} />
            <InfoField label="Projektnummer" value={rapport.projekt_nummer || "—"} />
            <InfoField label="Kundenname" value={rapport.kundenname} />
            <InfoField label="Adresse" value={rapport.adresse || "—"} />
            <InfoField label="E-Mail" value={rapport.email || "—"} />
            <InfoField label="Telefon" value={rapport.telefon || "—"} />
          </Grid>
        </Card>

        {/* Notizen */}
        {rapport.notizen && (
          <Card title="Notizen / Durchgeführte Arbeiten">
            <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--foreground)" }}>{rapport.notizen}</p>
          </Card>
        )}

        {/* Arbeitsaufwand */}
        <Card title="Arbeitsaufwand">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Techniker", "Stunden", "Stundensatz", "Total"].map((h) => (
                  <th key={h} className="text-left pb-2 text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {technikerRows.map((t) => (
                <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2" style={{ color: "var(--foreground)" }}>{t.techniker_name}</td>
                  <td className="py-2" style={{ color: "var(--foreground)" }}>{t.stunden}h</td>
                  <td className="py-2" style={{ color: "var(--foreground)" }}>{formatCHF(t.stundensatz)}/h</td>
                  <td className="py-2 font-medium" style={{ color: "var(--foreground)" }}>{formatCHF(t.total)}</td>
                </tr>
              ))}
              {rapport.fahrzeugpauschale > 0 && (
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2" colSpan={3} style={{ color: "var(--muted-foreground)" }}>Fahrzeugpauschale</td>
                  <td className="py-2" style={{ color: "var(--foreground)" }}>{formatCHF(rapport.fahrzeugpauschale)}</td>
                </tr>
              )}
              {rapport.hilfsmittel > 0 && (
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2" colSpan={3} style={{ color: "var(--muted-foreground)" }}>Hilfsmittel</td>
                  <td className="py-2" style={{ color: "var(--foreground)" }}>{formatCHF(rapport.hilfsmittel)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        {/* Material */}
        {materialRows.length > 0 && (
          <Card title="Materialliste">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Bezeichnung", "Menge", "Einheit", "Einzelpreis", "Total"].map((h) => (
                    <th key={h} className="text-left pb-2 text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {materialRows.map((m) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="py-2" style={{ color: "var(--foreground)" }}>{m.bezeichnung}</td>
                    <td className="py-2" style={{ color: "var(--foreground)" }}>{m.menge}</td>
                    <td className="py-2" style={{ color: "var(--muted-foreground)" }}>{m.einheit}</td>
                    <td className="py-2" style={{ color: "var(--foreground)" }}>{formatCHF(m.einzelpreis)}</td>
                    <td className="py-2 font-medium" style={{ color: "var(--foreground)" }}>{formatCHF(m.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* Kosten */}
        <Card title="Kostenübersicht">
          <div className="space-y-2 max-w-sm ml-auto">
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--muted-foreground)" }}>Arbeitsaufwand</span>
              <span style={{ color: "var(--foreground)" }}>{formatCHF(rapport.total_arbeitsaufwand)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--muted-foreground)" }}>Material</span>
              <span style={{ color: "var(--foreground)" }}>{formatCHF(rapport.total_material)}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2" style={{ borderTop: "1px solid var(--border)" }}>
              <span style={{ color: "var(--foreground)" }}>Total</span>
              <span style={{ color: "var(--primary)" }}>{formatCHF(rapport.total_gesamt)}</span>
            </div>
          </div>
        </Card>

        {/* Unterschriften */}
        <Card title="Unterschriften">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: "var(--muted-foreground)" }}>Auftraggeber</p>
              {rapport.auftraggeber_unterschrift ? (
                <SignatureCanvas readOnly initialValue={rapport.auftraggeber_unterschrift} onSave={() => {}} />
              ) : (
                <div className="h-[150px] rounded-lg flex items-center justify-center text-xs" style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>Keine Unterschrift</div>
              )}
            </div>
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: "var(--muted-foreground)" }}>Techniker</p>
              {rapport.techniker_unterschrift ? (
                <SignatureCanvas readOnly initialValue={rapport.techniker_unterschrift} onSave={() => {}} />
              ) : (
                <div className="h-[150px] rounded-lg flex items-center justify-center text-xs" style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>Keine Unterschrift</div>
              )}
            </div>
          </div>
        </Card>
      </div>

      <p className="text-xs mt-4 print:hidden" style={{ color: "var(--muted-foreground)" }}>
        Erstellt am {formatDateTime(rapport.created_at)}
      </p>
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

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</p>
      <p className="text-sm font-medium mt-0.5" style={{ color: "var(--foreground)" }}>{value}</p>
    </div>
  );
}
