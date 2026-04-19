"use client";

interface Props {
  lengthMm: number;
  minLengthMm: number;
  maxLengthMm: number;
  jumpSizeMm: number;
  onChange: (lengthMm: number) => void;
  label?: string;
}

/**
 * Length slider that snaps to whole jumps (610 mm half-frame modules).
 * Renders native range + number input kept in sync.
 */
export function LengthSlider({
  lengthMm,
  minLengthMm,
  maxLengthMm,
  jumpSizeMm,
  onChange,
  label = "Length",
}: Props) {
  const minJumps = Math.round(minLengthMm / jumpSizeMm);
  const maxJumps = Math.round(maxLengthMm / jumpSizeMm);
  const currentJumps = Math.round(lengthMm / jumpSizeMm);
  const snapped = currentJumps * jumpSizeMm;

  const handleRange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextJumps = Number(e.target.value);
    onChange(nextJumps * jumpSizeMm);
  };

  const handleNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value);
    const clamped = Math.max(minLengthMm, Math.min(maxLengthMm, raw));
    const snappedJumps = Math.round(clamped / jumpSizeMm);
    onChange(snappedJumps * jumpSizeMm);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-sm font-medium text-eh-forest">{label}</label>
        <div className="flex items-center gap-2 text-sm">
          <input
            type="number"
            step={jumpSizeMm}
            min={minLengthMm}
            max={maxLengthMm}
            value={snapped}
            onChange={handleNumber}
            className="w-24 rounded border border-eh-sage px-2 py-1 text-right font-mono"
          />
          <span className="text-eh-charcoal/60">mm</span>
        </div>
      </div>
      <input
        type="range"
        min={minJumps}
        max={maxJumps}
        step={1}
        value={currentJumps}
        onChange={handleRange}
        className="w-full accent-eh-forest"
      />
      <div className="flex justify-between text-xs text-eh-charcoal/60 font-mono">
        <span>{minLengthMm} mm</span>
        <span>{snapped} mm</span>
        <span>{maxLengthMm} mm</span>
      </div>
    </div>
  );
}
