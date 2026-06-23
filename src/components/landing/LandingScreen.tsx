"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCountryGuard } from "@/lib/use-active-country";
import { useIsMobile } from "@/lib/use-media-query";
import EHNavBar from "@/components/EHNavBar";
import BudgetSlider from "./BudgetSlider";
import MobileBudgetSlider from "@/components/mobile/MobileBudgetSlider";
import BedroomsCounter from "./BedroomsCounter";
import TypologyPicker from "./TypologyPicker";
import {
  selectionLabel,
  selectionToParams,
  type Selection,
} from "@/lib/typologies";
import {
  budgetBounds,
  maxAffordableBedrooms,
  resolveAffordableSelection,
  type Currency,
  type PriceIndex,
} from "@/lib/affordability";
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
  /** Real-engine prices for every plan (min/max width, both currencies) —
   *  drives the budget slider's bounds and the affordability grey-out. */
  priceIndex: PriceIndex;
}

export default function LandingScreen({ plans, priceIndex }: Props) {
  const router = useRouter();
  const isMobile = useIsMobile();
  // Block the landing until we know the country — otherwise the SSR render
  // (no localStorage) and the hydrated render (KES) would disagree on every
  // price, and there's no point in showing prices in the wrong currency.
  const country = useCountryGuard();
  // Budget slider works in the active country's NATIVE currency. Its endpoints
  // are the catalog's cheapest plan @ min width ‥ priciest plan @ max width.
  // `budget` is null until the user drags; we read `budgetValue` (defaulting to
  // the top of the range, so nothing is greyed initially) everywhere.
  const currency = (country?.currency.code ?? "UGX") as Currency;
  const budgetStep = country?.currency.displayRound ?? 100_000;
  const bounds = budgetBounds(priceIndex, currency);
  const sliderMin = Math.floor(bounds.min / budgetStep) * budgetStep;
  const sliderMax = Math.ceil(bounds.max / budgetStep) * budgetStep;
  // Open mid-range until the user drags, so the slider starts at a realistic
  // budget (some of the catalog reachable, some not) rather than the extreme.
  const sliderDefault = Math.round((sliderMin + sliderMax) / 2 / budgetStep) * budgetStep;
  const [budget, setBudget] = useState<number | null>(null);
  const budgetValue = budget ?? sliderDefault;
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
    const affordable = resolveAffordableSelection(priceIndex, currency, budgetValue, selection);
    const reachable = resolveAvailableSelection(plans, affordable) ?? affordable;
    if (reachable.typology !== selection.typology || reachable.subtype !== selection.subtype) {
      setSelection(reachable);
    }
  }, [priceIndex, currency, budgetValue, selection, plans]);

  // Bedroom options — what's on disk for this selection, capped by the budget.
  // The counter steps through THIS list so gaps (e.g. Clerestory Large ships
  // 2BR + 4BR but no 3BR) are skipped instead of trapping the user at 2.
  const availBR = availableBedrooms(plans, selection);
  const affordableMax = maxAffordableBedrooms(priceIndex, currency, budgetValue, selection, bedrooms);
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
      budget: String(budgetValue),
    });
    router.push(`/configurator?${qs.toString()}`);
  };

  if (isMobile) {
    return (
      <MobileLandingScreen
        plans={plans}
        priceIndex={priceIndex}
        currency={currency}
        budget={budgetValue}
        setBudget={setBudget}
        budgetMin={sliderMin}
        budgetMax={sliderMax}
        budgetStep={budgetStep}
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
              Three quick choices — we&apos;ll generate a floor plan and a transparent budget you can share with our sales team.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 36, marginBottom: 32 }}>
            <BudgetSlider
              value={budgetValue}
              onChange={setBudget}
              min={sliderMin}
              max={sliderMax}
              step={budgetStep}
            />
            <BedroomsCounter value={bedrooms} onChange={setBedrooms} options={bedroomOptions} />
          </div>
          <TypologyPicker
            selection={selection}
            onChange={setSelection}
            budget={budgetValue}
            priceIndex={priceIndex}
            currency={currency}
            plans={plans}
          />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 36 }}>
            <button
              type="button"
              className="ab-cta"
              style={{ padding: "16px 36px", fontSize: 16 }}
              onClick={openConfigurator}
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
  priceIndex: PriceIndex;
  currency: Currency;
  budget: number;
  setBudget: (n: number) => void;
  budgetMin: number;
  budgetMax: number;
  budgetStep: number;
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
  priceIndex,
  currency,
  budget,
  setBudget,
  budgetMin,
  budgetMax,
  budgetStep,
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
          {/* Phone uses the pointer-driven MobileBudgetSlider (same fat touch
              box as the configurator) — the desktop BudgetSlider's native
              <input type=range> is small and flaky on iOS touch. */}
          <MobileBudgetSlider
            value={budget}
            onChange={setBudget}
            min={budgetMin}
            max={budgetMax}
            step={budgetStep}
          />
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
            priceIndex={priceIndex}
            currency={currency}
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
          <span style={{ fontSize: 14, lineHeight: 1 }}>→</span>
        </button>
      </div>
    </main>
  );
}
