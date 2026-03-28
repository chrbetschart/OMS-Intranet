import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { Rapport, RapportTechniker, RapportMaterial } from "@/types/database";

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

const BLUE = "#1e40af";
const BLUE_BG = "#eff6ff";
const GRAY = "#6b7280";
const DARK = "#111827";
const BORDER = "#e5e7eb";
const WHITE = "#ffffff";

function chf(n: number) {
  return `CHF ${n.toFixed(2)}`;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const s = StyleSheet.create({
  page:          { fontFamily: "Helvetica", fontSize: 9, color: DARK, paddingTop: 35, paddingBottom: 50, paddingHorizontal: 40, backgroundColor: WHITE },
  // Header
  header:        { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: BLUE, borderBottomStyle: "solid" },
  brand:         { fontSize: 20, fontFamily: "Helvetica-Bold", color: BLUE },
  brandSub:      { fontSize: 8, color: GRAY, marginTop: 2 },
  docTitle:      { fontSize: 20, fontFamily: "Helvetica-Bold", color: DARK, textAlign: "right" },
  docMeta:       { fontSize: 9, color: GRAY, textAlign: "right", marginTop: 2 },
  badge:         { marginTop: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, alignSelf: "flex-end" },
  // Section
  section:       { marginBottom: 14 },
  secTitle:      { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: WHITE, backgroundColor: BLUE, paddingVertical: 3, paddingHorizontal: 8, marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.8 },
  // Grid
  row2:          { flexDirection: "row", marginBottom: 7 },
  col:           { flex: 1, paddingRight: 10 },
  fieldLabel:    { fontSize: 7, color: GRAY, marginBottom: 1, textTransform: "uppercase", letterSpacing: 0.3 },
  fieldValue:    { fontSize: 9, color: DARK },
  // Table
  tHead:         { flexDirection: "row", backgroundColor: BLUE_BG, paddingVertical: 5, paddingHorizontal: 6 },
  tRow:          { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: BORDER, borderBottomStyle: "solid" },
  tHCell:        { fontSize: 7, fontFamily: "Helvetica-Bold", color: BLUE, textTransform: "uppercase", letterSpacing: 0.3 },
  tCell:         { fontSize: 8.5, color: DARK },
  // Cost summary
  costRow:       { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2, width: 200 },
  costLabel:     { fontSize: 9, color: GRAY },
  costValue:     { fontSize: 9, color: DARK },
  costTotalRow:  { flexDirection: "row", justifyContent: "space-between", paddingTop: 5, marginTop: 3, width: 200, borderTopWidth: 2, borderTopColor: BLUE, borderTopStyle: "solid" },
  costTotalLbl:  { fontSize: 11, fontFamily: "Helvetica-Bold", color: DARK },
  costTotalVal:  { fontSize: 11, fontFamily: "Helvetica-Bold", color: BLUE },
  // Signatures
  sigRow:        { flexDirection: "row", marginTop: 6 },
  sigBox:        { flex: 1, paddingRight: 15 },
  sigImg:        { height: 80, objectFit: "contain" },
  sigBlank:      { height: 80 },
  sigLine:       { borderTopWidth: 1, borderTopColor: BORDER, borderTopStyle: "solid", paddingTop: 3, marginTop: 4 },
  sigLabel:      { fontSize: 7.5, color: GRAY },
  // Footer
  footer:        { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: BORDER, borderTopStyle: "solid", paddingTop: 5 },
  footerTxt:     { fontSize: 7, color: GRAY },
});

interface RapportPDFProps {
  rapport: Rapport;
  technikerRows: RapportTechniker[];
  materialRows: RapportMaterial[];
}

const AUFTRAGSTYP_COLOR: Record<string, string> = {
  Abgeschlossen: "#15803d",
  Folgeauftrag:  "#b45309",
  Zusatzauftrag: "#1d4ed8",
};

export function RapportPDF({ rapport, technikerRows, materialRows }: RapportPDFProps) {
  const rayon = rapport.fahrzeug_rayon_index != null ? FAHRZEUG_RAYONS[rapport.fahrzeug_rayon_index] : null;
  const hilfsmittelItems = (rapport.hilfsmittel_items || [])
    .map((aktiv, i) => (aktiv ? HILFSMITTEL_LISTE[i] : null))
    .filter((x): x is typeof HILFSMITTEL_LISTE[0] => x !== null);

  const badgeColor = AUFTRAGSTYP_COLOR[rapport.auftragstyp] || BLUE;

  // Pure labor cost (techniker totals, without Fahrzeug + Hilfsmittel)
  const pureLabor = technikerRows.reduce((s, t) => s + Number(t.total), 0);

  return (
    <Document title={`Arbeitsrapport ${rapport.rapport_nummer}`} author="Ottiger Media Systeme AG">
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>OMS</Text>
            <Text style={s.brandSub}>Ottiger Media Systeme AG</Text>
          </View>
          <View>
            <Text style={s.docTitle}>Arbeitsrapport</Text>
            <Text style={s.docMeta}>Nr: {rapport.rapport_nummer}</Text>
            <Text style={s.docMeta}>Datum: {fmtDate(rapport.datum)}</Text>
            <View style={{ ...s.badge, backgroundColor: badgeColor + "22" }}>
              <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: badgeColor }}>{rapport.auftragstyp}</Text>
            </View>
          </View>
        </View>

        {/* ── Kundendaten ── */}
        <View style={s.section}>
          <Text style={s.secTitle}>Kundendaten</Text>
          <View style={s.row2}>
            <View style={s.col}>
              <Text style={s.fieldLabel}>Kundenname</Text>
              <Text style={s.fieldValue}>{rapport.kundenname}</Text>
            </View>
            <View style={s.col}>
              <Text style={s.fieldLabel}>Service / Projektnummer</Text>
              <Text style={s.fieldValue}>{rapport.projekt_nummer || "—"}</Text>
            </View>
          </View>
          <View style={s.row2}>
            <View style={s.col}>
              <Text style={s.fieldLabel}>Adresse</Text>
              <Text style={s.fieldValue}>{rapport.adresse || "—"}</Text>
            </View>
            <View style={s.col}>
              <Text style={s.fieldLabel}>Telefon</Text>
              <Text style={s.fieldValue}>{rapport.telefon || "—"}</Text>
            </View>
            <View style={s.col}>
              <Text style={s.fieldLabel}>E-Mail</Text>
              <Text style={s.fieldValue}>{rapport.email || "—"}</Text>
            </View>
          </View>
        </View>

        {/* ── Arbeitsaufwand ── */}
        {technikerRows.length > 0 && (
          <View style={s.section}>
            <Text style={s.secTitle}>Arbeitsaufwand</Text>
            <View style={s.tHead}>
              <Text style={{ ...s.tHCell, flex: 3 }}>Mitarbeiter / Funktion</Text>
              <Text style={{ ...s.tHCell, width: 45, textAlign: "right" }}>Stunden</Text>
              <Text style={{ ...s.tHCell, width: 70, textAlign: "right" }}>Stundenansatz</Text>
              <Text style={{ ...s.tHCell, width: 70, textAlign: "right" }}>Total</Text>
            </View>
            {technikerRows.map(t => (
              <View key={t.id} style={s.tRow}>
                <Text style={{ ...s.tCell, flex: 3 }}>{t.techniker_name}</Text>
                <Text style={{ ...s.tCell, width: 45, textAlign: "right" }}>{t.stunden}h</Text>
                <Text style={{ ...s.tCell, width: 70, textAlign: "right" }}>{chf(t.stundensatz)}/h</Text>
                <Text style={{ ...s.tCell, width: 70, textAlign: "right" }}>{chf(Number(t.total))}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Fahrzeugpauschale ── */}
        {rayon && (
          <View style={s.section}>
            <Text style={s.secTitle}>Fahrzeugpauschale</Text>
            <View style={s.tRow}>
              <Text style={{ ...s.tCell, flex: 3 }}>
                {rayon.label} — {rayon.beschreibung}
                {rapport.fahrtzeit ? `  |  Fahrtzeit: ${rapport.fahrtzeit} Min.` : ""}
              </Text>
              <Text style={{ ...s.tCell, width: 70, textAlign: "right" }}>{chf(rayon.preis)}</Text>
            </View>
          </View>
        )}

        {/* ── Hilfsmittel ── */}
        {hilfsmittelItems.length > 0 && (
          <View style={s.section}>
            <Text style={s.secTitle}>Hilfsmittel</Text>
            {hilfsmittelItems.map((h, i) => (
              <View key={i} style={s.tRow}>
                <Text style={{ ...s.tCell, flex: 3 }}>{h.name}</Text>
                <Text style={{ ...s.tCell, width: 70, textAlign: "right" }}>{chf(h.preis)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Materialliste ── */}
        {materialRows.length > 0 && (
          <View style={s.section}>
            <Text style={s.secTitle}>Materialliste</Text>
            <View style={s.tHead}>
              <Text style={{ ...s.tHCell, width: 30 }}>Anz.</Text>
              <Text style={{ ...s.tHCell, width: 55 }}>Typ</Text>
              <Text style={{ ...s.tHCell, flex: 1 }}>Bezeichnung</Text>
              <Text style={{ ...s.tHCell, width: 70, textAlign: "right" }}>Einzelpreis</Text>
              <Text style={{ ...s.tHCell, width: 70, textAlign: "right" }}>Total</Text>
            </View>
            {materialRows.map(m => (
              <View key={m.id} style={s.tRow}>
                <Text style={{ ...s.tCell, width: 30 }}>{m.menge}</Text>
                <Text style={{ ...s.tCell, width: 55 }}>{m.einheit || "—"}</Text>
                <Text style={{ ...s.tCell, flex: 1 }}>{m.bezeichnung}</Text>
                <Text style={{ ...s.tCell, width: 70, textAlign: "right" }}>{chf(Number(m.einzelpreis))}</Text>
                <Text style={{ ...s.tCell, width: 70, textAlign: "right" }}>{chf(Number(m.total))}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Notizen ── */}
        {rapport.notizen && (
          <View style={s.section}>
            <Text style={s.secTitle}>Notizen / Durchgeführte Arbeiten</Text>
            <Text style={{ ...s.fieldValue, lineHeight: 1.6, paddingHorizontal: 6 }}>{rapport.notizen}</Text>
          </View>
        )}

        {/* ── Kostenübersicht ── */}
        <View style={s.section}>
          <Text style={s.secTitle}>Kostenübersicht</Text>
          <View style={{ alignItems: "flex-end" }}>
            {pureLabor > 0 && (
              <View style={s.costRow}>
                <Text style={s.costLabel}>Arbeitsaufwand</Text>
                <Text style={s.costValue}>{chf(pureLabor)}</Text>
              </View>
            )}
            {rapport.fahrzeugpauschale > 0 && (
              <View style={s.costRow}>
                <Text style={s.costLabel}>Fahrzeugpauschale</Text>
                <Text style={s.costValue}>{chf(rapport.fahrzeugpauschale)}</Text>
              </View>
            )}
            {rapport.hilfsmittel > 0 && (
              <View style={s.costRow}>
                <Text style={s.costLabel}>Hilfsmittel</Text>
                <Text style={s.costValue}>{chf(rapport.hilfsmittel)}</Text>
              </View>
            )}
            {rapport.total_material > 0 && (
              <View style={s.costRow}>
                <Text style={s.costLabel}>Material</Text>
                <Text style={s.costValue}>{chf(rapport.total_material)}</Text>
              </View>
            )}
            <View style={s.costTotalRow}>
              <Text style={s.costTotalLbl}>Total CHF</Text>
              <Text style={s.costTotalVal}>{chf(rapport.total_gesamt)}</Text>
            </View>
          </View>
        </View>

        {/* ── Unterschriften ── */}
        <View style={s.section}>
          <Text style={s.secTitle}>Unterschriften</Text>
          <View style={s.sigRow}>
            <View style={s.sigBox}>
              {rapport.auftraggeber_unterschrift
                ? <Image src={rapport.auftraggeber_unterschrift} style={s.sigImg} />
                : <View style={s.sigBlank} />}
              <View style={s.sigLine}>
                <Text style={s.sigLabel}>Unterschrift Auftraggeber / Datum</Text>
              </View>
            </View>
            <View style={s.sigBox}>
              {rapport.techniker_unterschrift
                ? <Image src={rapport.techniker_unterschrift} style={s.sigImg} />
                : <View style={s.sigBlank} />}
              <View style={s.sigLine}>
                <Text style={s.sigLabel}>Unterschrift Techniker</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Footer (fixed on every page) ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerTxt}>Ottiger Media Systeme AG — Arbeitsrapport</Text>
          <Text style={s.footerTxt}>{rapport.rapport_nummer}  |  {fmtDate(rapport.datum)}</Text>
        </View>

      </Page>
    </Document>
  );
}
