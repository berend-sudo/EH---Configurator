// ============================================================================
// extract-price-book.mjs — sync the configurator's pricing data from the
// team's "Easy Housing — Calculation Template" workbook.
// ----------------------------------------------------------------------------
// This is a GATE, not a silent converter. It reads the volatile *numbers* out
// of the workbook's `Price Calc` sheet (the sales-price engine) and writes a
// typed `src/lib/pricing/price-book.generated.ts`. The engine *logic* lives in
// TypeScript (src/lib/pricing/engine.ts) and is a faithful port of the Price
// Calc formula chain — so a new upload only needs new numbers, not a rewrite.
//
// Three tripwires protect against silent drift (see CLAUDE.md / the plan):
//   1. Formula fingerprint — if a Price Calc *formula* changed (not just a
//      rate), the script refuses to regenerate until you review engine.ts and
//      re-bless with --accept-formula-changes.
//   2. Schema checks — typology labels must sit in their expected rows.
//   3. Self-consistency — the extracted rates must reproduce the workbook's own
//      cached `Full Easy Home Price` (E82/G82) for its current inputs.
//
// Usage:
//   npm run sync-pricing -- docs/Easy_Housing_Calculation_Template_June_2026.xlsx
//   npm run sync-pricing -- <file.xlsx> --accept-formula-changes
// ============================================================================

import { createRequire } from "module";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { createHash } from "crypto";
import { fileURLToPath } from "url";
import { dirname, resolve, basename } from "path";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_TS = resolve(ROOT, "src/lib/pricing/price-book.generated.ts");
const OUT_SNAP = resolve(ROOT, "src/lib/pricing/formula-snapshot.json");

const args = process.argv.slice(2);
const acceptFormula = args.includes("--accept-formula-changes");
const xlsxPath = args.find((a) => !a.startsWith("--"));
if (!xlsxPath) {
  fail("No workbook path given.\n  Usage: npm run sync-pricing -- <file.xlsx>");
}

function fail(msg) {
  console.error("\n✖ sync-pricing failed:\n" + msg + "\n");
  process.exit(1);
}
function num(v, where) {
  if (typeof v !== "number" || Number.isNaN(v)) fail(`Expected a number at ${where}, got ${JSON.stringify(v)}.`);
  return v;
}
// A KES rate cell may legitimately be blank ("priced on quotation" in Kenya).
// Blank → null (engine FX-converts the UGX value). An explicit 0 stays 0.
function kesOrNull(v) {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "number" || Number.isNaN(v)) return null;
  return v;
}

const wb = XLSX.readFile(resolve(ROOT, xlsxPath), { cellFormula: true });
const PC = wb.Sheets["Price Calc"];
const LD = wb.Sheets["Location Data"];
const QT = wb.Sheets["Quotation Tool"];
if (!PC) fail('Workbook has no "Price Calc" sheet — is this the right template?');

const V = (addr) => (PC[addr] ? PC[addr].v : undefined); // cached value
const F = (addr) => (PC[addr] && PC[addr].f ? "=" + PC[addr].f : undefined); // formula text
const sheetV = (sh, addr) => (sh && sh[addr] ? sh[addr].v : undefined);

// ── 2. Schema checks — labels must be where we expect ──────────────────────
const TYPOLOGY_ROWS = {
  88: "Mono Pitch",
  89: "Small Gable",
  90: "Compact Gable",
  91: "Standard Gable",
  92: "Large Gable",
  93: "Standard Clerestory",
  94: "Large Clerestory",
  95: "A Frame Compact",
  96: "A Frame Standard",
  97: "A Frame Large",
};
for (const [row, expect] of Object.entries(TYPOLOGY_ROWS)) {
  const got = String(V(`A${row}`) ?? "");
  if (!got.startsWith(expect)) {
    fail(`Typology row A${row} expected to start with "${expect}" but reads "${got}".\n` +
      `The Price Calc Typology Calculator layout changed — update scripts/extract-price-book.mjs and engine.ts.`);
  }
}

// Pull the first integer literal out of a formula like "=1221*$B$60".
const firstInt = (formula) => {
  const m = /(\d+)/.exec(formula ?? "");
  return m ? Number(m[1]) : undefined;
};

// ── Extract the data ───────────────────────────────────────────────────────
const columnWidthsMm = {
  a: firstInt(F("C88")),
  b: firstInt(F("D88")),
  c: firstInt(F("E88")),
};

const typologies = Object.entries(TYPOLOGY_ROWS).map(([row, _]) => ({
  workbookLabel: String(V(`A${row}`)),
  depthMm: num(V(`B${row}`), `B${row}`),
  flankMm: num(V(`F${row}`), `F${row}`),
  sqmUgx: num(V(`I${row}`), `I${row}`),
  sqmKes: kesOrNull(V(`K${row}`)),
}));

const addons = {
  interiorDoor: { ugx: num(V("D65"), "D65"), kes: kesOrNull(V("F65")) },
  partition: { ugx: num(V("D66"), "D66"), kes: kesOrNull(V("F66")) },
  extDoorWindow: { ugx: num(V("D67"), "D67"), kes: kesOrNull(V("F67")) },
  extraStair: { ugx: num(V("D68"), "D68"), kes: kesOrNull(V("F68")) },
};

// Service coefficients live as literals inside the formulas. Parse each with a
// targeted regex; the self-consistency check below catches any mis-parse.
const grab = (formula, re, where) => {
  const m = re.exec(formula ?? "");
  if (!m) fail(`Could not parse ${where} from formula: ${formula}`);
  return m.slice(1).map(Number);
};
const [elUgxFixed, elUgxPerSqm] = grab(F("E78"), /=(\d+)\+B\d+\*(\d+)/, "electricity UGX (E78)");
const [elKesFixed, elKesPerSqm] = grab(F("G78"), /=(\d+)\+(\d+)\*B\d+/, "electricity KES (G78)");
const [plUgxFixed, plUgxPerArea] = grab(F("E79"), /B\d+>0,(\d+)\+(\d+)\*B/, "plumbing UGX (E79)");
const [plKesFixed, plKesPerArea] = grab(F("G79"), /B\d+>0,(\d+)\+(\d+)\*B/, "plumbing KES (G79)");
const [arUgxPerSqm] = grab(F("E80"), /=(\d+)\*B\d+/, "architecture UGX (E80)");
const [arKesPerSqm] = grab(F("G80"), /=(\d+)\*B\d+/, "architecture KES (G80)");
const [enUgxFixed, enUgxPerSqm] = grab(F("E81"), /=(\d+)\+B\d+\*(\d+)/, "engineering UGX (E81)");
const [enKesFixed, enKesPerSqm] = grab(F("G81"), /=(\d+)\+(\d+)\*B\d+/, "engineering KES (G81)");

const services = {
  electricity: { ugxFixed: elUgxFixed, ugxPerSqm: elUgxPerSqm, kesFixed: elKesFixed, kesPerSqm: elKesPerSqm },
  plumbing: { ugxFixed: plUgxFixed, ugxPerArea: plUgxPerArea, kesFixed: plKesFixed, kesPerArea: plKesPerArea },
  architecture: { ugxPerSqm: arUgxPerSqm, kesPerSqm: arKesPerSqm },
  engineering: { ugxFixed: enUgxFixed, ugxPerSqm: enUgxPerSqm, kesFixed: enKesFixed, kesPerSqm: enKesPerSqm },
  // Distance rate lives in clean cells D77 (UGX) / F77 (KES): per sqm per km over 100.
  distance: { ugxPerSqmKm: num(V("D77"), "D77"), kesPerSqmKm: num(V("F77"), "F77") },
};

// Priced additional options (extracted for future use; not shown in the
// configurator yet). Rows 40–45 in Price Calc.
const optRows = {
  burglarBars: 40, terrace: 41, pergola: 42, railingOpen: 43, railingSemi: 44, wheelchairRamp: 45,
};
const options = {};
for (const [key, row] of Object.entries(optRows)) {
  options[key] = { ugx: num(V(`D${row}`), `D${row}`), kes: kesOrNull(V(`J${row}`)) };
}

// Lump-sum quotation items (priced case-by-case → shown as descriptions, never
// added to the total). Descriptions sourced from the Quotation Tool sheet.
const quotationItems = [
  { key: "tiles", label: "Tiles", description: String(sheetV(QT, "F27") ?? "Priced on quotation.") },
  { key: "sanitary", label: "Sanitary wares", description: String(sheetV(QT, "F28") ?? "Priced on quotation.") },
  { key: "biodigester", label: "Biodigester", description: String(sheetV(QT, "F31") ?? "Priced on quotation.") },
];

// FX from Location Data (UGX/USD = D6, KES/USD = D12) — only used as the
// fallback when a future workbook leaves a KES rate blank.
const fx = {
  ugxPerUsd: num(sheetV(LD, "D6"), "Location Data!D6"),
  kesPerUsd: num(sheetV(LD, "D12"), "Location Data!D12"),
};

// ── 1. Formula fingerprint ─────────────────────────────────────────────────
// Snapshot the formulas of the engine rows (59–82) and the typology calculator
// (88–98). If these change, the TS port may be stale.
const SNAP_RANGES = [[59, 82], [88, 98]];
const SNAP_COLS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
const formulaMap = {};
for (const [lo, hi] of SNAP_RANGES) {
  for (let r = lo; r <= hi; r++) {
    for (const c of SNAP_COLS) {
      const f = F(`${c}${r}`);
      if (f) formulaMap[`${c}${r}`] = f;
    }
  }
}
const newSnap = { ranges: SNAP_RANGES, formulas: formulaMap };
const newSnapStr = JSON.stringify(newSnap, null, 2);
const newHash = createHash("sha256").update(JSON.stringify(formulaMap)).digest("hex").slice(0, 16);

if (existsSync(OUT_SNAP)) {
  const old = JSON.parse(readFileSync(OUT_SNAP, "utf-8"));
  const oldFormulas = old.formulas ?? {};
  const changed = [];
  const keys = new Set([...Object.keys(oldFormulas), ...Object.keys(formulaMap)]);
  for (const k of [...keys].sort()) {
    if (oldFormulas[k] !== formulaMap[k]) {
      changed.push(`    ${k}:  ${oldFormulas[k] ?? "(none)"}  →  ${formulaMap[k] ?? "(removed)"}`);
    }
  }
  if (changed.length && !acceptFormula) {
    fail(
      `Price Calc FORMULAS changed since the last sync — the TypeScript engine\n` +
      `(src/lib/pricing/engine.ts) may no longer mirror the workbook:\n\n` +
      changed.join("\n") +
      `\n\n  Review engine.ts against these changes. If the port is still correct\n` +
      `  (or you've updated it), re-run with --accept-formula-changes.`
    );
  }
  if (changed.length) {
    console.log(`⚠ Accepting ${changed.length} formula change(s) (--accept-formula-changes).`);
  }
}

// ── 3. Self-consistency — reproduce the workbook's cached Full Easy Home ────
// Use the workbook's OWN current inputs (read from Price Calc) and the rates we
// just extracted; assert we land on the cached E82 (UGX) and G82 (KES).
{
  const gfa = num(V("B63"), "B63");
  const selLabel = String(V("B59"));
  const typ = typologies.find((t) => t.workbookLabel === selLabel);
  if (!typ) fail(`Self-consistency: selected typology "${selLabel}" not in the extracted table.`);
  const intDoors = num(V("B65"), "B65"), partitions = num(V("B66"), "B66");
  const extDW = num(V("B67"), "B67"), stairs = num(V("B68"), "B68");
  const baths = num(V("B71"), "B71"), kitchens = num(V("B72"), "B72");
  const dist = num(V("B77"), "B77");
  const plumbN = baths + kitchens;
  // Mirror the engine's missing-KES fallback so the check stays valid even if a
  // KES cell is blank: KES = native, else UGX × (kesPerUsd / ugxPerUsd).
  const kesOf = (kes, ugx) => (kes != null ? kes : ugx * (fx.kesPerUsd / fx.ugxPerUsd));
  const distChargeUgx = dist > 100 ? (dist - 100) * gfa * services.distance.ugxPerSqmKm : 0;
  const distChargeKes = dist > 100 ? (dist - 100) * gfa * services.distance.kesPerSqmKm : 0;
  const ugx =
    gfa * typ.sqmUgx +
    intDoors * addons.interiorDoor.ugx + partitions * addons.partition.ugx +
    extDW * addons.extDoorWindow.ugx + stairs * addons.extraStair.ugx +
    distChargeUgx +
    (services.electricity.ugxFixed + gfa * services.electricity.ugxPerSqm) +
    (plumbN > 0 ? services.plumbing.ugxFixed + plumbN * services.plumbing.ugxPerArea : 0) +
    gfa * services.architecture.ugxPerSqm +
    (services.engineering.ugxFixed + gfa * services.engineering.ugxPerSqm);
  const kes =
    gfa * kesOf(typ.sqmKes, typ.sqmUgx) +
    intDoors * kesOf(addons.interiorDoor.kes, addons.interiorDoor.ugx) +
    partitions * kesOf(addons.partition.kes, addons.partition.ugx) +
    extDW * kesOf(addons.extDoorWindow.kes, addons.extDoorWindow.ugx) +
    stairs * kesOf(addons.extraStair.kes, addons.extraStair.ugx) +
    distChargeKes +
    (services.electricity.kesFixed + gfa * services.electricity.kesPerSqm) +
    (plumbN > 0 ? services.plumbing.kesFixed + plumbN * services.plumbing.kesPerArea : 0) +
    gfa * services.architecture.kesPerSqm +
    (services.engineering.kesFixed + gfa * services.engineering.kesPerSqm);
  const wantUgx = num(V("E82"), "E82"), wantKes = num(V("G82"), "G82");
  const off = (a, b) => Math.abs(a - b) > 1;
  if (off(ugx, wantUgx) || off(kes, wantKes)) {
    fail(
      `Self-consistency check failed — extracted rates do not reproduce the\n` +
      `workbook's cached Full Easy Home Price:\n` +
      `   UGX: computed ${ugx}  vs  workbook E82 ${wantUgx}\n` +
      `   KES: computed ${kes}  vs  workbook G82 ${wantKes}\n` +
      `An extraction regex is likely wrong, or a formula changed.`
    );
  }
  console.log(`✓ Self-consistency OK (UGX ${wantUgx.toLocaleString()}, KES ${wantKes.toLocaleString()}).`);
}

// ── Emit ───────────────────────────────────────────────────────────────────
const sourceName = basename(xlsxPath);
const priceBook = {
  sourceWorkbook: sourceName,
  generatedAt: new Date().toISOString().slice(0, 10),
  formulaHash: newHash,
  columnWidthsMm,
  typologies,
  addons,
  services,
  options,
  quotationItems,
  fx,
};

const banner =
`// ============================================================================
// price-book.generated.ts — GENERATED FILE. DO NOT EDIT BY HAND.
// ----------------------------------------------------------------------------
// Source workbook: ${sourceName}
// Generated:       ${priceBook.generatedAt}  (formula hash ${newHash})
// Regenerate:      npm run sync-pricing -- <path-to-workbook.xlsx>
//
// All rates are NATIVE per country (UGX and KES columns of Price Calc) — Kenya
// figures are NOT derived from UGX. The engine logic lives in engine.ts.
// ============================================================================
`;

const body =
`import type { PriceBook } from "./price-book-types";\n\n` +
`export const PRICE_BOOK: PriceBook = ${JSON.stringify(priceBook, null, 2)} as const;\n`;

writeFileSync(OUT_TS, banner + "\n" + body);
writeFileSync(OUT_SNAP, newSnapStr + "\n");
console.log(`✓ Wrote ${OUT_TS.replace(ROOT + "/", "")}`);
console.log(`✓ Wrote ${OUT_SNAP.replace(ROOT + "/", "")}`);
