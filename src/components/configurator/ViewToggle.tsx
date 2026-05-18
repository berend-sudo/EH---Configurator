"use client";

export type View = "plan" | "images";

interface Props {
  value: View;
  onChange: (view: View) => void;
}

export default function ViewToggle({ value, onChange }: Props) {
  return (
    <div className="seg" role="tablist" aria-label="Plan or example images">
      <button
        type="button"
        role="tab"
        aria-selected={value === "plan"}
        className={value === "plan" ? "is-active" : ""}
        onClick={() => onChange("plan")}
      >
        Plan
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "images"}
        className={value === "images" ? "is-active" : ""}
        onClick={() => onChange("images")}
      >
        Example images
      </button>
    </div>
  );
}
