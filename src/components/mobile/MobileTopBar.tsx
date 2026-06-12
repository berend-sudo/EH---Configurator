"use client";

import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  /** Optional right-side content (e.g. the Plan / Example images
   *  segmented control). Renders in place of the old reset-zoom slot;
   *  double-tap on the canvas still resets the zoom. */
  right?: ReactNode;
}

const ChevronLeft = () => (
  <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6" />
  </svg>
);

// Floating glass top bar used on the configurator over the full-bleed plan.
// White surface at ~0.78 alpha + 14px backdrop blur — the one place
// blur-over-photo is allowed by the brand rules.
export default function MobileTopBar({ title, subtitle, onBack, right }: Props) {
  return (
    <div className="eh-mobile-topbar">
      <button
        type="button"
        aria-label="Back"
        onClick={onBack}
        className="eh-mobile-topbar__btn"
      >
        <ChevronLeft />
      </button>
      <div className="eh-mobile-topbar__pill">
        <div className="eh-mobile-topbar__title">{title}</div>
        {subtitle && <div className="eh-mobile-topbar__sub">{subtitle}</div>}
      </div>
      {right ?? <div className="eh-mobile-topbar__btn eh-mobile-topbar__btn--ghost" aria-hidden />}
    </div>
  );
}
