"use client";

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { fmtMoney } from "@/lib/countries";

interface Props {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (n: number) => void;
}

// Touch-grade budget slider matching MobileSliderRow's hit-area pattern but
// formatted for currency (no minMm/maxMm). Mirrors the desktop BudgetSlider's
// defaults so a phone user sees the same range.
export default function MobileBudgetSlider({
  value,
  min = 42_000_000,
  max = 115_000_000,
  step = 500_000,
  onChange,
}: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const range = Math.max(0, max - min);
  const pct = range > 0 ? ((value - min) / range) * 100 : 0;

  const valueFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return value;
      const rect = el.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
      const raw = min + ratio * range;
      const snapped = Math.round(raw / step) * step;
      return Math.max(min, Math.min(max, snapped));
    },
    [min, max, range, step, value],
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== undefined && e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      draggingRef.current = e.pointerId;
      setDragging(true);
      const next = valueFromClientX(e.clientX);
      if (next !== value) onChange(next);
    },
    [onChange, value, valueFromClientX],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (draggingRef.current !== e.pointerId) return;
      const next = valueFromClientX(e.clientX);
      if (next !== value) onChange(next);
    },
    [onChange, value, valueFromClientX],
  );

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (draggingRef.current !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    draggingRef.current = null;
    setDragging(false);
  }, []);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "var(--eh-text-muted)",
          }}
        >
          Budget
        </span>
        <span
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "var(--eh-text)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {fmtMoney(value)}
        </span>
      </div>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Budget"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        // Same fat-finger pattern as MobileSliderRow: 104 px tall box
        // with -26 top/bottom margins so the surrounding flow renders
        // as if the box were still 52 px. The rail and knob stay at
        // exactly the same Y; only the touch surface grows.
        style={{
          position: "relative",
          height: 104,
          margin: "-26px -4px",
          padding: "0 18px",
          display: "flex",
          alignItems: "center",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          cursor: dragging ? "grabbing" : "grab",
          outline: "none",
        }}
      >
        <div
          style={{
            position: "relative",
            height: 6,
            width: "100%",
            background: "var(--eh-stroke)",
            borderRadius: 999,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${pct}%`,
              background: "var(--eh-green-900)",
              borderRadius: 999,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: `${pct}%`,
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "var(--eh-green)",
              boxShadow: dragging
                ? "0 0 0 10px rgba(77,204,122,.28), 0 2px 8px rgba(0,59,43,.22)"
                : "0 0 0 6px rgba(77,204,122,.20), 0 2px 6px rgba(0,59,43,.18)",
              transform: "translate(-50%, -50%)",
              transition: "box-shadow var(--eh-duration-fast) var(--eh-ease)",
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 2,
          fontSize: 12,
          color: "var(--eh-text-soft)",
          fontVariantNumeric: "tabular-nums",
          padding: "0 18px",
        }}
      >
        <span>{fmtMoney(min)}</span>
        <span>{fmtMoney(max)}</span>
      </div>
    </div>
  );
}
