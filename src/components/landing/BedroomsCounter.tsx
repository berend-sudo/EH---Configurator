"use client";

type Props = {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
};

export default function BedroomsCounter({ value, min, max, onChange }: Props) {
  const atMin = value <= min;
  const atMax = value >= max;
  const showMaxHint = max < 4;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "var(--eh-text-muted)",
          }}
        >
          Bedrooms
        </span>
        {showMaxHint && (
          <span style={{ fontSize: 11, color: "var(--eh-text-soft)", fontWeight: 500 }}>
            max {max} for this budget
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button
          type="button"
          aria-label="Decrease bedrooms"
          disabled={atMin}
          onClick={() => onChange(Math.max(min, value - 1))}
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            border: "1.5px solid var(--eh-stroke-strong)",
            background: "#fff",
            fontSize: 20,
            fontWeight: 600,
            color: "var(--eh-text)",
            cursor: atMin ? "not-allowed" : "pointer",
            opacity: atMin ? 0.4 : 1,
            lineHeight: 1,
            font: "inherit",
          }}
        >
          –
        </button>

        <div
          style={{
            minWidth: 90,
            textAlign: "center",
            color: "var(--eh-text)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          {value === 0 ? (
            <span style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em" }}>Studio</span>
          ) : (
            <span style={{ fontSize: 34, fontWeight: 600, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
              {value}
            </span>
          )}
          <span
            style={{
              fontSize: 10,
              color: "var(--eh-text-soft)",
              letterSpacing: ".06em",
              textTransform: "uppercase",
              fontWeight: 500,
            }}
          >
            {value === 0 ? "no separate bedroom" : value === 1 ? "bedroom" : "bedrooms"}
          </span>
        </div>

        <button
          type="button"
          aria-label="Increase bedrooms"
          disabled={atMax}
          onClick={() => onChange(Math.min(max, value + 1))}
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            border: 0,
            background: atMax ? "var(--eh-stroke)" : "var(--eh-green)",
            color: atMax ? "var(--eh-text-soft)" : "var(--eh-green-900)",
            fontSize: 20,
            fontWeight: 600,
            cursor: atMax ? "not-allowed" : "pointer",
            lineHeight: 1,
            font: "inherit",
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}
