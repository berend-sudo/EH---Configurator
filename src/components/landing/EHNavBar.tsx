type Props = { onDark?: boolean; step?: string };

export default function EHNavBar({ onDark = false, step = "Start" }: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 48px",
        borderBottom: onDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid var(--eh-stroke)",
        color: onDark ? "#fff" : "var(--eh-text)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-full-white.png" alt="Easy Housing" style={{ height: 28, display: "block" }} />
        <span style={{ width: 1, height: 18, background: onDark ? "rgba(255,255,255,.2)" : "var(--eh-stroke-strong)" }} />
        <span style={{ fontSize: 14, fontWeight: 500, opacity: 0.85 }}>Configurator</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 13 }}>
        <span style={{ opacity: 0.6 }}>Step</span>
        <span style={{ fontWeight: 600 }}>{step}</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span style={{ opacity: 0.6 }}>Save &amp; exit</span>
      </div>
    </div>
  );
}
