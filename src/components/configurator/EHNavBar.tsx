import Image from "next/image";

interface Props {
  step?: number;
  totalSteps?: number;
  onDark?: boolean;
}

export default function EHNavBar({ step = 1, totalSteps = 3, onDark = false }: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 48px",
        borderBottom: onDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid var(--eh-stroke)",
        color: onDark ? "#fff" : "var(--eh-text)",
        background: onDark ? "var(--eh-bg-deep)" : "var(--eh-bg)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Image
          src="/brand/logo-full-color.png"
          alt="Easy Housing"
          width={120}
          height={28}
          style={{ height: 28, width: "auto", display: "block" }}
          priority
        />
        <span
          style={{
            width: 1,
            height: 18,
            background: onDark ? "rgba(255,255,255,.2)" : "var(--eh-stroke-strong)",
          }}
        />
        <span style={{ fontSize: 14, fontWeight: 500, opacity: 0.85 }}>Configurator</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 13 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((i) => (
            <div
              key={i}
              style={{
                width: 28,
                height: 4,
                borderRadius: 2,
                background:
                  i <= step
                    ? onDark
                      ? "var(--eh-green)"
                      : "var(--eh-green-900)"
                    : onDark
                    ? "rgba(255,255,255,.25)"
                    : "var(--eh-stroke)",
                transition: "background var(--eh-duration-base) var(--eh-ease)",
              }}
            />
          ))}
        </div>
        <span style={{ opacity: onDark ? 0.85 : 1 }}>
          <span style={{ opacity: 0.6 }}>Step</span>{" "}
          <strong style={{ fontWeight: 600 }}>{step}</strong>
          <span style={{ opacity: 0.55 }}> of {totalSteps}</span>
        </span>
      </div>
    </div>
  );
}
