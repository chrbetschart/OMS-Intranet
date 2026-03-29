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

const OMS     = "#c5d200";   // OMS yellow-green
const DARK    = "#1a1a1a";
const GRAY    = "#6b7280";
const LGRAY   = "#9ca3af";
const BORDER  = "#e5e7eb";
const BGLIGHT = "#f9fafb";
const WHITE   = "#ffffff";

function chf(n: number) {
  return `CHF ${n.toFixed(2)}`;
}
function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const s = StyleSheet.create({
  page:         { fontFamily: "Helvetica", fontSize: 9, color: DARK, paddingTop: 0, paddingBottom: 50, paddingHorizontal: 0, backgroundColor: WHITE },

  // Top accent bar
  topBar:       { backgroundColor: OMS, height: 6 },

  // Header area
  headerArea:   { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 40, paddingTop: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: BORDER, borderBottomStyle: "solid", marginBottom: 16 },
  companyBlock: { flexDirection: "column" },
  companyName:  { fontSize: 13, fontFamily: "Helvetica-Bold", color: DARK },
  companyInfo:  { fontSize: 7.5, color: GRAY, marginTop: 1 },
  docBlock:     { alignItems: "flex-end" },
  docTitle:     { fontSize: 17, fontFamily: "Helvetica-Bold", color: DARK },
  docMeta:      { fontSize: 8, color: GRAY, marginTop: 2 },
  logoImg:      { width: 90, height: 36, objectFit: "contain", marginBottom: 4 },

  // Body padding
  body:         { paddingHorizontal: 40 },

  // Section
  section:      { marginBottom: 12 },
  secHeader:    { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  secBar:       { width: 3, height: 13, backgroundColor: OMS, marginRight: 6, borderRadius: 1 },
  secTitle:     { fontSize: 8, fontFamily: "Helvetica-Bold", color: DARK, textTransform: "uppercase", letterSpacing: 0.5 },

  // Info grid
  infoGrid:     { flexDirection: "row", flexWrap: "wrap" },
  infoCell:     { width: "33%", paddingRight: 8, marginBottom: 7 },
  infoCell2:    { width: "50%", paddingRight: 8, marginBottom: 7 },
  fieldLabel:   { fontSize: 6.5, color: LGRAY, marginBottom: 1.5, textTransform: "uppercase", letterSpacing: 0.3 },
  fieldValue:   { fontSize: 8.5, color: DARK },

  // Tables
  tHead:        { flexDirection: "row", backgroundColor: BGLIGHT, paddingVertical: 5, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: BORDER, borderTopStyle: "solid", borderBottomWidth: 1, borderBottomColor: BORDER, borderBottomStyle: "solid" },
  tRow:         { flexDirection: "row", paddingVertical: 4.5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: BORDER, borderBottomStyle: "solid" },
  tRowAlt:      { flexDirection: "row", paddingVertical: 4.5, paddingHorizontal: 8, backgroundColor: BGLIGHT, borderBottomWidth: 1, borderBottomColor: BORDER, borderBottomStyle: "solid" },
  tHCell:       { fontSize: 7, fontFamily: "Helvetica-Bold", color: GRAY, textTransform: "uppercase", letterSpacing: 0.2 },
  tCell:        { fontSize: 8.5, color: DARK },
  tCellGray:    { fontSize: 8.5, color: GRAY },

  // Notizen box
  notizenBox:   { backgroundColor: BGLIGHT, borderRadius: 3, padding: 10, borderLeftWidth: 2, borderLeftColor: OMS, borderLeftStyle: "solid" },
  notizenText:  { fontSize: 8.5, color: DARK, lineHeight: 1.6 },

  // Cost summary
  costBox:      { backgroundColor: BGLIGHT, borderRadius: 4, padding: 12, marginLeft: "auto", width: 220 },
  costRow:      { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  costLabel:    { fontSize: 8.5, color: GRAY },
  costValue:    { fontSize: 8.5, color: DARK },
  costDivider:  { borderTopWidth: 1.5, borderTopColor: OMS, borderTopStyle: "solid", marginVertical: 5 },
  costTotalRow: { flexDirection: "row", justifyContent: "space-between" },
  costTotalLbl: { fontSize: 11, fontFamily: "Helvetica-Bold", color: DARK },
  costTotalVal: { fontSize: 11, fontFamily: "Helvetica-Bold", color: DARK },

  // Signatures
  sigSection:   { flexDirection: "row", gap: 20, marginTop: 4 },
  sigBox:       { flex: 1 },
  sigLabel:     { fontSize: 7.5, color: GRAY, marginBottom: 4 },
  sigImg:       { height: 70, objectFit: "contain", objectPositionX: "left" },
  sigBlank:     { height: 70, backgroundColor: BGLIGHT, borderRadius: 3 },
  sigLine:      { borderTopWidth: 1, borderTopColor: BORDER, borderTopStyle: "solid", paddingTop: 4, marginTop: 4 },
  sigLineTxt:   { fontSize: 7, color: LGRAY },

  // Auftragstyp badge
  badge:        { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 3, marginTop: 5, alignSelf: "flex-end" },

  // Footer
  footer:       { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 40, paddingVertical: 10, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: BORDER, borderTopStyle: "solid" },
  footerTxt:    { fontSize: 6.5, color: LGRAY },
  footerAccent: { fontSize: 6.5, color: OMS, fontFamily: "Helvetica-Bold" },
});

const AUFTRAGSTYP_COLOR: Record<string, string> = {
  Abgeschlossen: "#15803d",
  Folgeauftrag:  "#b45309",
  Zusatzauftrag: "#1d4ed8",
};

interface RapportPDFProps {
  rapport: Rapport;
  technikerRows: RapportTechniker[];
  materialRows: RapportMaterial[];
  logoBase64?: string | null;
}

export function RapportPDF({ rapport, technikerRows, materialRows, logoBase64 }: RapportPDFProps) {
  const rayon = rapport.fahrzeug_rayon_index != null ? FAHRZEUG_RAYONS[rapport.fahrzeug_rayon_index] : null;
  const hilfsmittelItems = (rapport.hilfsmittel_items || [])
    .map((aktiv, i) => (aktiv ? HILFSMITTEL_LISTE[i] : null))
    .filter((x): x is typeof HILFSMITTEL_LISTE[0] => x !== null);

  const badgeColor = AUFTRAGSTYP_COLOR[rapport.auftragstyp] || "#888";
  const pureLabor = technikerRows.reduce((s, t) => s + Number(t.total), 0);

  return (
    <Document title={`Arbeitsrapport ${rapport.rapport_nummer}`} author="Ottiger Media Systeme AG">
      <Page size="A4" style={s.page}>

        {/* ── Accent bar ── */}
        <View style={s.topBar} />

        {/* ── Header ── */}
        <View style={s.headerArea}>
          <View style={s.companyBlock}>
            <Text style={s.companyName}>Ottiger Media Systeme AG</Text>
            <Text style={s.companyInfo}>Wernlisbach 1  |  4914 Roggwil</Text>
            <Text style={s.companyInfo}>info@oms-swiss.com  |  www.oms-swiss.com</Text>
          </View>
          <View style={s.docBlock}>
            {logoBase64 ? (
              <Image src={logoBase64} style={s.logoImg} />
            ) : null}
            <Text style={s.docTitle}>Arbeitsrapport</Text>
            <Text style={s.docMeta}>Nr: {rapport.rapport_nummer}</Text>
            <Text style={s.docMeta}>Datum: {fmtDate(rapport.datum)}</Text>
            <View style={{ ...s.badge, backgroundColor: badgeColor + "22" }}>
              <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: badgeColor }}>{rapport.auftragstyp}</Text>
            </View>
          </View>
        </View>

        {/* ── Body ── */}
        <View style={s.body}>

          {/* ── Kundendaten ── */}
          <View style={s.section}>
            <View style={s.secHeader}>
              <View style={s.secBar} />
              <Text style={s.secTitle}>Kundendaten</Text>
            </View>
            <View style={s.infoGrid}>
              <View style={s.infoCell2}>
                <Text style={s.fieldLabel}>Kundenname</Text>
                <Text style={s.fieldValue}>{rapport.kundenname || "—"}</Text>
              </View>
              <View style={s.infoCell2}>
                <Text style={s.fieldLabel}>Service- / Projektnummer</Text>
                <Text style={s.fieldValue}>{rapport.projekt_nummer || "—"}</Text>
              </View>
              <View style={s.infoCell2}>
                <Text style={s.fieldLabel}>Adresse</Text>
                <Text style={s.fieldValue}>{rapport.adresse || "—"}</Text>
              </View>
              <View style={s.infoCell}>
                <Text style={s.fieldLabel}>Telefon</Text>
                <Text style={s.fieldValue}>{rapport.telefon || "—"}</Text>
              </View>
              <View style={s.infoCell}>
                <Text style={s.fieldLabel}>E-Mail</Text>
                <Text style={s.fieldValue}>{rapport.email || "—"}</Text>
              </View>
            </View>
          </View>

          {/* ── Notizen / Durchgeführte Arbeiten ── */}
          {rapport.notizen && (
            <View style={s.section}>
              <View style={s.secHeader}>
                <View style={s.secBar} />
                <Text style={s.secTitle}>Durchgeführte Arbeiten / Notizen</Text>
              </View>
              <View style={s.notizenBox}>
                <Text style={s.notizenText}>{rapport.notizen}</Text>
              </View>
            </View>
          )}

          {/* ── Arbeitsaufwand ── */}
          {technikerRows.length > 0 && (
            <View style={s.section}>
              <View style={s.secHeader}>
                <View style={s.secBar} />
                <Text style={s.secTitle}>Arbeitsaufwand</Text>
              </View>
              <View style={s.tHead}>
                <Text style={{ ...s.tHCell, flex: 3 }}>Mitarbeiter / Funktion</Text>
                <Text style={{ ...s.tHCell, width: 42, textAlign: "right" }}>Stunden</Text>
                <Text style={{ ...s.tHCell, width: 68, textAlign: "right" }}>Stundenansatz</Text>
                <Text style={{ ...s.tHCell, width: 68, textAlign: "right" }}>Total</Text>
              </View>
              {technikerRows.map((t, i) => (
                <View key={t.id} style={i % 2 === 1 ? s.tRowAlt : s.tRow}>
                  <Text style={{ ...s.tCell, flex: 3 }}>{t.techniker_name}</Text>
                  <Text style={{ ...s.tCell, width: 42, textAlign: "right" }}>{t.stunden}h</Text>
                  <Text style={{ ...s.tCellGray, width: 68, textAlign: "right" }}>{chf(t.stundensatz)}/h</Text>
                  <Text style={{ ...s.tCell, width: 68, textAlign: "right" }}>{chf(Number(t.total))}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Fahrzeugpauschale ── */}
          {rayon && (
            <View style={s.section}>
              <View style={s.secHeader}>
                <View style={s.secBar} />
                <Text style={s.secTitle}>Fahrzeugpauschale</Text>
              </View>
              <View style={s.tRow}>
                <Text style={{ ...s.tCell, flex: 1 }}>
                  {rayon.label}{"  "}
                  <Text style={s.tCellGray}>({rayon.beschreibung})</Text>
                  {rapport.fahrtzeit ? (
                    <Text style={s.tCellGray}>{"   Fahrtzeit: "}{rapport.fahrtzeit}{" Min."}</Text>
                  ) : null}
                </Text>
                <Text style={{ ...s.tCell, width: 80, textAlign: "right" }}>{chf(rayon.preis)}</Text>
              </View>
            </View>
          )}

          {/* ── Hilfsmittel ── */}
          {hilfsmittelItems.length > 0 && (
            <View style={s.section}>
              <View style={s.secHeader}>
                <View style={s.secBar} />
                <Text style={s.secTitle}>Hilfsmittel</Text>
              </View>
              {hilfsmittelItems.map((h, i) => (
                <View key={i} style={i % 2 === 1 ? s.tRowAlt : s.tRow}>
                  <Text style={{ ...s.tCell, flex: 1 }}>{h.name}</Text>
                  <Text style={{ ...s.tCell, width: 80, textAlign: "right" }}>{chf(h.preis)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Materialliste ── */}
          {materialRows.length > 0 && (
            <View style={s.section}>
              <View style={s.secHeader}>
                <View style={s.secBar} />
                <Text style={s.secTitle}>Materialliste</Text>
              </View>
              <View style={s.tHead}>
                <Text style={{ ...s.tHCell, width: 28 }}>Anz.</Text>
                <Text style={{ ...s.tHCell, width: 50 }}>Einheit</Text>
                <Text style={{ ...s.tHCell, flex: 1 }}>Bezeichnung</Text>
                <Text style={{ ...s.tHCell, width: 68, textAlign: "right" }}>Einzelpreis</Text>
                <Text style={{ ...s.tHCell, width: 68, textAlign: "right" }}>Total</Text>
              </View>
              {materialRows.map((m, i) => (
                <View key={m.id} style={i % 2 === 1 ? s.tRowAlt : s.tRow}>
                  <Text style={{ ...s.tCell, width: 28 }}>{m.menge}</Text>
                  <Text style={{ ...s.tCellGray, width: 50 }}>{m.einheit || "—"}</Text>
                  <Text style={{ ...s.tCell, flex: 1 }}>{m.bezeichnung}</Text>
                  <Text style={{ ...s.tCellGray, width: 68, textAlign: "right" }}>{chf(Number(m.einzelpreis))}</Text>
                  <Text style={{ ...s.tCell, width: 68, textAlign: "right" }}>{chf(Number(m.total))}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Kostenübersicht ── */}
          <View style={s.section}>
            <View style={s.secHeader}>
              <View style={s.secBar} />
              <Text style={s.secTitle}>Kostenübersicht</Text>
            </View>
            <View style={s.costBox}>
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
              <View style={s.costDivider} />
              <View style={s.costTotalRow}>
                <Text style={s.costTotalLbl}>Total CHF</Text>
                <Text style={s.costTotalVal}>{chf(rapport.total_gesamt)}</Text>
              </View>
            </View>
          </View>

          {/* ── Unterschriften ── */}
          <View style={s.section}>
            <View style={s.secHeader}>
              <View style={s.secBar} />
              <Text style={s.secTitle}>Unterschriften</Text>
            </View>
            <View style={s.sigSection}>
              <View style={s.sigBox}>
                <Text style={s.sigLabel}>Auftraggeber</Text>
                {rapport.auftraggeber_unterschrift
                  ? <Image src={rapport.auftraggeber_unterschrift} style={s.sigImg} />
                  : <View style={s.sigBlank} />}
                <View style={s.sigLine}>
                  <Text style={s.sigLineTxt}>Unterschrift Auftraggeber / Datum</Text>
                </View>
              </View>
              <View style={s.sigBox}>
                <Text style={s.sigLabel}>Techniker</Text>
                {rapport.techniker_unterschrift
                  ? <Image src={rapport.techniker_unterschrift} style={s.sigImg} />
                  : <View style={s.sigBlank} />}
                <View style={s.sigLine}>
                  <Text style={s.sigLineTxt}>Unterschrift Techniker</Text>
                </View>
              </View>
            </View>
          </View>

        </View>

        {/* ── Footer (fixed) ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerTxt}>Ottiger Media Systeme AG  |  Wernlisbach 1, 4914 Roggwil</Text>
          <Text style={s.footerTxt}>
            <Text style={s.footerAccent}>{rapport.rapport_nummer}</Text>
            {"  |  "}{fmtDate(rapport.datum)}
          </Text>
        </View>

      </Page>
    </Document>
  );
}
