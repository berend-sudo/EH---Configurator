"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FloorplanJSON } from "@/types/floorplan";
import FloorplanSVG from "@/components/FloorplanSVG";
import EHNavBar from "@/components/EHNavBar";
import { pickPlan } from "@/lib/floor-plans";
import { useFloorPlans } from "@/lib/useFloorPlans";
import { calculateBudget, countRooms, typologyInfoFor } from "@/lib/budget";
import { fmtUGX } from "@/components/landing/fmtUGX";
import {
  dxfFilename,
  minBedroomsFor,
  selectionFromParams,
  selectionLabel,
} from "@/lib/typologies";
import { makeReference } from "@/lib/design-id";
import {
  EMAIL_RE,
  TIMELINE_OPTIONS,
  isClientInfoValid,
  type SubmitPayload,
} from "@/lib/configurator-submit";

const fmtM = (mm: number) => `${(mm / 1000).toFixed(2)} m`;
const fmtArea = (m2: number) => `${m2.toFixed(2)} m²`;

type SubmitState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "ok"; emailed: boolean }
  | { status: "error"; message: string };

function downloadPdf(base64: string, filename: string) {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([arr], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function FinalScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const typologyParam = searchParams.get("typology");
  const subtypeParam = searchParams.get("subtype");
  const bedroomsParam = searchParams.get("bedrooms");
  const deltaParam = searchParams.get("delta");

  const selection = useMemo(
    () => selectionFromParams(typologyParam, subtypeParam),
    [typologyParam, subtypeParam],
  );
  const requestedBedrooms = (() => {
    const n = bedroomsParam != null && bedroomsParam !== "" ? Number(bedroomsParam) : NaN;
    const min = minBedroomsFor(selection);
    return Number.isFinite(n) ? Math.max(min, n) : min;
  })();

  const plans = useFloorPlans();
  const entry = useMemo(
    () => (plans ? pickPlan(plans, selection, requestedBedrooms) : null),
    [plans, selection, requestedBedrooms],
  );
  // The summary commits to the served plan (the closest available one).
  const servedSelection = entry?.selection ?? selection;
  const bedrooms = entry?.bedrooms ?? requestedBedrooms;
  const version = entry?.version ?? 1;
  const label = `${selectionLabel(servedSelection)} · ${bedrooms === 0 ? "Studio" : `${bedrooms}-bed`}`;
  const dxfName = dxfFilename(servedSelection, bedrooms, version);

  const [plan, setPlan] = useState<FloorplanJSON | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generated once on the client so the reference and date are stable.
  const [reference] = useState(() => makeReference());
  const [savedDate] = useState(() =>
    new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
  );

  const planFile = entry?.file ?? null;
  useEffect(() => {
    if (!planFile) return;
    let cancelled = false;
    const load = async () => {
      setError(null);
      try {
        const res = await fetch(`/api/parse-dxf?file=${encodeURIComponent(planFile)}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Load failed");
        }
        const json: FloorplanJSON = await res.json();
        if (!cancelled) setPlan(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unknown error");
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [planFile]);

  // Width chosen on the configurator rides on ?delta=, clamped to the plan.
  const delta = useMemo(() => {
    if (!plan) return 0;
    const d = deltaParam != null ? Number(deltaParam) : NaN;
    if (!Number.isFinite(d)) return plan.minDelta;
    return Math.min(Math.max(d, plan.minDelta), plan.maxDelta);
  }, [plan, deltaParam]);

  const derived = useMemo(() => {
    if (!plan) return { footprintM2: 0, budgetUgx: 0 };
    const rooms = countRooms(plan, delta);
    return {
      footprintM2: rooms.gfa + rooms.terraceArea,
      budgetUgx: calculateBudget(rooms, typologyInfoFor(servedSelection)).coreTotal,
    };
  }, [plan, delta, servedSelection]);

  const widthMm = plan ? plan.baseWidth + delta : 0;
  const lengthMm = plan ? plan.baseDepth : 0;

  // ── Form state ────────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [timeline, setTimeline] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });

  const canGenerate =
    name.trim().length > 1 &&
    EMAIL_RE.test(email.trim()) &&
    phone.trim().length >= 6 &&
    timeline !== "" &&
    agreed === true;

  const goToStep = (step: number) => {
    const qs = searchParams.toString();
    if (step === 1) router.push(`/${qs ? `?${qs}` : ""}`);
    if (step === 2) router.push(`/configurator${qs ? `?${qs}` : ""}`);
  };

  const handleSubmit = async () => {
    if (!canGenerate || !plan || !entry) return;
    const client = { name: name.trim(), email: email.trim(), phone: phone.trim(), timeline, agreed };
    if (!isClientInfoValid(client)) return;
    setSubmit({ status: "sending" });

    const payload: SubmitPayload = {
      selection: {
        typology: entry.selection.typology,
        subtype: entry.selection.subtype,
        file: entry.file,
        delta,
        version: entry.version,
        label,
      },
      bedrooms: entry.bedrooms,
      budget: derived.budgetUgx,
      dimensions: {
        widthM: widthMm / 1000,
        lengthM: lengthMm / 1000,
        footprintM2: derived.footprintM2,
      },
      client,
      reference,
      source: typeof window !== "undefined" ? window.location.href : "",
    };

    try {
      const res = await fetch("/api/configurator/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "We couldn't generate your design — please try again.");
      }
      if (data.pdfBase64) downloadPdf(data.pdfBase64, data.pdfFilename ?? "EasyHousing-design.pdf");
      setSubmit({ status: "ok", emailed: !!data.emailed });
    } catch (e) {
      setSubmit({
        status: "error",
        message:
          e instanceof Error ? e.message : "We couldn't generate your design — please try again.",
      });
    }
  };

  const eyebrow: React.CSSProperties = {
    fontSize: 11,
    letterSpacing: ".12em",
    textTransform: "uppercase",
    fontWeight: 600,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--eh-bg-alt)",
        color: "var(--eh-text)",
      }}
    >
      <EHNavBar step={3} totalSteps={3} maxVisitedStep={3} onStepChange={goToStep} />

      <div className="eh-final-grid" style={{ flex: 1 }}>
        {/* LEFT — design summary */}
        <div
          className="eh-final-col"
          style={{ background: "var(--eh-bg-alt)", display: "flex", flexDirection: "column" }}
        >
          <div style={{ ...eyebrow, color: "var(--eh-green-700)", marginBottom: 10 }}>Your design</div>
          <h1 style={{ fontSize: 42, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
            {label}
          </h1>
          <p style={{ fontSize: 15, fontWeight: 300, color: "var(--eh-text-muted)", margin: "0 0 20px" }}>
            Saved {savedDate} · ref {reference}
          </p>

          {/* DXF chip — the file the architects receive */}
          <div style={{ marginBottom: 24 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#fff",
                border: "1px solid var(--eh-stroke)",
                borderRadius: 999,
                padding: "7px 14px",
                fontSize: 12.5,
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
                color: "var(--eh-text-muted)",
              }}
            >
              <span style={{ ...eyebrow, fontSize: 9, color: "var(--eh-green-700)" }}>DXF</span>
              {dxfName}
            </span>
          </div>

          {/* Mini plan card */}
          <div
            style={{
              background: "#fff",
              borderRadius: 24,
              border: "1px solid var(--eh-stroke)",
              padding: 24,
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 220,
            }}
          >
            {plan ? (
              <FloorplanSVG plan={plan} delta={delta} showDims={false} />
            ) : (
              <div style={{ fontSize: 14, color: "var(--eh-text-soft)" }}>
                {error ?? "Loading floor plan…"}
              </div>
            )}
          </div>

          {/* 4-stat strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            {[
              { k: "Width", v: plan ? fmtM(widthMm) : "—" },
              { k: "Length", v: plan ? fmtM(lengthMm) : "—" },
              { k: "Footprint", v: plan ? fmtArea(derived.footprintM2) : "—" },
              { k: "Bedrooms", v: bedrooms === 0 ? "Studio" : String(bedrooms) },
            ].map((s) => (
              <div
                key={s.k}
                style={{
                  background: "#fff",
                  border: "1px solid var(--eh-stroke)",
                  borderRadius: 14,
                  padding: "14px 16px",
                }}
              >
                <div style={{ ...eyebrow, fontSize: 10, color: "var(--eh-text-muted)" }}>{s.k}</div>
                <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — contact form */}
        <div
          className="eh-final-col eh-final-right"
          style={{ background: "#fff", display: "flex", flexDirection: "column", justifyContent: "space-between" }}
        >
          <div>
            <h2 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
              Your details.
            </h2>
            <p
              style={{
                fontSize: 15,
                fontWeight: 300,
                color: "var(--eh-text-muted)",
                margin: "0 0 28px",
                lineHeight: 1.55,
              }}
            >
              We&apos;ll generate a PDF overview to download and, where configured, email a copy. Bring
              it along when you meet our architects.
            </p>

            {/* Deep-green summary card */}
            <div
              style={{
                background: "var(--eh-green-900)",
                color: "#fff",
                borderRadius: 14,
                padding: "16px 18px",
                marginBottom: 32,
              }}
            >
              <div style={{ ...eyebrow, fontSize: 10, color: "var(--eh-green-200)" }}>Submitting</div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 16,
                  marginTop: 6,
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 600 }}>{label}</div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: "var(--eh-green)",
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                  }}
                >
                  {fmtUGX(Math.round(derived.budgetUgx))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                {[
                  { k: "Width", v: plan ? fmtM(widthMm) : "—" },
                  { k: "Length", v: plan ? fmtM(lengthMm) : "—" },
                ].map((c) => (
                  <div
                    key={c.k}
                    style={{
                      flex: 1,
                      background: "rgba(255,255,255,0.07)",
                      borderRadius: 10,
                      padding: "8px 12px",
                    }}
                  >
                    <div style={{ ...eyebrow, fontSize: 9, color: "var(--eh-green-200)" }}>{c.k}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{c.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="eh-name">Full name</label>
                <input
                  id="eh-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="eh-email">Email</label>
                <input
                  id="eh-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="eh-phone">Phone</label>
                <input
                  id="eh-phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+256 700 000 000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="eh-timeline">Intended timeline to delivery</label>
                <select id="eh-timeline" value={timeline} onChange={(e) => setTimeline(e.target.value)}>
                  <option value="" disabled>
                    Select a timeline…
                  </option>
                  {TIMELINE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: 12, color: "var(--eh-text-soft)", margin: "2px 0 0" }}>
                  Minimum 4 months — time we need to design, prefab and ship your home.
                </p>
              </div>
            </div>

            {/* Consent */}
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                fontSize: 13,
                color: "var(--eh-text-muted)",
                lineHeight: 1.55,
                marginTop: 24,
              }}
            >
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                style={{ marginTop: 3, width: 18, height: 18, accentColor: "var(--eh-green-500)", flex: "0 0 auto" }}
              />
              <span>
                I agree that Easy Housing may contact me about this design and store the details I&apos;ve
                provided for that purpose. We will not share or sell your details to any third party. By
                submitting this form I confirm I have read and accept the{" "}
                <a
                  href="/legal/terms-and-conditions.pdf"
                  target="_blank"
                  rel="noopener"
                  style={{ color: "var(--eh-green-700)", fontWeight: 600, textDecoration: "underline" }}
                >
                  terms &amp; conditions
                </a>{" "}
                and{" "}
                <a
                  href="/legal/privacy-policy.pdf"
                  target="_blank"
                  rel="noopener"
                  style={{ color: "var(--eh-green-700)", fontWeight: 600, textDecoration: "underline" }}
                >
                  privacy policy
                </a>
                .
              </span>
            </label>

            {submit.status === "error" && (
              <p role="alert" style={{ marginTop: 18, fontSize: 13, color: "var(--eh-danger)", fontWeight: 500 }}>
                {submit.message}
              </p>
            )}
            {submit.status === "ok" && (
              <p role="status" style={{ marginTop: 18, fontSize: 13, color: "var(--eh-green-700)", fontWeight: 600 }}>
                {submit.emailed
                  ? `Done — your design PDF has downloaded and we've emailed a copy to ${email.trim()}.`
                  : "Done — your design PDF has downloaded. An architect will be in touch within a couple of working days."}
              </p>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              marginTop: 32,
              paddingTop: 24,
              borderTop: "1px solid var(--eh-stroke)",
            }}
          >
            <button
              type="button"
              className="ab-cta"
              onClick={() => goToStep(2)}
              style={{
                background: "transparent",
                color: "var(--eh-green-900)",
                border: "1.5px solid var(--eh-green-900)",
              }}
            >
              ← Edit design
            </button>
            <button
              type="button"
              className="ab-cta"
              onClick={handleSubmit}
              disabled={!canGenerate || !plan || submit.status === "sending" || submit.status === "ok"}
              title={
                canGenerate ? undefined : "Fill in every detail and accept the terms to generate your PDF."
              }
              style={{ padding: "16px 30px" }}
            >
              {submit.status === "sending"
                ? "Generating…"
                : submit.status === "ok"
                ? "PDF ready ✓"
                : "Generate PDF"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SummaryPage() {
  return (
    <Suspense fallback={null}>
      <FinalScreen />
    </Suspense>
  );
}
