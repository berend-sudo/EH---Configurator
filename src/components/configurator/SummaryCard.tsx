interface Props {
  footprintM2: number;
  livingM2: number;
  terraceM2: number;
  /** Mezzanine area (m²) when the plan has one. Renders nothing when 0. */
  mezzanineM2: number;
  budgetUgx: number;
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        padding: "10px 0",
        borderBottom: "1px solid var(--eh-stroke)",
      }}
    >
      <div>
        <div style={{ fontSize: 13, color: "var(--eh-text-muted)" }}>{label}</div>
        {sub && (
          <div style={{ fontSize: 11, color: "var(--eh-text-soft)", marginTop: 2 }}>{sub}</div>
        )}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </div>
  );
}

const fmtArea = (n: number) => `${n.toFixed(2)} m²`;
const fmtUGX = (n: number) => "UGX " + Math.round(n).toLocaleString("en-US");

export default function SummaryCard({ footprintM2, livingM2, terraceM2, mezzanineM2, budgetUgx }: Props) {
  return (
    <div
      style={{
        background: "var(--eh-bg-alt)",
        border: "1px solid var(--eh-stroke)",
        borderRadius: 16,
        padding: "20px 22px",
      }}
    >
      <Row label="Footprint" value={fmtArea(footprintM2)} />
      <Row label="Living area" value={fmtArea(livingM2)} sub="incl. kitchen" />
      <Row label="Terrace" value={fmtArea(terraceM2)} />
      {mezzanineM2 > 0 && <Row label="Mezzanine" value={fmtArea(mezzanineM2)} sub="open to living below" />}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          paddingTop: 14,
          marginTop: 6,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600 }}>Indicative budget</div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "var(--eh-green-900)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {fmtUGX(budgetUgx)}
        </div>
      </div>
    </div>
  );
}
