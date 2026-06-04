"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FloorplanJSON } from "@/types/floorplan";
import FloorplanSVG from "@/components/FloorplanSVG";
import EHNavBar from "@/components/EHNavBar";
import { pickPlan, type FloorPlanEntry } from "@/lib/floor-plans";
import { useFloorPlans } from "@/lib/useFloorPlans";
import { calculateBudget, countRooms, typologyInfoFor } from "@/lib/budget";
import {
  dxfFilename,
  selectionFromParams,
  selectionLabel,
  type Selection,
} from "@/lib/typologies";
import { fmtMoney } from "@/lib/countries";
import { useCountryGuard } from "@/lib/use-active-country";
import {
  EMAIL_RE,
  HEAR_ABOUT_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  TIMELINE_OPTIONS,
  isClientInfoValid,
  type SubmitPayload,
} from "@/lib/configurator-submit";
import { checkPhone } from "@/lib/contact-checks";

const LANDING_DEFAULT_BUDGET = 75_000_000;

const fmtM = (mm: number) => `${(mm / 1000).toFixed(2)} m`;
const fmtArea = (m2: number) => `${m2.toFixed(2)} m²`;

type SubmitState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "ok" }
  | { status: "error"; message: string };

function FinalScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Block until the gate has set a country — the submit payload below carries
  // the country code through to the sheet, PDF cover, and email subject. The
  // local name avoids colliding with the placeholder `country` form field.
  const activeCountry = useCountryGuard();

  const typologyParam = searchParams.get("typology");
  const subtypeParam = searchParams.get("subtype");
  const bedroomsParam = searchParams.get("bedrooms");
  const budgetParam = searchParams.get("budget");
  const deltaParam = searchParams.get("delta");

  const selection: Selection = useMemo(
    () => selectionFromParams(typologyParam, subtypeParam),
    [typologyParam, subtypeParam],
  );
  const bedroomsNum = bedroomsParam != null && bedroomsParam !== "" ? Number(bedroomsParam) : null;
  // Floor-plan registry comes from the directory scan; entry is resolved via
  // `pickPlan` (handles closest-available fallback if the requested variant
  // doesn't ship yet — same behaviour as the configurator).
  const plans = useFloorPlans();
  const entry: FloorPlanEntry | null = useMemo(
    () => (plans ? pickPlan(plans, selection, bedroomsNum) : null),
    [plans, selection, bedroomsNum],
  );
  const budgetParamNum = (() => {
    const n = budgetParam != null ? Number(budgetParam) : NaN;
    return Number.isFinite(n) && n > 0 ? n : LANDING_DEFAULT_BUDGET;
  })();

  const [plan, setPlan] = useState<FloorplanJSON | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reference is server-authoritative — fetched once on mount so the same id
  // shows on the page, lands on the PDF, the email, the sheet row and the
  // Drive backlog. Stable for the lifetime of this screen.
  const [reference, setReference] = useState<string | null>(null);
  const [savedDate] = useState(() =>
    new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/configurator/reference", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { reference?: string };
        if (!cancelled && json.reference) setReference(json.reference);
      } catch {
        // Best-effort — submit route will mint one if we send none.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!entry) return;
    let cancelled = false;
    const load = async () => {
      setError(null);
      try {
        const res = await fetch(`/api/parse-dxf?file=${encodeURIComponent(entry.file)}`);
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
  }, [entry]);

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
    const typology = typologyInfoFor(selection);
    return {
      footprintM2: rooms.gfa + rooms.terraceArea,
      budgetUgx: calculateBudget(rooms, typology).coreTotal,
    };
  }, [plan, delta, selection]);

  // `entry` is null while the directory scan is in flight; render placeholders
  // until both the registry and the parsed plan are loaded.
  const bedrooms = entry?.bedrooms ?? 0;
  const widthMm = plan ? plan.baseWidth + delta : 0;
  const lengthMm = plan ? plan.baseDepth : 0;
  const label = entry
    ? `${selectionLabel(entry.selection)} · ${bedrooms === 0 ? "Studio" : `${bedrooms}-bed`}`
    : "";
  const version = entry?.version ?? 1;
  const dxfName = entry ? dxfFilename(entry.selection, bedrooms, version) : "";

  // ── Form state ────────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [timeline, setTimeline] = useState("");
  // Placeholder mirror fields — see `ClientInfo` in
  // src/lib/configurator-submit.ts for the contract and Phase 6 of
  // docs/integrations-setup.md for swapping these for the real form Qs.
  const [country, setCountry] = useState("");
  const [projectType, setProjectType] = useState("");
  const [hearAbout, setHearAbout] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });

  // Advisory contact-existence warnings (non-blocking). Phone is checked
  // client-side; email deliverability (MX records) is checked server-side
  // via /api/configurator/validate-email. The check runs on a debounce so
  // warnings appear as the user finishes typing — relying on blur alone is
  // fragile (autofill / submit-without-tab-out skip it).
  const phoneCheck = useMemo(() => checkPhone(phone), [phone]);
  const [emailWarning, setEmailWarning] = useState<string | null>(null);
  const [emailChecking, setEmailChecking] = useState(false);

  useEffect(() => {
    const e = email.trim();
    if (!EMAIL_RE.test(e)) {
      setEmailWarning(null);
      setEmailChecking(false);
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      setEmailChecking(true);
      try {
        const res = await fetch(`/api/configurator/validate-email?email=${encodeURIComponent(e)}`);
        const data = (await res.json()) as { deliverable: boolean; warning: string | null };
        if (!cancelled) setEmailWarning(data.warning);
      } catch {
        if (!cancelled) setEmailWarning(null);
      } finally {
        if (!cancelled) setEmailChecking(false);
      }
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [email]);

  const canGenerate =
    reference !== null &&
    entry !== null &&
    plan !== null &&
    name.trim().length > 1 &&
    EMAIL_RE.test(email.trim()) &&
    phone.trim().length >= 6 &&
    timeline !== "" &&
    country.trim().length > 1 &&
    projectType !== "" &&
    hearAbout !== "" &&
    agreed === true;

  const goToStep = (step: number) => {
    const qs = searchParams.toString();
    if (step === 1) router.push(`/${qs ? `?${qs}` : ""}`);
    if (step === 2) router.push(`/configurator${qs ? `?${qs}` : ""}`);
  };

  const handleSubmit = async () => {
    if (!canGenerate || !plan || !entry || !activeCountry) return;
    const client = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      timeline,
      country: country.trim(),
      projectType,
      hearAbout,
      agreed,
    };
    if (!isClientInfoValid(client)) return;
    setSubmit({ status: "sending" });

    const payload: SubmitPayload = {
      selection: { selection: entry.selection, file: entry.file, delta, version, label },
      bedrooms,
      budget: derived.budgetUgx,
      dimensions: {
        widthM: widthMm / 1000,
        lengthM: lengthMm / 1000,
        footprintM2: derived.footprintM2,
      },
      client,
      reference,
      source: typeof window !== "undefined" ? window.location.href : "",
      country: activeCountry.code,
    };

    try {
      const res = await fetch("/api/configurator/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.emailed) {
        throw new Error(
          data?.error ?? "We couldn't email your design — please check the address and try again.",
        );
      }
      setSubmit({ status: "ok" });
    } catch (e) {
      setSubmit({
        status: "error",
        message:
          e instanceof Error
            ? e.message
            : "We couldn't email your design — please check the address and try again.",
      });
    }
  };

  const eyebrow: React.CSSProperties = {
    fontSize: 11,
    letterSpacing: ".12em",
    textTransform: "uppercase",
    fontWeight: 600,
  };

  if (!activeCountry) return null;

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
            Saved {savedDate} · ref {reference ?? "pending…"}
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
              We&apos;ll generate a PDF overview and send it to you. Bring it along when you meet our
              architects.
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
                  {fmtMoney(Math.round(derived.budgetUgx))}
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
                {emailChecking && (
                  <p style={{ fontSize: 12, color: "var(--eh-text-soft)", margin: "2px 0 0" }}>
                    Checking the address…
                  </p>
                )}
                {!emailChecking && emailWarning && (
                  <p style={{ fontSize: 12, color: "var(--eh-warning)", margin: "2px 0 0" }}>
                    {emailWarning}
                  </p>
                )}
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
                {phone.trim().length >= 6 && phoneCheck.warning && (
                  <p style={{ fontSize: 12, color: "var(--eh-warning)", margin: "2px 0 0" }}>
                    {phoneCheck.warning}
                  </p>
                )}
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="eh-timeline">Intended timeline to delivery</label>
                <select
                  id="eh-timeline"
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                >
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

              {/* Placeholder mirror fields — swap labels/options here and in
                  PROJECT_TYPE_OPTIONS / HEAR_ABOUT_OPTIONS once Wolf supplies
                  the real form questions (Phase 6 of integrations-setup.md). */}
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="eh-country">Country / location</label>
                <input
                  id="eh-country"
                  type="text"
                  autoComplete="country-name"
                  placeholder="e.g. Uganda"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="eh-project-type">What&apos;s this design for?</label>
                <select
                  id="eh-project-type"
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {PROJECT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="eh-hear-about">How did you hear about us?</label>
                <select
                  id="eh-hear-about"
                  value={hearAbout}
                  onChange={(e) => setHearAbout(e.target.value)}
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {HEAR_ABOUT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
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
              <p
                role="alert"
                style={{ marginTop: 18, fontSize: 13, color: "var(--eh-danger)", fontWeight: 500 }}
              >
                {submit.message}
              </p>
            )}
            {submit.status === "ok" && (
              <p
                role="status"
                style={{ marginTop: 18, fontSize: 13, color: "var(--eh-green-700)", fontWeight: 600 }}
              >
                Sent — check {email.trim()} for your design PDF. An architect will be in touch within a
                couple of working days.
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
              disabled={!canGenerate || submit.status === "sending" || submit.status === "ok"}
              title={
                canGenerate
                  ? undefined
                  : "Fill in every detail and accept the terms to generate your PDF."
              }
              style={{ padding: "16px 30px" }}
            >
              {submit.status === "sending"
                ? "Generating…"
                : submit.status === "ok"
                ? "PDF sent ✓"
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
