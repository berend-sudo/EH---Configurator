"use client";

import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

interface Props {
  /** Optional label above the rail. Empty hides the label row. */
  label?: string;
  valueMm: number;
  minMm: number;
  maxMm: number;
  stepMm: number;
  onChange: (mm: number) => void;
  /** Optional helper text rendered under the rail, e.g. "3 of 4 steps". */
  helper?: string;
  /** Display only the rail (no min/max labels under it). */
  compact?: boolean;
}

// Phone-grade slider. Uses Pointer Events directly on a fat touch area so it
// works reliably on iOS Safari (the opacity-0 native <input type="range">
// pattern from the desktop SliderRow is flaky on touch). The visible rail
// runs from left-edge inset to right-edge inset so the knob is fully reachable
// at both extremes — the tappable area extends the full row width.
export default function MobileSliderRow({
  label,
  valueMm,
  minMm,
  maxMm,
  stepMm,
  onChange,
  helper,
  compact = false,
}: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const range = Math.max(0, maxMm - minMm);
  const pct = range > 0 ? ((valueMm - minMm) / range) * 100 : 0;
  const valueM = valueMm / 1000;

  const valueFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return valueMm;
      const rect = el.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
      const raw = minMm + ratio * range;
      // Snap to stepMm.
      const snapped = Math.round((raw - minMm) / stepMm) * stepMm + minMm;
      return Math.max(minMm, Math.min(maxMm, snapped));
    },
    [minMm, maxMm, range, stepMm, valueMm],
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== undefined && e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      draggingRef.current = e.pointerId;
      setDragging(true);
      const next = valueFromClientX(e.clientX);
      if (next !== valueMm) onChange(next);
    },
    [onChange, valueFromClientX, valueMm],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (draggingRef.current !== e.pointerId) return;
      const next = valueFromClientX(e.clientX);
      if (next !== valueMm) onChange(next);
    },
    [onChange, valueFromClientX, valueMm],
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (draggingRef.current !== e.pointerId) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      draggingRef.current = null;
      setDragging(false);
    },
    [],
  );

  // Keyboard support — arrow keys step by stepMm, Home/End jump to extremes.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      let next = valueMm;
      switch (e.key) {
        case "ArrowLeft":
        case "ArrowDown":
          next = Math.max(minMm, valueMm - stepMm);
          break;
        case "ArrowRight":
        case "ArrowUp":
          next = Math.min(maxMm, valueMm + stepMm);
          break;
        case "Home":
          next = minMm;
          break;
        case "End":
          next = maxMm;
          break;
        case "PageDown":
          next = Math.max(minMm, valueMm - stepMm * 2);
          break;
        case "PageUp":
          next = Math.min(maxMm, valueMm + stepMm * 2);
          break;
        default:
          return;
      }
      e.preventDefault();
      if (next !== valueMm) onChange(next);
    },
    [maxMm, minMm, onChange, stepMm, valueMm],
  );

  return (
    <div>
      {label && (
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--eh-text)" }}>{label}</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "var(--eh-bg-alt)",
              borderRadius: 10,
              padding: "4px 12px",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--eh-text)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {valueM.toFixed(2)} <span style={{ opacity: 0.55, fontWeight: 400 }}>m</span>
          </span>
        </div>
      )}

      {/* Pointer-event hit area. The visible rail + knob sit at the
          row's vertical centre; the box is 104 px tall (double the
          previous 52 px) so a finger has slack above and below the
          6 px rail, but we counter with -26 px top/bottom margins so
          the box behaves as 52 px in the surrounding flow — the rail
          and following content stay at exactly the same Y. Horizontal
          18 px padding keeps the knob inside the row at min/max. */}
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={label || "Width"}
        aria-valuemin={minMm}
        aria-valuemax={maxMm}
        aria-valuenow={valueMm}
        aria-valuetext={`${valueM.toFixed(2)} metres`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
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

      {!compact && (
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
          <span>{(minMm / 1000).toFixed(1)} m</span>
          <span>{(maxMm / 1000).toFixed(1)} m</span>
        </div>
      )}

      {helper && (
        <div
          style={{
            fontSize: 11,
            color: "var(--eh-text-soft)",
            textAlign: "center",
            marginTop: 6,
          }}
        >
          {helper}
        </div>
      )}
    </div>
  );
}
