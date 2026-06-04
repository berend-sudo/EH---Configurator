"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  BASE_COUNTRY,
  COUNTRIES,
  fmtMoney,
  setActiveCountry,
  type Country,
} from "@/lib/countries";

// Sample design used only to preview the currency change in the confirmation
// card — mirrors a "Gable Compact" base price in UGX.
const SAMPLE_UGX = 26_000_000;

// Self-contained SVG arrow used in the panel pill + confirm CTA.
const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14m0 0-6-6m6 6-6 6" />
  </svg>
);

// Mint a per-render unique id so a flag rendered twice on the page (panel +
// confirm card) doesn't share clipPath ids.
const useUid = () => useMemo(() => "f" + Math.random().toString(36).slice(2, 8), []);

function UgandaFlag() {
  return (
    <svg viewBox="0 0 90 60" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Flag of Uganda">
      <rect width="90" height="60" fill="#000" />
      <rect y="10" width="90" height="10" fill="#FCDC04" />
      <rect y="20" width="90" height="10" fill="#D90000" />
      <rect y="30" width="90" height="10" fill="#000" />
      <rect y="40" width="90" height="10" fill="#FCDC04" />
      <rect y="50" width="90" height="10" fill="#D90000" />
      <circle cx="45" cy="30" r="11.5" fill="#fff" />
      <g transform="translate(45 30)">
        <g fill="#9a9a9a" stroke="#6f6f6f" strokeWidth="0.4">
          <ellipse cx="1.5" cy="2.8" rx="6.2" ry="3.6" />
          <path d="M6.6 1.6 L10 -0.4 L9.6 3.4 Z" />
          <path d="M-3.4 1.4 q -2.4 -3.6 -1.2 -7.2 l 1.9 0.3 q -0.7 3 1.1 6.1 Z" />
          <path d="M-5.4 -6.8 q -1.7 -0.4 -2.9 0.9 q 1.1 1.5 2.9 1.3 Z" />
        </g>
        <path d="M-8.3 -6 l -2.6 0.5 l 2.5 1 Z" fill="#2a2a2a" />
        <circle cx="-6" cy="-4.2" r="0.9" fill="#D90000" />
        <circle cx="-5.6" cy="-6" r="0.85" fill="#fff" />
        <g stroke="#FCDC04" strokeWidth="0.6" strokeLinecap="round">
          <line x1="-5" y1="-7.4" x2="-5.6" y2="-10.6" />
          <line x1="-4.4" y1="-7.5" x2="-4" y2="-10.6" />
          <line x1="-5.7" y1="-7.4" x2="-7" y2="-10.1" />
          <line x1="-3.9" y1="-7.4" x2="-2.7" y2="-10" />
        </g>
        <g stroke="#3a3a3a" strokeWidth="0.7" strokeLinecap="round">
          <line x1="0" y1="6.2" x2="-1.4" y2="11" />
          <line x1="3" y1="6.2" x2="3.4" y2="11" />
          <line x1="-1.4" y1="11" x2="-3" y2="11.2" />
          <line x1="3.4" y1="11" x2="4.9" y2="11.2" />
        </g>
      </g>
    </svg>
  );
}

function KenyaFlag() {
  // clipPath id must be unique per render — two flags on one page collide otherwise.
  const uid = useUid();
  return (
    <svg viewBox="0 0 90 60" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Flag of Kenya">
      <rect width="90" height="60" fill="#000" />
      <rect y="20" width="90" height="20" fill="#fff" />
      <rect y="22" width="90" height="16" fill="#BB0000" />
      <rect y="40" width="90" height="20" fill="#006600" />
      <rect y="19" width="90" height="1.6" fill="#fff" />
      <rect y="38.4" width="90" height="1.6" fill="#fff" />
      <g transform="translate(45 30)">
        <g stroke="#fff" strokeWidth="1.5" strokeLinecap="round">
          <line x1="-10.5" y1="-20" x2="10.5" y2="20" />
          <line x1="10.5" y1="-20" x2="-10.5" y2="20" />
        </g>
        <g fill="#fff">
          <path d="M-10.5 -20 l -1.7 -3.6 l 3.7 0.4 Z" />
          <path d="M10.5 -20 l 1.7 -3.6 l -3.7 0.4 Z" />
          <path d="M-10.5 20 l -1.7 3.6 l 3.7 -0.4 Z" />
          <path d="M10.5 20 l 1.7 3.6 l -3.7 -0.4 Z" />
        </g>
        <defs>
          <clipPath id={`keShield-${uid}`}>
            <path d="M0 -17 C 8.5 -14 9.6 -6 9.6 0 C 9.6 9 4.6 14.5 0 17 C -4.6 14.5 -9.6 9 -9.6 0 C -9.6 -6 -8.5 -14 0 -17 Z" />
          </clipPath>
        </defs>
        <g clipPath={`url(#keShield-${uid})`}>
          <rect x="-11" y="-18" width="22" height="36" fill="#BB0000" />
          <rect x="-11" y="-18" width="22" height="6.5" fill="#000" />
          <rect x="-11" y="11.5" width="22" height="6.5" fill="#000" />
          <rect x="-11" y="-11.8" width="22" height="1.8" fill="#fff" />
          <rect x="-11" y="10" width="22" height="1.8" fill="#fff" />
          <path d="M0 -9 C 3.6 -5.5 3.6 5.5 0 9 C -3.6 5.5 -3.6 -5.5 0 -9 Z" fill="#fff" />
          <path d="M0 -6.4 C 1.9 -4 1.9 4 0 6.4 C -1.9 4 -1.9 -4 0 -6.4 Z" fill="#BB0000" />
        </g>
        <path
          d="M0 -17 C 8.5 -14 9.6 -6 9.6 0 C 9.6 9 4.6 14.5 0 17 C -4.6 14.5 -9.6 9 -9.6 0 C -9.6 -6 -8.5 -14 0 -17 Z"
          fill="none"
          stroke="rgba(0,0,0,.25)"
          strokeWidth="0.4"
        />
      </g>
    </svg>
  );
}

function CountryFlag({ code }: { code: string }) {
  if (code === "UG") return <UgandaFlag />;
  if (code === "KE") return <KenyaFlag />;
  // Add new countries here as inline SVG — no emoji, no raster flags.
  return null;
}

export default function CountryGatePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Country | null>(null);

  // Lock body scroll while the confirmation overlay is up so the deep-green
  // background doesn't fight the modal.
  useEffect(() => {
    if (!selected) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [selected]);

  // Escape closes the confirmation (so the prototype stays explorable).
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  function handlePick(country: Country) {
    setActiveCountry(country);
    setSelected(country);
  }

  function handleContinue() {
    // Persistence has already happened at pick-time so the navigation is the
    // safe step here. Use replace so the back button doesn't return to the
    // gate after the user has chosen.
    router.replace("/");
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--eh-bg-alt)",
        color: "var(--eh-text)",
      }}
    >
      <header
        style={{
          background: "var(--eh-green-deep)",
          color: "#fff",
          padding: "26px clamp(28px, 5vw, 72px) clamp(34px, 5vh, 52px)",
          flex: "0 0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            marginBottom: "clamp(28px, 5vh, 52px)",
          }}
        >
          <Image
            src="/brand/logo-full-white.png"
            alt="Easy Housing"
            width={120}
            height={28}
            style={{ height: 28, width: "auto", display: "block" }}
            priority
          />
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{
                fontSize: 11,
                letterSpacing: ".14em",
                textTransform: "uppercase",
                fontWeight: 600,
                color: "var(--eh-green-200)",
              }}
            >
              Configurator
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {[0, 1, 2, 3].map((i) => (
                <i
                  key={i}
                  style={{
                    display: "block",
                    width: 26,
                    height: 4,
                    borderRadius: 2,
                    background: i === 0 ? "var(--eh-green)" : "rgba(255,255,255,.22)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 760 }}>
          <p
            style={{
              fontSize: 12,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              fontWeight: 600,
              color: "var(--eh-green-200)",
              margin: "0 0 16px",
            }}
          >
            Before we start
          </p>
          <h1
            style={{
              fontWeight: 600,
              fontSize: "clamp(34px, 5vw, 60px)",
              lineHeight: 1.03,
              letterSpacing: "-.025em",
              margin: 0,
            }}
          >
            Where are you{" "}
            <span style={{ color: "var(--eh-green)" }}>building?</span>
          </h1>
          <p
            style={{
              fontWeight: 300,
              fontSize: "clamp(15px, 1.5vw, 18px)",
              lineHeight: 1.55,
              color: "var(--eh-text-on-dark-muted)",
              maxWidth: "56ch",
              margin: "16px 0 0",
            }}
          >
            We build a little differently in each country — local materials,
            local crews, local prices. Pick yours and we&apos;ll show every
            budget in your own currency.
          </p>
        </div>
      </header>

      <main className="eh-country-panels">
        {COUNTRIES.map((c) => (
          <button
            key={c.code}
            type="button"
            className="eh-country-panel"
            aria-label={`Select ${c.name}`}
            onClick={() => handlePick(c)}
          >
            <div className="eh-country-flag">
              <CountryFlag code={c.code} />
            </div>
            <div className="eh-country-name">{c.name}</div>
            <div className="eh-country-cur">
              <span className="eh-country-cur-code">{c.currency.code}</span>
              <span className="eh-country-cur-dot" />
              {c.currency.name}
            </div>
            <span className="eh-country-pick">
              Continue
              <Arrow />
            </span>
          </button>
        ))}
      </main>

      <div
        style={{
          flex: "0 0 auto",
          textAlign: "center",
          padding: "16px 28px 22px",
          color: "var(--eh-text-soft)",
          fontSize: 12.5,
          background: "var(--eh-bg-alt)",
          borderTop: "1px solid var(--eh-stroke)",
        }}
      >
        Prices throughout the configurator are shown in your country&apos;s
        currency.{" "}
        <b style={{ fontWeight: 600, color: "var(--eh-text-muted)" }}>
          You can&apos;t change this later
        </b>
        , so pick the country where the home will be built.
      </div>

      {selected && (
        <ConfirmOverlay
          country={selected}
          onContinue={handleContinue}
          onChange={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function ConfirmOverlay({
  country,
  onContinue,
  onChange,
}: {
  country: Country;
  onContinue: () => void;
  onChange: () => void;
}) {
  const showsFx = country.ugxPerUnit !== 1;
  return (
    <div
      className="eh-country-scrim"
      onClick={(e) => {
        // Click outside the card dismisses, so the prototype stays explorable.
        if (e.target === e.currentTarget) onChange();
      }}
    >
      <div className="eh-country-confirm">
        <div className="eh-country-confirm-flag">
          <CountryFlag code={country.code} />
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: "var(--eh-green-700)",
            marginBottom: 8,
          }}
        >
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          {country.name} selected
        </div>
        <h2 style={{ fontWeight: 600, fontSize: 24, letterSpacing: "-.02em", margin: "0 0 8px" }}>
          Building in {country.name}.
        </h2>
        <p
          style={{
            fontWeight: 300,
            fontSize: 14.5,
            lineHeight: 1.55,
            color: "var(--eh-text-muted)",
            margin: "0 auto",
            maxWidth: "34ch",
          }}
        >
          Every budget from here on is shown in{" "}
          <b style={{ fontWeight: 600, color: "var(--eh-text)" }}>
            {country.currency.name} ({country.currency.code})
          </b>
          .
        </p>
        <div
          style={{
            margin: "22px 0 4px",
            padding: "16px 18px",
            background: "var(--eh-bg-alt)",
            border: "1px solid var(--eh-stroke)",
            borderRadius: "var(--eh-radius-md)",
            textAlign: "left",
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              color: "var(--eh-text-soft)",
              fontWeight: 600,
            }}
          >
            Example — a Gable Compact home
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 12,
              marginTop: 8,
            }}
          >
            {showsFx ? (
              <span
                style={{
                  fontSize: 13,
                  color: "var(--eh-text-soft)",
                  textDecoration: "line-through",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fmtMoney(SAMPLE_UGX, BASE_COUNTRY)}
              </span>
            ) : (
              <span />
            )}
            <span
              style={{
                fontSize: 21,
                fontWeight: 600,
                color: "var(--eh-green-900)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {fmtMoney(SAMPLE_UGX, country)}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "var(--eh-text-soft)", marginTop: 6 }}>
            {showsFx
              ? `Converted at a fixed rate of 1 ${country.currency.code} ≈ ${country.ugxPerUnit} UGX.`
              : "Indicative base price, before bedrooms."}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
          <button type="button" className="ab-cta" onClick={onContinue} style={{ justifyContent: "center" }}>
            Start designing
            <Arrow />
          </button>
          <button
            type="button"
            onClick={onChange}
            style={{
              background: "transparent",
              border: 0,
              color: "var(--eh-text-soft)",
              fontWeight: 400,
              fontSize: 13,
              padding: 6,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Pick a different country
          </button>
        </div>
      </div>
    </div>
  );
}
