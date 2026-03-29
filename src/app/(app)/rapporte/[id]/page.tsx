"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatCHF, formatDateTime } from "@/lib/utils";
import type { Rapport, RapportTechniker, RapportMaterial } from "@/types/database";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileDown, Pencil } from "lucide-react";
import SignatureCanvas from "@/components/rapporte/signature-canvas";

const FAHRZEUG_RAYONS = [
  { label: "Rayon 1 (inkl. Reisezeit)", beschreibung: "Bis 20km retour",  preis: 65  },
  { label: "Rayon 2 (inkl. Reisezeit)", beschreibung: "Bis 40km retour",  preis: 95  },
  { label: "Rayon 3 (inkl. Reisezeit)", beschreibung: "Bis 60km retour",  preis: 135 },
  { label: "Rayon 4 (inkl. Reisezeit)", beschreibung: "Bis 90km retour",  preis: 180 },
  { label: "Rayon 5 (inkl. Reisezeit)", beschreibung: "Bis 180km retour", preis: 270 },
];

const HILFSMITTEL_LISTE = [
  { name: "Klein und Hilfsmaterial",        preis: 24.50 },
  { name: "Bohrmaterial / Montagematerial",  preis: 24.50 },
  { name: "Servicenotebook mit Lizenzen",    preis: 35.00 },
  { name: "Messgerät mit Messlizenz",        preis: 35.00 },
];

const AUFTRAGSTYP_COLOR: Record<string, string> = {
  Abgeschlossen: "#22c55e",
  Folgeauftrag:  "#f59e0b",
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
  const [pdfLoading, setPdfLoading] = useState(false);

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

  async function handleDownloadPDF() {
    if (!rapport) return;
    setPdfLoading(true);
    try {
      const [{ pdf }, { RapportPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/rapporte/rapport-pdf"),
      ]);
      // Fetch OMS logo as base64 for PDF embedding
      let logoBase64: string | null = null;
      try {
        const res = await fetch("/logo_ottiger_media_systeme_rgb.jpg");
        if (res.ok) {
          const buf = await res.arrayBuffer();
          const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
          logoBase64 = `data:image/jpeg;base64,${b64}`;
        }
      } catch { /* logo optional */ }
      const element = RapportPDF({ rapport, technikerRows, materialRows, logoBase64 });
      const blob = await pdf(element).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${rapport.rapport_nummer}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("PDF konnte nicht erstellt werden.");
      console.error(e);
    }
    setPdfLoading(false);
  }

  if (loading) return <div className="p-8 text-center" style={{ color: "var(--muted-foreground)" }}>Wird geladen...</div>;
  if (!rapport) return <div className="p-8 text-center" style={{ color: "var(--muted-foreground)" }}>Rapport nicht gefunden.</div>;

  const rayon = rapport.fahrzeug_rayon_index != null ? FAHRZEUG_RAYONS[rapport.fahrzeug_rayon_index] : null;
  const hilfsmittelItems = (rapport.hilfsmittel_items || [])
    .map((aktiv, i) => (aktiv ? HILFSMITTEL_LISTE[i] : null))
    .filter((x): x is typeof HILFSMITTEL_LISTE[0] => x !== null);
  const pureLabor = technikerRows.reduce((s, t) => s + Number(t.total), 0);

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
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
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/rapporte/${rapport.id}/bearbeiten`)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
          >
            <Pencil size={14} /> Bearbeiten
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
            style={{ background: "var(--primary)", color: "white" }}
          >
            <FileDown size={15} /> {pdfLoading ? "Generiert..." : "PDF"}
          </button>
        </div>
      </div>

      <div className="space-y-5">
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
        {technikerRows.length > 0 && (
          <Card title="Arbeitsaufwand">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Techniker", "Stunden", "Stundensatz", "Total"].map(h => (
                    <th key={h} className="text-left pb-2 text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {technikerRows.map(t => (
                  <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="py-2" style={{ color: "var(--foreground)" }}>{t.techniker_name}</td>
                    <td className="py-2" style={{ color: "var(--foreground)" }}>{t.stunden}h</td>
                    <td className="py-2" style={{ color: "var(--foreground)" }}>{formatCHF(t.stundensatz)}/h</td>
                    <td className="py-2 font-medium" style={{ color: "var(--foreground)" }}>{formatCHF(Number(t.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* Fahrzeugpauschale */}
        {rayon && (
          <Card title="Fahrzeugpauschale">
            <div className="flex items-center justify-between text-sm">
              <div>
                <span style={{ color: "var(--foreground)" }}>{rayon.label}</span>
                <span className="ml-2 text-xs" style={{ color: "var(--muted-foreground)" }}>{rayon.beschreibung}</span>
                {rapport.fahrtzeit > 0 && (
                  <span className="ml-3 text-xs" style={{ color: "var(--muted-foreground)" }}>Fahrtzeit: {rapport.fahrtzeit} Min.</span>
                )}
              </div>
              <span className="font-medium" style={{ color: "var(--foreground)" }}>{formatCHF(rapport.fahrzeugpauschale)}</span>
            </div>
          </Card>
        )}

        {/* Hilfsmittel */}
        {hilfsmittelItems.length > 0 && (
          <Card title="Hilfsmittel">
            <div className="space-y-2">
              {hilfsmittelItems.map(h => (
                <div key={h.name} className="flex items-center justify-between text-sm">
                  <span style={{ color: "var(--foreground)" }}>{h.name}</span>
                  <span style={{ color: "var(--foreground)" }}>{formatCHF(h.preis)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Material */}
        {materialRows.length > 0 && (
          <Card title="Materialliste">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Anz.", "Typ", "Bezeichnung", "Einzelpreis", "Total"].map(h => (
                    <th key={h} className="text-left pb-2 text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {materialRows.map(m => (
                  <tr key={m.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="py-2" style={{ color: "var(--foreground)" }}>{m.menge}</td>
                    <td className="py-2" style={{ color: "var(--muted-foreground)" }}>{m.einheit}</td>
                    <td className="py-2" style={{ color: "var(--foreground)" }}>{m.bezeichnung}</td>
                    <td className="py-2" style={{ color: "var(--foreground)" }}>{formatCHF(Number(m.einzelpreis))}</td>
                    <td className="py-2 font-medium" style={{ color: "var(--foreground)" }}>{formatCHF(Number(m.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* Kosten */}
        <Card title="Kostenübersicht">
          <div className="space-y-2 max-w-sm ml-auto">
            {pureLabor > 0 && (
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--muted-foreground)" }}>Arbeitsaufwand</span>
                <span style={{ color: "var(--foreground)" }}>{formatCHF(pureLabor)}</span>
              </div>
            )}
            {rapport.fahrzeugpauschale > 0 && (
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--muted-foreground)" }}>Fahrzeugpauschale</span>
                <span style={{ color: "var(--foreground)" }}>{formatCHF(rapport.fahrzeugpauschale)}</span>
              </div>
            )}
            {rapport.hilfsmittel > 0 && (
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--muted-foreground)" }}>Hilfsmittel</span>
                <span style={{ color: "var(--foreground)" }}>{formatCHF(rapport.hilfsmittel)}</span>
              </div>
            )}
            {rapport.total_material > 0 && (
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--muted-foreground)" }}>Material</span>
                <span style={{ color: "var(--foreground)" }}>{formatCHF(rapport.total_material)}</span>
              </div>
            )}
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

      <p className="text-xs mt-4" style={{ color: "var(--muted-foreground)" }}>
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
