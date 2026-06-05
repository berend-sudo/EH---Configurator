import path from "path";
import {
  Document,
  Page,
  View,
  Text,
  Svg,
  Polygon,
  Polyline,
  Line,
  Image,
  Font,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { FloorplanJSON } from "@/types/floorplan";
import type { RoomColorKey } from "@/lib/rooms";
import { BASE_COUNTRY, fmtMoney, type Country } from "@/lib/countries";
import { TYPOLOGIES, type TypologyId } from "@/lib/typologies";
import { BRAND_IMAGES } from "@/lib/brand-images";
import {
  furniturePhotoFile,
  typologyPhotoFile,
} from "@/lib/server/brand-images";

// ── Brand tokens (mirrors eh-tokens.css) ───────────────────────────────────
const C = {
  green: "#4DCC7A",
  green200: "#A6E8BE",
  green700: "#157A3C",
  green900: "#003B2B",
  stroke: "#E7EAE5",
  bgAlt: "#FAF9F6",
  text: "#003B2B",
  muted: "#4A5C56",
  living: "#F5ECD7",
  bath: "#E8F4F8",
  terrace: "#D4C4A0",
};

const ROOM_COLORS: Record<RoomColorKey, string> = {
  living: C.living,
  bath: C.bath,
  terrace: C.terrace,
};

// Indicative per-m² CO₂ saving for an EH timber-framed home vs. an
// equivalent concrete-block build. The brand carbon claim has historically
// been a per-home figure (~26 t for a sample home); this is the per-m²
// equivalent so the climate box scales with the configured design.
// TODO(carbon): replace with a confirmed per-typology figure from the
// embodied-carbon model when ready.
const CO2_SAVING_PER_M2_KG = 250;

export interface DesignPdfData {
  plan: FloorplanJSON;
  delta: number;
  label: string;
  bedrooms: number;
  /** Drives the cover's exterior photo (left half) — picks the canonical
   *  shot from BRAND_IMAGES.typology[t]. */
  typology: TypologyId;
  reference: string;
  generatedDate: string;
  client: { name: string; email: string };
  dimensions: { widthM: number; lengthM: number; footprintM2: number };
  /**
   * Single source-of-truth indicative budget in UGX — the same figure the
   * user saw in the configurator (calculateBudget(...).coreTotal). Printed
   * once on the cover and once on the spec page; no derived totals.
   */
  indicativeBudgetUgx: number;
  rooms: { name: string; areaM2: number; colorKey: RoomColorKey }[];
  /**
   * Country picked at the gate. Drives the primary money column on the spec
   * sheet + the headline budget on the cover. The UGX equivalent is still
   * shown in small print on the cover so architects can cross-check against
   * the source-of-truth figure.
   */
  country: Country;
}

// Stable string hash so the cover's interior shot is deterministic per
// design (same reference → same shot every regeneration) but varies across
// designs. djb2-style; the unsigned shift makes the result non-negative.
function hashRef(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

// ── Fonts (best-effort; falls back to Helvetica if registration fails) ──────
let FONT = "Helvetica";
let FONT_BOLD = "Helvetica-Bold";
try {
  const fontDir = path.join(process.cwd(), "public", "fonts");
  Font.register({
    family: "Poppins",
    fonts: [
      { src: path.join(fontDir, "Poppins-Light.ttf"), fontWeight: 300 },
      { src: path.join(fontDir, "Poppins-Regular.ttf"), fontWeight: 400 },
      { src: path.join(fontDir, "Poppins-Medium.ttf"), fontWeight: 500 },
      { src: path.join(fontDir, "Poppins-SemiBold.ttf"), fontWeight: 600 },
      { src: path.join(fontDir, "Poppins-Bold.ttf"), fontWeight: 700 },
    ],
  });
  FONT = "Poppins";
  FONT_BOLD = "Poppins";
} catch {
  // keep Helvetica fallback
}

const logoWhite = path.join(process.cwd(), "public", "brand", "logo-full-white.png");
const logoColor = path.join(process.cwd(), "public", "brand", "logo-full-color.png");

const styles = StyleSheet.create({
  page: { fontFamily: FONT, color: C.text, fontSize: 11, fontWeight: 300 },
  eyebrow: { fontSize: 8, letterSpacing: 1.2, color: C.muted, fontWeight: 600 },
  h1: { fontSize: 30, fontWeight: 600, fontFamily: FONT_BOLD },
  h2: { fontSize: 20, fontWeight: 600, fontFamily: FONT_BOLD },
});

// Footer pinned to the page bottom (the prompt's "footer at the page margin,
// not wherever content ends" rule). Each Page reserves matching paddingBottom.
const FOOTER_HEIGHT = 36;

function PageFooter({ left, right }: { left: string; right: string }) {
  return (
    <View
      fixed
      style={{
        position: "absolute",
        left: 36,
        right: 36,
        bottom: 14,
        borderTopWidth: 1,
        borderTopColor: C.stroke,
        paddingTop: 8,
        flexDirection: "row",
        justifyContent: "space-between",
      }}
    >
      <Text style={{ fontSize: 8, color: C.muted }}>{left}</Text>
      <Text style={{ fontSize: 8, color: C.muted }}>{right}</Text>
    </View>
  );
}

// ── Floor-plan SVG (rooms filled + walls), simplified for the brief ─────────
function vx(v: { x: number; moveX: boolean }, delta: number) {
  return v.x + (v.moveX ? delta : 0);
}

function PlanSvg({ plan, delta, maxW = 480, maxH = 300 }: { plan: FloorplanJSON; delta: number; maxW?: number; maxH?: number }) {
  const worldW = plan.baseWidth + delta;
  const worldH = plan.baseDepth;
  const pad = 8;
  const scale = Math.min((maxW - 2 * pad) / worldW, (maxH - 2 * pad) / worldH);
  const drawW = worldW * scale;
  const drawH = worldH * scale;
  const svgW = drawW + 2 * pad;
  const svgH = drawH + 2 * pad;
  const sx = (x: number) => x * scale + pad;
  const sy = (y: number) => pad + drawH - y * scale;

  const rooms: { pts: string; fill: string }[] = [];
  const wallsClosed: string[] = [];
  const wallsOpen: string[] = [];

  for (const layer of plan.layers) {
    if (layer.name.startsWith("Rooms")) {
      const fill = layer.name.includes("Bath")
        ? C.bath
        : layer.name.includes("Terrace")
        ? C.terrace
        : C.living;
      for (const e of layer.entities) {
        if (e.type !== "polyline" || !e.closed) continue;
        rooms.push({ pts: e.vertices.map((v) => `${sx(vx(v, delta))},${sy(v.y)}`).join(" "), fill });
      }
    } else if (layer.name === "Walls") {
      for (const e of layer.entities) {
        if (e.type !== "polyline") continue;
        const pts = e.vertices.map((v) => `${sx(vx(v, delta))},${sy(v.y)}`).join(" ");
        if (e.closed) wallsClosed.push(pts);
        else wallsOpen.push(pts);
      }
    }
  }

  return (
    <Svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
      {rooms.map((r, i) => (
        <Polygon key={`r${i}`} points={r.pts} fill={r.fill} stroke={C.stroke} strokeWidth={0.5} />
      ))}
      {wallsClosed.map((p, i) => (
        <Polygon key={`wc${i}`} points={p} fill={C.green900} stroke={C.green900} strokeWidth={0.6} />
      ))}
      {wallsOpen.map((p, i) => (
        <Polyline key={`wo${i}`} points={p} fill="none" stroke={C.green900} strokeWidth={1} />
      ))}
      {/* Overall dimension ticks */}
      <Line x1={pad} y1={svgH - 2} x2={svgW - pad} y2={svgH - 2} stroke={C.muted} strokeWidth={0.5} />
    </Svg>
  );
}

function bedroomDescriptor(bedrooms: number): string {
  if (bedrooms === 0) return "Studio";
  if (bedrooms === 1) return "1-bedroom";
  return `${bedrooms}-bedroom`;
}

function CoverPage(d: DesignPdfData) {
  return (
    <Page size="A4" style={{ ...styles.page, paddingBottom: FOOTER_HEIGHT }} wrap={false}>
      <View style={{ backgroundColor: C.green900, paddingVertical: 24, paddingHorizontal: 36, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Image src={logoWhite} style={{ height: 18, objectFit: "contain" }} />
        <Text style={{ fontSize: 8, letterSpacing: 1.4, color: C.green200, fontWeight: 600 }}>
          DESIGN BRIEF · {new Date().getFullYear()}
        </Text>
      </View>

      {/* Half/half exterior + interior — the social-grid motif from p.15 of
          the brand guide. No gap, no green strip between cells: the seam
          IS the composition. */}
      <View style={{ flexGrow: 1, flexDirection: "row" }}>
        <View style={{ flex: 1, position: "relative" }}>
          <Image
            src={typologyPhotoFile(d.typology, 0)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <View style={{ position: "absolute", left: 14, bottom: 12 }}>
            <Text style={{ fontSize: 8, letterSpacing: 1.2, color: "#fff", fontWeight: 600 }}>
              {TYPOLOGIES[d.typology].label.toUpperCase()} · EASY HOUSING PROJECT
            </Text>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Image
            src={furniturePhotoFile(hashRef(d.reference) % BRAND_IMAGES.furniture.length)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </View>
      </View>

      <View style={{ backgroundColor: "#fff", paddingHorizontal: 36, paddingTop: 30, paddingBottom: 22 }} wrap={false}>
        <Text style={{ fontSize: 9, letterSpacing: 1.4, color: C.green700, fontWeight: 600 }}>
          CONFIGURATOR OUTPUT
        </Text>
        <Text style={{ ...styles.h1, marginTop: 6 }}>{d.label}</Text>
        <Text style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
          {bedroomDescriptor(d.bedrooms)} · Footprint {d.dimensions.footprintM2.toFixed(2)} m² · Indicative budget {fmtMoney(d.indicativeBudgetUgx, d.country)}
        </Text>
        {d.country.code !== BASE_COUNTRY.code && (
          // UGX equivalent in small print — architects price in UGX, the
          // client saw the local figure on screen. Both belong on the
          // build file.
          <Text style={{ fontSize: 9, color: C.muted, marginTop: 4 }}>
            ≈ {fmtMoney(d.indicativeBudgetUgx, BASE_COUNTRY)} at 1 {d.country.currency.code} ≈ {d.country.ugxPerUnit} UGX
          </Text>
        )}

        <View style={{ height: 1, backgroundColor: C.stroke, marginVertical: 18 }} />

        <View style={{ flexDirection: "row" }}>
          <View style={{ flex: 1 }} wrap={false}>
            <Text style={styles.eyebrow}>PREPARED FOR</Text>
            <Text style={{ fontSize: 13, fontWeight: 600, marginTop: 4, fontFamily: FONT_BOLD }}>{d.client.name}</Text>
            <Text style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{d.client.email}</Text>
          </View>
          <View style={{ flex: 1 }} wrap={false}>
            <Text style={styles.eyebrow}>REFERENCE</Text>
            <Text style={{ fontSize: 13, fontWeight: 600, marginTop: 4, fontFamily: FONT_BOLD }}>{d.reference}</Text>
            <Text style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Generated {d.generatedDate}</Text>
          </View>
        </View>
      </View>

      <PageFooter left="A home for everyone, Easy Housing" right="1 / 3" />
    </Page>
  );
}

function PlanPage(d: DesignPdfData) {
  return (
    <Page size="A4" style={{ ...styles.page, paddingTop: 28, paddingHorizontal: 36, paddingBottom: FOOTER_HEIGHT }} wrap={false}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }} wrap={false}>
        <Image src={logoColor} style={{ height: 16, objectFit: "contain" }} />
        <Text style={styles.eyebrow}>FLOOR PLAN</Text>
      </View>

      <View style={{ marginTop: 16 }} wrap={false}>
        <Text style={styles.h2}>Plan view.</Text>
        <Text style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
          {d.dimensions.widthM.toFixed(2)} m × {d.dimensions.lengthM.toFixed(2)} m · all dimensions in metres
        </Text>
      </View>

      <View style={{ flexGrow: 1, backgroundColor: C.bgAlt, borderWidth: 1, borderColor: C.stroke, borderRadius: 14, padding: 18, marginTop: 16, justifyContent: "center", alignItems: "center" }}>
        <PlanSvg plan={d.plan} delta={d.delta} maxW={480} maxH={420} />
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 16 }}>
        {d.rooms.map((r, i) => (
          <View key={i} wrap={false} style={{ width: "25%", flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
            <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: ROOM_COLORS[r.colorKey], borderWidth: 1, borderColor: C.stroke, marginRight: 8 }} />
            <View>
              <Text style={{ fontSize: 9, color: C.muted }}>{r.name}</Text>
              <Text style={{ fontSize: 11, fontWeight: 600, fontFamily: FONT_BOLD }}>{r.areaM2.toFixed(2)} m²</Text>
            </View>
          </View>
        ))}
      </View>

      <PageFooter left={`${d.reference} · ${d.label}`} right="2 / 3" />
    </Page>
  );
}

function SpecPage(d: DesignPdfData) {
  // Per-design CO₂ saving (timber-framed vs. concrete block), scaled from
  // the footprint by CO2_SAVING_PER_M2_KG. See the constant above for the
  // TODO on confirming the per-typology figure.
  const co2Tonnes = Math.max(1, Math.round((d.dimensions.footprintM2 * CO2_SAVING_PER_M2_KG) / 1000));
  // Equivalent km of plane travel — same rule of thumb the brand has used
  // since the 2022 guidelines (~5 t CO₂ / 25,000 km long-haul).
  const flightKm = co2Tonnes * 5000;
  return (
    <Page size="A4" style={{ ...styles.page, paddingTop: 28, paddingHorizontal: 36, paddingBottom: FOOTER_HEIGHT }} wrap={false}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }} wrap={false}>
        <Image src={logoColor} style={{ height: 16, objectFit: "contain" }} />
        <Text style={styles.eyebrow}>SPEC & BUDGET</Text>
      </View>

      <View style={{ marginTop: 16 }} wrap={false}>
        <Text style={styles.h2}>Spec sheet.</Text>
        <Text style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
          Indicative budget — final pricing depends on site &amp; local sourcing.
        </Text>
      </View>

      {/* Headline indicative-budget figure — same number as the cover. No
          line-item table: the per-category cost breakdown the configurator
          used to expose was illustrative and contradicted the cover's
          total; a single figure is the brief. */}
      <View
        wrap={false}
        style={{
          marginTop: 22,
          padding: "24px 24px",
          backgroundColor: C.bgAlt,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: C.stroke,
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flex: 1, paddingRight: 16 }}>
          <Text style={styles.eyebrow}>INDICATIVE BUDGET</Text>
          <Text style={{ fontSize: 11, color: C.muted, marginTop: 6, fontWeight: 300 }}>
            {bedroomDescriptor(d.bedrooms)} · {d.dimensions.widthM.toFixed(2)} m × {d.dimensions.lengthM.toFixed(2)} m · concrete pad {d.dimensions.footprintM2.toFixed(2)} m²
          </Text>
        </View>
        <Text style={{ fontSize: 26, fontWeight: 600, color: C.green900, fontFamily: FONT_BOLD }}>
          {fmtMoney(d.indicativeBudgetUgx, d.country)}
        </Text>
      </View>

      {/* Furniture ribbon — three thumbs of how the home wears in. Sits
          between the budget figure and the climate band so the eye lifts
          off the price before the CO₂ message. */}
      <View style={{ flexDirection: "row", marginTop: 18, gap: 8 }} wrap={false}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            wrap={false}
            style={{ flex: 1, height: 84, borderRadius: 12, overflow: "hidden" }}
          >
            <Image
              src={furniturePhotoFile(i)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 9, color: C.muted, marginTop: 6 }}>
        Plywood lining, compact fittings — built to live in.
      </Text>

      <View
        wrap={false}
        style={{
          backgroundColor: C.green900,
          borderRadius: 14,
          padding: 18,
          marginTop: 18,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ fontSize: 8, letterSpacing: 1.4, color: C.green200, fontWeight: 600 }}>
            CLIMATE IMPACT
          </Text>
          <Text style={{ fontSize: 12, color: "#fff", marginTop: 6, fontWeight: 300 }}>
            Reduces <Text style={{ fontWeight: 600 }}>{co2Tonnes} tonnes of CO₂</Text> compared with
            concrete-block construction — equivalent to roughly {flightKm.toLocaleString("en-US")} km of plane travel.
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text
            style={{
              fontSize: 42,
              fontWeight: 600,
              color: C.green,
              fontFamily: FONT_BOLD,
              letterSpacing: -0.5,
            }}
          >
            −{co2Tonnes}
          </Text>
          <Text style={{ fontSize: 10, color: C.green200, marginTop: -4 }}>t CO₂</Text>
        </View>
      </View>

      <PageFooter
        left={`A home for everyone, Easy Housing · ${d.reference}`}
        right="3 / 3"
      />
    </Page>
  );
}

function DesignDocument(d: DesignPdfData) {
  return (
    <Document title={`Easy Housing — ${d.label}`} author="Easy Housing">
      {CoverPage(d)}
      {PlanPage(d)}
      {SpecPage(d)}
    </Document>
  );
}

export async function renderDesignPdf(data: DesignPdfData): Promise<Buffer> {
  return renderToBuffer(DesignDocument(data));
}
