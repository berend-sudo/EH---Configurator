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
import type { BudgetLineItem } from "@/lib/budget";
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
  budget: {
    core: BudgetLineItem[];
    optional: BudgetLineItem[];
    coreTotal: number;
    grandTotal: number;
  };
  rooms: { name: string; areaM2: number; colorKey: RoomColorKey }[];
  /**
   * Country picked at the gate. Drives the primary money column on the spec
   * sheet + the headline budget on the cover. The UGX equivalent is still
   * shown in small print on the cover so architects can cross-check against
   * the source-of-truth figure.
   */
  country: Country;
}

const fmtNum = (n: number) => Math.round(n).toLocaleString("en-US");

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

function CoverPage(d: DesignPdfData) {
  return (
    <Page size="A4" style={styles.page}>
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

      <View style={{ backgroundColor: "#fff", paddingHorizontal: 36, paddingTop: 30, paddingBottom: 22 }}>
        <Text style={{ fontSize: 9, letterSpacing: 1.4, color: C.green700, fontWeight: 600 }}>
          CONFIGURATOR OUTPUT
        </Text>
        <Text style={{ ...styles.h1, marginTop: 6 }}>{d.label}</Text>
        <Text style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
          {d.bedrooms === 0 ? "Studio" : `${d.bedrooms}-bedroom`} · {d.dimensions.footprintM2.toFixed(2)} m² · Indicative budget {fmtMoney(d.budget.coreTotal, d.country)}
        </Text>
        {d.country.code !== BASE_COUNTRY.code && (
          // UGX equivalent in small print — architects price in UGX, the
          // client saw the local figure on screen. Both belong on the
          // build file.
          <Text style={{ fontSize: 9, color: C.muted, marginTop: 4 }}>
            ≈ {fmtMoney(d.budget.coreTotal, BASE_COUNTRY)} at 1 {d.country.currency.code} ≈ {d.country.ugxPerUnit} UGX
          </Text>
        )}

        <View style={{ height: 1, backgroundColor: C.stroke, marginVertical: 18 }} />

        <View style={{ flexDirection: "row" }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>PREPARED FOR</Text>
            <Text style={{ fontSize: 13, fontWeight: 600, marginTop: 4, fontFamily: FONT_BOLD }}>{d.client.name}</Text>
            <Text style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{d.client.email}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>REFERENCE</Text>
            <Text style={{ fontSize: 13, fontWeight: 600, marginTop: 4, fontFamily: FONT_BOLD }}>{d.reference}</Text>
            <Text style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Generated {d.generatedDate}</Text>
          </View>
        </View>
      </View>

      <View style={{ backgroundColor: C.bgAlt, paddingVertical: 12, paddingHorizontal: 36, flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 8, color: C.muted }}>A home for everyone, Easy Housing</Text>
        <Text style={{ fontSize: 8, color: C.muted }}>1 / 3</Text>
      </View>
    </Page>
  );
}

function PlanPage(d: DesignPdfData) {
  return (
    <Page size="A4" style={{ ...styles.page, paddingVertical: 28, paddingHorizontal: 36 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Image src={logoColor} style={{ height: 16, objectFit: "contain" }} />
        <Text style={styles.eyebrow}>FLOOR PLAN</Text>
      </View>

      <View style={{ marginTop: 16 }}>
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
          <View key={i} style={{ width: "25%", flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
            <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: ROOM_COLORS[r.colorKey], borderWidth: 1, borderColor: C.stroke, marginRight: 8 }} />
            <View>
              <Text style={{ fontSize: 9, color: C.muted }}>{r.name}</Text>
              <Text style={{ fontSize: 11, fontWeight: 600, fontFamily: FONT_BOLD }}>{r.areaM2.toFixed(2)} m²</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: C.stroke, marginTop: 12, paddingTop: 8, flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 8, color: C.muted }}>{d.reference} · {d.label}</Text>
        <Text style={{ fontSize: 8, color: C.muted }}>2 / 3</Text>
      </View>
    </Page>
  );
}

function SpecPage(d: DesignPdfData) {
  const lines = [...d.budget.core, ...d.budget.optional];
  // Convert each row UGX→local without going through fmtMoney's currency
  // prefix — the column header carries the code once.
  const localAmount = (ugx: number) => Math.round(ugx / d.country.ugxPerUnit);
  return (
    <Page size="A4" style={{ ...styles.page, paddingVertical: 28, paddingHorizontal: 36 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Image src={logoColor} style={{ height: 16, objectFit: "contain" }} />
        <Text style={styles.eyebrow}>SPEC & BUDGET</Text>
      </View>

      <View style={{ marginTop: 16 }}>
        <Text style={styles.h2}>Spec sheet.</Text>
        <Text style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
          Indicative budget — final pricing depends on site & local sourcing.
        </Text>
      </View>

      <View style={{ flexGrow: 1, marginTop: 16 }}>
        <View style={{ flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1.5, borderBottomColor: C.green900 }}>
          <Text style={{ flex: 1, fontSize: 8, letterSpacing: 1.2, color: C.muted, fontWeight: 600 }}>ITEM</Text>
          <Text style={{ width: 110, fontSize: 8, letterSpacing: 1.2, color: C.muted, fontWeight: 600, textAlign: "right" }}>
            {d.country.currency.code}
          </Text>
        </View>
        {lines.map((r, i) => (
          <View key={i} style={{ flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.stroke }}>
            <Text style={{ flex: 1, fontSize: 11 }}>{r.label}</Text>
            <Text style={{ width: 110, fontSize: 11, textAlign: "right" }}>{fmtNum(localAmount(r.amount))}</Text>
          </View>
        ))}
        <View style={{ flexDirection: "row", paddingVertical: 12, alignItems: "center" }}>
          <Text style={{ flex: 1, fontSize: 14, fontWeight: 600, fontFamily: FONT_BOLD }}>Indicative total</Text>
          <Text style={{ width: 130, fontSize: 16, fontWeight: 600, color: C.green900, textAlign: "right", fontFamily: FONT_BOLD }}>
            {fmtMoney(d.budget.grandTotal, d.country)}
          </Text>
        </View>
      </View>

      {/* Furniture ribbon — three thumbs of how the home wears in. Sits
          between the cost total and the climate band so the eye lifts off
          the tariff before the CO2 message. Height kept tight so the page
          stays at 3 pages even with the longest budget list; if it ever
          spills, drop to a 2-up first, then move below the climate band. */}
      <View style={{ flexDirection: "row", marginTop: 12, gap: 8 }}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{ flex: 1, height: 72, borderRadius: 12, overflow: "hidden" }}
          >
            <Image
              src={furniturePhotoFile(i)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 9, color: C.muted, marginTop: 6, fontStyle: "italic" }}>
        Plywood lining, compact fittings — built to live in.
      </Text>

      <View style={{ backgroundColor: C.green900, borderRadius: 14, padding: 18, marginTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ fontSize: 8, letterSpacing: 1.4, color: C.green200, fontWeight: 600 }}>CLIMATE IMPACT</Text>
          <Text style={{ fontSize: 12, color: "#fff", marginTop: 4, fontWeight: 300 }}>
            Timber-framed and prefabricated — a low-carbon home compared with concrete-block construction.
          </Text>
        </View>
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: C.stroke, marginTop: 12, paddingTop: 8, flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 8, color: C.muted }}>A home for everyone, Easy Housing · {d.reference}</Text>
        <Text style={{ fontSize: 8, color: C.muted }}>3 / 3</Text>
      </View>
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
