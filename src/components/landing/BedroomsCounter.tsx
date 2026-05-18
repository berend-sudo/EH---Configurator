"use client";

type Props = { value: number; onChange: (n: number) => void };

const MIN = 1;
const MAX = 4;

export default function BedroomsCounter({ value, onChange }: Props) {
  const atMin = value <= MIN;
  const atMax = value >= MAX;
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "var(--eh-text-muted)",
          marginBottom: 14,
        }}
      >
        Bedrooms
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button
          type="button"
          aria-label="Decrease bedrooms"
          disabled={atMin}
          onClick={() => onChange(Math.max(MIN, value - 1))}
          style={{
            width: 42,
            height: 42,
            border: "1.5px solid var(--eh-stroke-strong)",
            borderRadius: "50%",
            background: "#fff",
            fontSize: 20,
            color: "var(--eh-text)",
            cursor: atMin ? "not-allowed" : "pointer",
            opacity: atMin ? 0.4 : 1,
            lineHeight: 1,
            font: "inherit",
            fontWeight: 600,
          }}
        >
          –
        </button>
        <div
          style={{
            minWidth: 60,
            textAlign: "center",
            fontSize: 34,
            fontWeight: 600,
            color: "var(--eh-text)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </div>
        <button
          type="button"
          aria-label="Increase bedrooms"
          disabled={atMax}
          onClick={() => onChange(Math.min(MAX, value + 1))}
          style={{
            width: 42,
            height: 42,
            border: 0,
            borderRadius: "50%",
            background: "var(--eh-green)",
            color: "var(--eh-green-900)",
            fontSize: 20,
            cursor: atMax ? "not-allowed" : "pointer",
            fontWeight: 600,
            opacity: atMax ? 0.5 : 1,
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
