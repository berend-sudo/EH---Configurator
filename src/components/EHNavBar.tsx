"use client";

import Image from "next/image";

interface Props {
  step?: number;
  totalSteps?: number;
  onDark?: boolean;
  maxVisitedStep?: number;
  onStepChange?: (step: number) => void;
}

const STEP_LABELS = ["Start", "Configure", "Details"] as const;

export default function EHNavBar({
  step = 1,
  totalSteps = 3,
  onDark = false,
  maxVisitedStep,
  onStepChange,
}: Props) {
  const reachable = maxVisitedStep ?? step;
  const steps = Array.from({ length: totalSteps }, (_, i) => ({
    i: i + 1,
    label: STEP_LABELS[i] ?? `Step ${i + 1}`,
  }));

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 48px",
        borderBottom: onDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid var(--eh-stroke)",
        color: onDark ? "#fff" : "var(--eh-text)",
        // Transparent on dark so the parent's hero background (gradient/photo)
        // shows through. Solid bg in light mode so the bar sits flat above the
        // page surface.
        background: onDark ? "transparent" : "var(--eh-bg)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Image
          src={onDark ? "/brand/logo-full-white.png" : "/brand/logo-full-color.png"}
          alt="Easy Housing"
          width={120}
          height={28}
          style={{ height: 28, width: "auto", display: "block" }}
          priority
        />
        {/* The wordmark sits in the lower half of the logo (house icon + sparks
            above it), so nudge the divider + label down to its optical line. */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, transform: "translateY(3px)" }}>
          <span
            style={{
              width: 1,
              height: 18,
              background: onDark ? "rgba(255,255,255,.2)" : "var(--eh-stroke-strong)",
            }}
          />
          <span style={{ fontSize: 14, fontWeight: 500, opacity: 0.85 }}>Configurator</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 13 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {steps.map(({ i, label }) => {
            const isReached = i <= reachable;
            const isCurrent = i === step;
            const clickable = Boolean(isReached && onStepChange && !isCurrent);
            const cursor = clickable ? "pointer" : isCurrent ? "default" : "not-allowed";
            return (
              <button
                key={i}
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStepChange?.(i)}
                title={isReached ? `Step ${i} — ${label}` : `Step ${i} (not reached yet)`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  background: "transparent",
                  border: 0,
                  padding: "6px 8px",
                  borderRadius: 8,
                  cursor,
                  font: "inherit",
                  color: "inherit",
                  opacity: isReached ? 1 : 0.55,
                  transition: "background .15s var(--eh-ease)",
                }}
                onMouseEnter={(e) => {
                  if (clickable) {
                    e.currentTarget.style.background = onDark
                      ? "rgba(255,255,255,.08)"
                      : "var(--eh-bg-alt)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <div
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
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: ".06em",
                    textTransform: "uppercase",
                    fontWeight: isCurrent ? 600 : 500,
                    opacity: isCurrent ? 1 : 0.65,
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
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
