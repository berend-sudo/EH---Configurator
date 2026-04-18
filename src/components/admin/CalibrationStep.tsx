"use client";

import { useRef, useState } from "react";
import type { BackgroundImage } from "@/lib/admin/editorState";

interface Props {
  background: BackgroundImage;
  initialPxPerMm: number | null;
  onConfirm: (pxPerMm: number) => void;
}

/**
 * Step 2 — user clicks two points on the PNG and enters the real
 * distance between them to compute pxPerMm. We provisionally use
 * AI's overallWidthMm to suggest an initial scale.
 */
export function CalibrationStep({ background, initialPxPerMm, onConfirm }: Props) {
  const [points, setPoints] = useState<ReadonlyArray<readonly [number, number]>>([]);
  const [distanceMm, setDistanceMm] = useState<string>("8547");
  const imgRef = useRef<HTMLImageElement | null>(null);

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * background.widthPx;
    const y = ((e.clientY - rect.top) / rect.height) * background.heightPx;
    setPoints((prev) =>
      prev.length >= 2 ? [[x, y] as const] : [...prev, [x, y] as const],
    );
  };

  const pxDistance =
    points.length === 2
      ? Math.hypot(points[1][0] - points[0][0], points[1][1] - points[0][1])
      : null;

  const pxPerMm =
    pxDistance !== null && Number(distanceMm) > 0
      ? pxDistance / Number(distanceMm)
      : initialPxPerMm;

  return (
    <div className="space-y-4 rounded-md border border-eh-sage p-4">
      <div>
        <h2 className="text-lg font-semibold text-eh-forest">
          Step 2 — Calibrate the scale
        </h2>
        <p className="text-sm text-eh-charcoal/70">
          Click two points on a known dimension line (e.g. the two ends of
          "8547 mm") and enter the distance. All AI percentages will convert
          to real mm.
        </p>
      </div>

      <div
        className="relative inline-block w-full max-w-full overflow-hidden rounded border border-eh-sage"
        style={{ cursor: "crosshair" }}
        onClick={onClick}
      >
        <img
          ref={imgRef}
          src={background.url}
          alt="Floor plan background"
          className="block h-auto w-full select-none"
          draggable={false}
        />
        <svg
          viewBox={`0 0 ${background.widthPx} ${background.heightPx}`}
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p[0]}
              cy={p[1]}
              r={Math.max(10, background.widthPx / 150)}
              fill="#ff6b35"
              stroke="white"
              strokeWidth={Math.max(2, background.widthPx / 400)}
            />
          ))}
          {points.length === 2 && (
            <line
              x1={points[0][0]}
              y1={points[0][1]}
              x2={points[1][0]}
              y2={points[1][1]}
              stroke="#ff6b35"
              strokeWidth={Math.max(2, background.widthPx / 600)}
              strokeDasharray="8 8"
            />
          )}
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <span>Real distance</span>
          <input
            type="number"
            min={0}
            step={10}
            value={distanceMm}
            onChange={(e) => setDistanceMm(e.target.value)}
            className="w-28 rounded border border-eh-sage px-2 py-1 text-right font-mono"
          />
          <span>mm</span>
        </label>
        <button
          className="rounded border border-eh-sage px-2 py-1 text-xs hover:bg-eh-sage"
          onClick={() => setPoints([])}
        >
          Reset clicks
        </button>
        <span className="text-xs font-mono text-eh-charcoal/60">
          {points.length === 0 && "click first point"}
          {points.length === 1 && "click second point"}
          {points.length === 2 &&
            `${Math.round(pxDistance ?? 0)} px between clicks · ${(pxPerMm ?? 0).toFixed(4)} px/mm`}
        </span>
      </div>

      <button
        className="rounded bg-eh-forest px-3 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
        disabled={!pxPerMm}
        onClick={() => pxPerMm && onConfirm(pxPerMm)}
      >
        Use this scale
      </button>
    </div>
  );
}
