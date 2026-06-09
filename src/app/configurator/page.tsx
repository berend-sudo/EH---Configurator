"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FloorplanJSON } from "@/types/floorplan";
import FloorplanSVG from "@/components/FloorplanSVG";
import EHNavBar from "@/components/EHNavBar";
import SliderRow from "@/components/configurator/SliderRow";
import SummaryCard from "@/components/configurator/SummaryCard";
import ViewToggle, { type View } from "@/components/configurator/ViewToggle";
import PhotoCollage from "@/components/configurator/PhotoCollage";
import PlanSwitcher from "@/components/configurator/PlanSwitcher";
import BudgetSlider from "@/components/landing/BudgetSlider";
import {
  pickPlan,
  resolveAvailableBedrooms,
  resolveAvailableSelection,
  type FloorPlanEntry,
} from "@/lib/floor-plans";
import { useFloorPlans } from "@/lib/useFloorPlans";
import { useCountryGuard } from "@/lib/use-active-country";
import { calculateBudget, countRooms, typologyInfoFor } from "@/lib/budget";
import {
  maxBedroomsFor,
  minBedroomsFor,
  priceFor,
  resolveAffordableSelection,
  selectionFromParams,
  selectionLabel,
  type Selection,
} from "@/lib/typologies";

const LANDING_DEFAULT_BUDGET = 75_000_000;

function ConfiguratorScreen() {
  // Block the configurator until a country has been picked at the gate.
  // Renders no money in the wrong currency, even briefly.
  const country = useCountryGuard();
  const [plan, setPlan] = useState<FloorplanJSON | null>(null);
  const [delta, setDelta] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("plan");
  const [showMezzanine, setShowMezzanine] = useState(true);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const typologyParam = searchParams.get("typology");
  const subtypeParam = searchParams.get("subtype");
  const bedroomsParam = searchParams.get("bedrooms");
  const budgetParam = searchParams.get("budget");
  const selection: Selection = useMemo(
    () => selectionFromParams(typologyParam, subtypeParam),
    [typologyParam, subtypeParam],
  );
  // Bedrooms the user asked for (URL), clamped to the typology's minimum.
  const requestedBedrooms = (() => {
    const n = bedroomsParam != null && bedroomsParam !== "" ? Number(bedroomsParam) : NaN;
    const min = minBedroomsFor(selection);
    return Number.isFinite(n) ? Math.max(min, n) : min;
  })();
  const plans = useFloorPlans();
  const currentEntry: FloorPlanEntry | null = useMemo(
    () => (plans ? pickPlan(plans, selection, requestedBedrooms) : null),
    [plans, selection, requestedBedrooms],
  );
  const planFile = currentEntry?.file ?? null;
  // Budget is local state (source of truth for gating + the slider) so dragging
  // stays smooth; it's seeded from ?budget= and synced back to the URL below.
  const [budget, setBudget] = useState(() => {
    const n = budgetParam != null ? Number(budgetParam) : NaN;
    return Number.isFinite(n) && n > 0 ? n : LANDING_DEFAULT_BUDGET;
  });

  useEffect(() => {
    if (!planFile) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/parse-dxf?file=${encodeURIComponent(planFile)}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Load failed");
        }
        const json: FloorplanJSON = await res.json();
        if (cancelled) return;
        setPlan(json);
        setDelta(json.minDelta);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [planFile]);

  const derived = useMemo(() => {
    if (!plan) {
      return { rooms: null, budgetUgx: 0 };
    }
    const rooms = countRooms(plan, delta);
    const typology = typologyInfoFor(selection);
    const budgetUgx = calculateBudget(rooms, typology).coreTotal;
    return { rooms, budgetUgx };
  }, [plan, delta, selection]);

  const widthMm = plan ? plan.baseWidth + delta : 0;
  const footprintM2 = derived.rooms ? derived.rooms.gfa + derived.rooms.terraceArea : 0;
  const livingM2 = derived.rooms?.gfa ?? 0;
  const terraceM2 = derived.rooms?.terraceArea ?? 0;
  const mezzanineM2 = derived.rooms?.mezzanineAreaM2 ?? 0;

  // Displayed bedroom count = the user's request. The served plan may be a
  // closest-match fallback with a different count until that exact DXF exists.
  const bedrooms = requestedBedrooms;
  const roofLabel = selectionLabel(selection);
  const modelLabel = `${roofLabel} · ${bedrooms === 0 ? "Studio" : `${bedrooms}-bed`}`;
  const subtitle = `${bedrooms === 0 ? "Studio" : bedrooms === 1 ? "1 bedroom" : `${bedrooms} bedrooms`} · ${roofLabel} roof`;
  // Whether the served plan is the exact requested variant (drives the
  // "closest available plan" notice below).
  const exactMatch =
    currentEntry != null &&
    currentEntry.selection.typology === selection.typology &&
    currentEntry.selection.subtype === selection.subtype &&
    currentEntry.bedrooms === bedrooms;

  // When the served plan isn't the exact requested variant, name what's
  // actually on screen so the user knows it's a stand-in (until that DXF lands).
  const servedLabel =
    currentEntry != null
      ? `${selectionLabel(currentEntry.selection)} · ${
          currentEntry.bedrooms === 0 ? "Studio" : `${currentEntry.bedrooms}-bed`
        }`
      : null;
  const showFallbackNotice = plan != null && currentEntry != null && !exactMatch;

  const handleReset = () => {
    if (plan) setDelta(plan.minDelta);
  };

  const goToSummary = () => {
    if (!currentEntry) return;
    const params = new URLSearchParams();
    params.set("typology", currentEntry.selection.typology);
    if (currentEntry.selection.subtype) params.set("subtype", currentEntry.selection.subtype);
    params.set("bedrooms", String(currentEntry.bedrooms));
    params.set("budget", String(budget));
    params.set("v", String(currentEntry.version));
    params.set("delta", String(delta));
    router.push(`/summary?${params.toString()}`);
  };

  const updateParams = (next: { bedrooms?: number; selection?: Selection }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.selection) {
      params.set("typology", next.selection.typology);
      if (next.selection.subtype) params.set("subtype", next.selection.subtype);
      else params.delete("subtype");
      // Switching typology/subtype can leave the current bedroom count without
      // a plan (e.g. Gable Standard 4BR → Large, which only ships 3BR). Clamp
      // to the nearest available count for the new selection so the seg can't
      // keep showing a stale, plan-less option.
      const desired = next.bedrooms ?? bedrooms;
      const clamped = plans
        ? Math.max(
            minBedroomsFor(next.selection),
            resolveAvailableBedrooms(plans, next.selection, desired),
          )
        : desired;
      params.set("bedrooms", String(clamped));
    } else if (next.bedrooms != null) {
      params.set("bedrooms", String(next.bedrooms));
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  // Persist the budget to the URL (debounced) so deep links keep it, without
  // routing on every drag tick.
  useEffect(() => {
    const id = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if ((params.get("budget") ?? "") !== String(budget)) {
        params.set("budget", String(budget));
        router.replace(`${pathname}?${params.toString()}`);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [budget, searchParams, pathname, router]);

  // When the budget drops below the current selection/bedroom cost, move to the
  // cheapest still-affordable + available option (mirrors the landing screen).
  useEffect(() => {
    if (!plans) return;
    if (priceFor(selection, requestedBedrooms) <= budget) return;
    const affordable = resolveAffordableSelection(budget, selection);
    const reachable = resolveAvailableSelection(plans, affordable) ?? affordable;
    const maxBr = maxBedroomsFor(budget, reachable);
    const targetBr = Math.max(minBedroomsFor(reachable), Math.min(maxBr, requestedBedrooms));
    const finalBr = resolveAvailableBedrooms(plans, reachable, targetBr);
    if (
      reachable.typology !== selection.typology ||
      reachable.subtype !== selection.subtype ||
      finalBr !== requestedBedrooms
    ) {
      updateParams({ selection: reachable, bedrooms: finalBr });
    }
    // updateParams is stable for our purposes; re-running only on the inputs below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budget, selection, requestedBedrooms, plans]);

  if (!country) return null;

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--eh-bg-alt)",
        color: "var(--eh-text)",
        overflow: "hidden",
      }}
    >
      <EHNavBar
        step={2}
        totalSteps={3}
        onStepChange={(s) => {
          // Step 1 ("Start") returns to the landing screen. Step 3 ("Details")
          // isn't reachable yet (no /summary), so it stays disabled.
          if (s === 1) router.push("/");
        }}
      />

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "380px 1fr",
          minHeight: 0,
        }}
      >
        {/* LEFT — controls rail */}
        <div
          style={{
            background: "var(--eh-bg)",
            borderRight: "1px solid var(--eh-stroke)",
            padding: "32px 32px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 28,
            overflow: "auto",
            minHeight: 0,
          }}
        >
          {/* Title block */}
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: ".12em",
                textTransform: "uppercase",
                color: "var(--eh-green-700)",
                fontWeight: 600,
              }}
            >
              Your design
            </div>
            <h2
              style={{
                fontSize: 26,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                margin: "6px 0 6px",
              }}
            >
              {modelLabel}
            </h2>
            <div style={{ fontSize: 13, color: "var(--eh-text-muted)" }}>{subtitle}</div>
            {showFallbackNotice && (
              <div
                role="status"
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "var(--eh-green-50)",
                  border: "1px solid var(--eh-stroke)",
                  fontSize: 12,
                  lineHeight: 1.45,
                  color: "var(--eh-text-muted)",
                }}
              >
                <span style={{ fontWeight: 600, color: "var(--eh-green-900)" }}>
                  Closest available plan.
                </span>{" "}
                The {roofLabel} {bedrooms === 0 ? "studio" : `${bedrooms}-bed`} drawing
                isn&apos;t ready yet — showing {servedLabel} so you can preview the layout.
              </div>
            )}
          </div>

          {/* Plan switcher (bedrooms + roof) */}
          <PlanSwitcher
            bedrooms={bedrooms}
            selection={selection}
            budget={budget}
            plans={plans ?? undefined}
            onChange={updateParams}
          />

          {/* Budget — adjustable here too; gates the switcher above. */}
          <BudgetSlider value={budget} onChange={setBudget} />

          {/* Dimensions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                color: "var(--eh-text-muted)",
              }}
            >
              Dimensions
            </div>
            {plan ? (
              <SliderRow
                label="Width"
                valueMm={widthMm}
                minMm={plan.baseWidth + plan.minDelta}
                maxMm={plan.baseWidth + plan.maxDelta}
                stepMm={610}
                onChange={(mm) => setDelta(mm - plan.baseWidth)}
              />
            ) : (
              <div style={{ fontSize: 13, color: "var(--eh-text-soft)" }}>
                {loading || plans == null ? "Loading…" : error ?? "Plan not available"}
              </div>
            )}
          </div>

          {/* Summary */}
          <SummaryCard
            footprintM2={footprintM2}
            livingM2={livingM2}
            terraceM2={terraceM2}
            mezzanineM2={mezzanineM2}
            budgetUgx={derived.budgetUgx}
          />

          {/* CTAs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: "auto" }}>
            {/* Primary CTA stepped down to the kit's medium size — the
                landing's "Open the configurator" uses the larger 16/36 form
                of .ab-cta; this stays smaller so it doesn't dominate the
                rail. Padding kept ≥12 px vertical so the hit target still
                clears the 44 px iOS touch minimum. */}
            <button
              type="button"
              className="ab-cta"
              onClick={goToSummary}
              style={{ justifyContent: "center", padding: "12px 24px", fontSize: 14 }}
            >
              Continue to summary →
            </button>
            <button
              type="button"
              className="ab-cta"
              onClick={handleReset}
              style={{ background: "transparent", color: "var(--eh-green-900)", border: "1.5px solid var(--eh-green-900)" }}
            >
              Reset to default
            </button>
          </div>
        </div>

        {/* RIGHT — plan canvas */}
        <div
          style={{
            padding: "28px 36px 36px",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            minWidth: 0,
          }}
        >
          {/* Toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 18,
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
              <span className="ab-pill ab-pill-soft">
                {view === "plan" ? "Plan view · 1:50" : "Example images"}
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: "var(--eh-text-muted)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {view === "plan"
                  ? "Use the slider to change width"
                  : "From recent Easy Housing builds"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {plan?.mezzanine && view === "plan" && (
                <div className="seg" role="tablist" aria-label="Mezzanine visibility">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={!showMezzanine}
                    className={!showMezzanine ? "is-active" : ""}
                    onClick={() => setShowMezzanine(false)}
                  >
                    Plan only
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={showMezzanine}
                    className={showMezzanine ? "is-active" : ""}
                    onClick={() => setShowMezzanine(true)}
                  >
                    With mezzanine
                  </button>
                </div>
              )}
              <ViewToggle value={view} onChange={setView} />
            </div>
          </div>

          {/* Canvas card */}
          <div
            style={{
              flex: 1,
              background: "var(--eh-bg)",
              border: "1px solid var(--eh-stroke)",
              borderRadius: 24,
              padding: view === "plan" ? "40px 48px" : 24,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              transition: "padding var(--eh-duration-base) var(--eh-ease)",
            }}
          >
            <div
              key={view}
              className="eh-view-fade-enter eh-view-fade-enter-active"
              style={{ flex: 1, display: "flex", minHeight: 0, minWidth: 0 }}
            >
              {view === "plan" ? (
                plan ? (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 0,
                    }}
                  >
                    <FloorplanSVG plan={plan} delta={delta} showMezzanine={showMezzanine} />
                  </div>
                ) : (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--eh-text-soft)",
                      fontSize: 14,
                    }}
                  >
                    {loading || plans == null ? "Loading floor plan…" : error ?? "No plan loaded"}
                  </div>
                )
              ) : (
                <PhotoCollage typology={selection.typology} subtype={selection.subtype} />
              )}
            </div>
          </div>

          {/* D3 — caveat sits below the canvas, in the muted caption style
              so it informs without alarming. True-scale furniture is a
              pending decision (TODO X4 — decide whether to redraw furniture
              to true scale; remove this caveat once that's done); until
              then this stays. */}
          {view === "plan" && (
            <p
              style={{
                marginTop: 10,
                fontSize: 12,
                lineHeight: 1.45,
                color: "var(--eh-text-soft)",
                fontWeight: 300,
              }}
            >
              Furniture and fixtures are indicative and not shown to exact scale.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConfiguratorPage() {
  return (
    <Suspense fallback={null}>
      <ConfiguratorScreen />
    </Suspense>
  );
}
