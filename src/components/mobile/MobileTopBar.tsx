"use client";

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onResetZoom?: () => void;
  showResetZoom?: boolean;
}

const ChevronLeft = () => (
  <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6" />
  </svg>
);

const ResetZoomIcon = () => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V3h4" />
    <path d="M21 7V3h-4" />
    <path d="M3 17v4h4" />
    <path d="M21 17v4h-4" />
  </svg>
);

// Floating glass top bar used on the configurator over the full-bleed plan.
// White surface at ~0.78 alpha + 14px backdrop blur — the one place
// blur-over-photo is allowed by the brand rules.
export default function MobileTopBar({ title, subtitle, onBack, onResetZoom, showResetZoom = false }: Props) {
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
      {showResetZoom ? (
        <button
          type="button"
          aria-label="Reset zoom"
          onClick={onResetZoom}
          className="eh-mobile-topbar__btn"
        >
          <ResetZoomIcon />
        </button>
      ) : (
        <div className="eh-mobile-topbar__btn eh-mobile-topbar__btn--ghost" aria-hidden />
      )}
    </div>
  );
}
