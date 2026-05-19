"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EHNavBar from "./EHNavBar";
import BudgetSlider from "./BudgetSlider";
import BedroomsCounter from "./BedroomsCounter";
import RoofPicker from "./RoofPicker";
import {
  minBedroomsFor,
  maxBedroomsFor,
  isAffordable,
  ROOF_FALLBACK_ORDER,
  type RoofType,
} from "./pricing-helpers";

export default function LandingScreen() {
  const router = useRouter();
  const [budget, setBudget] = useState(75_000_000);
  const [bedrooms, setBedrooms] = useState(2);
  const [roof, setRoof] = useState<RoofType>("monopitch");

  // If the current roof becomes unaffordable as the budget drops, fall
  // back to the cheapest still-affordable roof. If none are affordable
  // (e.g. budget pinned below every roof's min cost) leave the selection
  // alone so the user keeps a stable choice while every card is greyed.
  useEffect(() => {
    if (!isAffordable(roof, budget)) {
      const next = ROOF_FALLBACK_ORDER.find((r) => isAffordable(r, budget));
      if (next) setRoof(next);
    }
  }, [budget, roof]);

  const minBed = minBedroomsFor(roof);
  const maxBed = maxBedroomsFor(budget, roof);
  useEffect(() => {
    if (bedrooms > maxBed) setBedrooms(maxBed);
    else if (bedrooms < minBed) setBedrooms(minBed);
  }, [minBed, maxBed, bedrooms]);

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
          <RoofPicker value={roof} onChange={setRoof} budget={budget} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 36 }}>
            <button
              type="button"
              className="ab-cta"
              style={{ padding: "16px 36px", fontSize: 16 }}
              onClick={() => {
                const qs = new URLSearchParams({
                  roof,
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
