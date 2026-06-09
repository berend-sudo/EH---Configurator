"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCountryGuard } from "@/lib/use-active-country";
import { useIsMobile } from "@/lib/use-media-query";
import EHNavBar from "@/components/EHNavBar";
import BudgetSlider from "./BudgetSlider";
import BedroomsCounter from "./BedroomsCounter";
import TypologyPicker from "./TypologyPicker";
import {
  maxBedroomsFor,
  resolveAffordableSelection,
  selectionLabel,
  selectionToParams,
  type Selection,
} from "@/lib/typologies";
import {
  availableBedrooms,
  resolveAvailableBedrooms,
  resolveAvailableSelection,
  type FloorPlanEntry,
} from "@/lib/floor-plans";

interface Props {
  /** Scanned at request time on the server; passed through so the picker has
   *  the availability set on first paint (no client-fetch flash). */
  plans: FloorPlanEntry[];
}

export default function LandingScreen({ plans }: Props) {
  const router = useRouter();
  const isMobile = useIsMobile();
  // Block the landing until we know the country — otherwise the SSR render
  // (no localStorage) and the hydrated render (KES) would disagree on every
  // price, and there's no point in showing prices in the wrong currency.
  const country = useCountryGuard();
  const [budget, setBudget] = useState(75_000_000);
  const [bedrooms, setBedrooms] = useState(2);
  const initialSelection = useMemo<Selection>(
    () => resolveAvailableSelection(plans, { typology: "monopitch", subtype: null })
        ?? { typology: "monopitch", subtype: null },
    [plans],
  );
  const [selection, setSelection] = useState<Selection>(initialSelection);

  // As the budget drops, fall back to the cheapest still-affordable subtype
  // within the typology — or the cheapest typology if the whole one is out
  // of reach. If nothing is affordable the selection is left untouched so
  // the user keeps a stable choice while every tile is greyed.
  useEffect(() => {
    const affordable = resolveAffordableSelection(budget, selection);
    const reachable = resolveAvailableSelection(plans, affordable) ?? affordable;
    if (reachable.typology !== selection.typology || reachable.subtype !== selection.subtype) {
      setSelection(reachable);
    }
  }, [budget, selection, plans]);

  // Bedroom options — what's on disk for this selection, capped by the budget.
  // The counter steps through THIS list so gaps (e.g. Clerestory Large ships
  // 2BR + 4BR but no 3BR) are skipped instead of trapping the user at 2.
  const availBR = availableBedrooms(plans, selection);
  const affordableMax = maxBedroomsFor(budget, selection);
  const affordableBR = availBR.filter((b) => b <= affordableMax);
  const bedroomOptions = affordableBR.length > 0 ? affordableBR : availBR;
  const minBed = bedroomOptions[0] ?? 0;
  const maxBed = bedroomOptions[bedroomOptions.length - 1] ?? 0;
  // Keep the count valid when the budget/typology changes shrink or move the
  // option set; clamp to the nearest available value within the new bounds.
  useEffect(() => {
    if (bedroomOptions.includes(bedrooms)) return;
    const clamped = resolveAvailableBedrooms(plans, selection, bedrooms);
    const next = Math.min(maxBed, Math.max(minBed, clamped));
    if (next !== bedrooms) setBedrooms(next);
  }, [bedroomOptions, minBed, maxBed, bedrooms, plans, selection]);

  if (!country) {
    // Gate guard is in flight (or redirecting). Render nothing rather than a
    // landing in the wrong currency.
    return null;
  }

  const openConfigurator = () => {
    const qs = new URLSearchParams({
      ...selectionToParams(selection),
      bedrooms: String(bedrooms),
      budget: String(budget),
    });
    router.push(`/configurator?${qs.toString()}`);
  };

  if (isMobile) {
    return (
      <MobileLandingScreen
        plans={plans}
        budget={budget}
        setBudget={setBudget}
        bedrooms={bedrooms}
        setBedrooms={setBedrooms}
        bedroomOptions={bedroomOptions}
        selection={selection}
        setSelection={setSelection}
        currencyCode={country.currency.code}
        onContinue={openConfigurator}
      />
    );
  }

  return (
    <main
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100vh",
        overflow: "hidden",
        background: "var(--eh-green-900)",
      }}
    >
      <div style={{ position: "relative", zIndex: 2 }}>
        <EHNavBar onDark step={1} totalSteps={3} />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100vh - 70px)",
          padding: "40px 20px",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 32,
            padding: "48px 56px",
            width: 760,
            maxWidth: "100%",
            boxShadow: "0 32px 80px rgba(0,59,43,0.35)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <span className="ab-pill ab-pill-soft">Quick configurator</span>
            <h1
              style={{
                fontSize: 44,
                lineHeight: 1.08,
                fontWeight: 600,
                letterSpacing: "-0.025em",
                margin: "18px 0 10px",
                color: "var(--eh-text)",
              }}
            >
              Let&apos;s design your home.
            </h1>
            <p
              style={{
                fontSize: 16,
                lineHeight: 1.55,
                fontWeight: 300,
                color: "var(--eh-text-muted)",
                margin: 0,
                maxWidth: 520,
                marginInline: "auto",
              }}
            >
              Three quick choices — we&apos;ll generate a floor plan and a transparent budget you can share with our architects.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 36, marginBottom: 32 }}>
            <BudgetSlider value={budget} onChange={setBudget} />
            <BedroomsCounter value={bedrooms} onChange={setBedrooms} options={bedroomOptions} />
          </div>
          <TypologyPicker selection={selection} onChange={setSelection} budget={budget} plans={plans} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 36 }}>
            <button
              type="button"
              className="ab-cta"
              style={{ padding: "16px 36px", fontSize: 16 }}
              onClick={() => {
                const qs = new URLSearchParams({
                  ...selectionToParams(selection),
                  bedrooms: String(bedrooms),
                  budget: String(budget),
                });
                router.push(`/configurator?${qs.toString()}`);
              }}
            >
              Open the configurator
              <span style={{ fontSize: 18, lineHeight: 1 }}>→</span>
            </button>
          </div>
          <div style={{ textAlign: "center", marginTop: 18, fontSize: 12, color: "var(--eh-text-soft)" }}>
            You can change anything in the next step.
          </div>
        </div>
      </div>
    </main>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Mobile landing — Direction A. Single scrolling column with a sticky
// progress bar up top and a sticky CTA at the bottom. Reuses every
// landing sub-component (BudgetSlider / BedroomsCounter / TypologyPicker)
// so affordability + availability rules stay in one place.
// ──────────────────────────────────────────────────────────────────────────

interface MobileLandingProps {
  plans: FloorPlanEntry[];
  budget: number;
  setBudget: (n: number) => void;
  bedrooms: number;
  setBedrooms: (n: number) => void;
  bedroomOptions: number[];
  selection: Selection;
  setSelection: (s: Selection) => void;
  currencyCode: string;
  onContinue: () => void;
}

function MobileLandingScreen({
  plans,
  budget,
  setBudget,
  bedrooms,
  setBedrooms,
  bedroomOptions,
  selection,
  setSelection,
  currencyCode,
  onContinue,
}: MobileLandingProps) {
  const budgetRef = useRef<HTMLDivElement | null>(null);
  const bedroomsRef = useRef<HTMLDivElement | null>(null);
  const roofRef = useRef<HTMLDivElement | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  // Track which section is in view so the top progress dots reflect it.
  useEffect(() => {
    const sections = [budgetRef.current, bedroomsRef.current, roofRef.current];
    if (sections.some((s) => !s)) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const idx = sections.findIndex((s) => s === visible.target);
        if (idx >= 0) setActiveStep(idx);
      },
      { rootMargin: "-30% 0px -50% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    sections.forEach((s) => s && io.observe(s));
    return () => io.disconnect();
  }, []);

  const roofLabel = selectionLabel(selection);
  const summary = `${roofLabel} · ${bedrooms === 0 ? "Studio" : `${bedrooms} bed`}`;

  return (
    <main className="eh-landing-mobile">
      <header className="eh-landing-mobile__topbar">
        <div className="eh-landing-mobile__brand">
          <Image
            src="/brand/logo-full-color.png"
            alt="Easy Housing"
            width={120}
            height={28}
            style={{ height: 22, width: "auto", display: "block" }}
            priority
          />
        </div>
        <div className="eh-landing-mobile__progress" aria-label="Step progress">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`eh-landing-mobile__dot${i === activeStep ? " is-active" : ""}`}
            />
          ))}
        </div>
        <div className="eh-landing-mobile__currency">{currencyCode}</div>
      </header>

      <div className="eh-landing-mobile__main">
        <div className="eh-landing-mobile__intro">
          <div className="eh-landing-mobile__intro-eyebrow">Design your home</div>
          <h1 className="eh-landing-mobile__intro-h1">
            Let&apos;s start with the essentials.
          </h1>
        </div>

        <section className="eh-landing-mobile__section" ref={budgetRef}>
          <div className="eh-landing-mobile__step-label">
            <span className="eh-landing-mobile__step-num">1</span>
            Your budget
          </div>
          <BudgetSlider value={budget} onChange={setBudget} />
        </section>

        <section className="eh-landing-mobile__section" ref={bedroomsRef}>
          <div className="eh-landing-mobile__step-label">
            <span className="eh-landing-mobile__step-num">2</span>
            Bedrooms
          </div>
          <BedroomsCounter
            value={bedrooms}
            onChange={setBedrooms}
            options={bedroomOptions}
          />
        </section>

        <section className="eh-landing-mobile__section" ref={roofRef}>
          <div className="eh-landing-mobile__step-label">
            <span className="eh-landing-mobile__step-num">3</span>
            Roof typology
          </div>
          <TypologyPicker
            selection={selection}
            onChange={setSelection}
            budget={budget}
            plans={plans}
            columns={2}
          />
        </section>
      </div>

      <div className="eh-landing-mobile__cta-bar">
        <div className="eh-landing-mobile__cta-summary">
          <span className="eh-landing-mobile__cta-eyebrow">Selected</span>
          <span className="eh-landing-mobile__cta-selection">{summary}</span>
        </div>
        <button
          type="button"
          className="ab-cta eh-landing-mobile__cta"
          onClick={onContinue}
        >
          Design it
          <span style={{ fontSize: 16, lineHeight: 1 }}>→</span>
        </button>
      </div>
    </main>
  );
}
