"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import EHNavBar from "@/components/EHNavBar";
import BudgetSlider from "./BudgetSlider";
import BedroomsCounter from "./BedroomsCounter";
import TypologyPicker from "./TypologyPicker";
import {
  maxBedroomsFor,
  resolveAffordableSelection,
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

  // Bedroom range — gated by both the budget (max) and what's on disk.
  const availBR = availableBedrooms(plans, selection);
  const affordableMax = maxBedroomsFor(budget, selection);
  const affordableBR = availBR.filter((b) => b <= affordableMax);
  const minBed = affordableBR[0] ?? availBR[0] ?? 0;
  const maxBed = affordableBR[affordableBR.length - 1] ?? availBR[availBR.length - 1] ?? 0;
  useEffect(() => {
    const clamped = resolveAvailableBedrooms(plans, selection, bedrooms);
    const next = Math.min(maxBed, Math.max(minBed, clamped));
    if (next !== bedrooms) setBedrooms(next);
  }, [minBed, maxBed, bedrooms, plans, selection]);

  return (
    <main style={{ position: "relative", width: "100%", minHeight: "100vh", overflow: "hidden" }}>
      {/* TODO: replace with real Easy Housing photograph */}
      <div
        aria-hidden
        style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #6a8466, #2a4d3a)" }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(0,59,43,0.6) 0%, rgba(0,59,43,0.25) 60%, rgba(0,59,43,0.5) 100%)",
        }}
      />

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
            <BedroomsCounter value={bedrooms} onChange={setBedrooms} min={minBed} max={maxBed} />
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
