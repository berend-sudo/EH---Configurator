"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  BASE_COUNTRY,
  COUNTRIES,
  fmtMoney,
  setActiveCountry,
  type Country,
} from "@/lib/countries";
import { useIsMobile } from "@/lib/use-media-query";

// Sample design used only to preview the currency change in the confirmation
// card — mirrors a "Gable Compact" base price in UGX.
const SAMPLE_UGX = 26_000_000;

// Self-contained SVG arrow used in the panel pill + confirm CTA.
const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14m0 0-6-6m6 6-6 6" />
  </svg>
);

const FLAG_SOURCES: Record<string, { src: string; width: number; height: number }> = {
  UG: { src: "/brand/500px-Flag_of_Uganda.svg.png", width: 500, height: 334 },
  KE: { src: "/brand/Flag_of_Kenya.svg.png", width: 3840, height: 2560 },
};

function CountryFlag({ code, name }: { code: string; name: string }) {
  const flag = FLAG_SOURCES[code];
  if (!flag) return null;
  return (
    <Image
      src={flag.src}
      alt={`Flag of ${name}`}
      width={flag.width}
      height={flag.height}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
    />
  );
}

export default function CountryGatePage() {
  const isMobile = useIsMobile();
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

  if (isMobile) {
    return <MobileGate router={router} />;
  }

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
              <CountryFlag code={c.code} name={c.name} />
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

// Mobile country gate — Direction A immersive variant. Photo behind a
// deep-green scrim, content hugs the bottom, two stacked cards, one CTA.
// Picking a card stores the country immediately (matching desktop semantics)
// but doesn't navigate until the user taps Continue, so they can switch.
function MobileGate({ router }: { router: ReturnType<typeof useRouter> }) {
  const [picked, setPicked] = useState<Country | null>(null);
  const choose = (c: Country) => {
    setPicked(c);
    setActiveCountry(c);
  };
  const cont = () => {
    if (!picked) return;
    router.replace("/");
  };
  return (
    <div className="eh-country-mobile">
      <div className="eh-country-mobile__photo" aria-hidden>
        <Image
          src="/brand/heroimage1.jpg"
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 768px"
          quality={62}
          priority
          style={{ objectFit: "cover" }}
        />
      </div>
      <div className="eh-country-mobile__scrim" aria-hidden />
      <div className="eh-country-mobile__inner">
        <div className="eh-country-mobile__brand">
          <Image
            src="/brand/logo-full-white.png"
            alt="Easy Housing"
            width={120}
            height={28}
            style={{ height: 24, width: "auto", display: "block" }}
            priority
          />
        </div>
        <div className="eh-country-mobile__bottom">
          <p className="eh-country-mobile__eyebrow">A home for everyone</p>
          <h1 className="eh-country-mobile__h1">
            First, where are you building?
          </h1>
          <p className="eh-country-mobile__lead">
            This sets the currency we&apos;ll use everywhere. You can&apos;t
            change it later, so pick the country where your home will stand.
          </p>
          {COUNTRIES.map((c) => {
            const isPicked = picked?.code === c.code;
            return (
              <button
                key={c.code}
                type="button"
                className="eh-country-mobile__card"
                aria-pressed={isPicked}
                onClick={() => choose(c)}
              >
                <span className="eh-country-mobile__flag">
                  <CountryFlag code={c.code} name={c.name} />
                </span>
                <span className="eh-country-mobile__name">
                  <span className="eh-country-mobile__name-row">{c.name}</span>
                  <span className="eh-country-mobile__name-sub">
                    Prices in {c.currency.code}
                  </span>
                </span>
                <span className="eh-country-mobile__radio" aria-hidden>
                  {isPicked && (
                    <svg
                      viewBox="0 0 24 24"
                      width={14}
                      height={14}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            className="ab-cta eh-country-mobile__cta"
            disabled={!picked}
            onClick={cont}
          >
            <Arrow /> Continue
          </button>
        </div>
      </div>
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
          <CountryFlag code={country.code} name={country.name} />
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
