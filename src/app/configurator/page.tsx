"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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
import BedroomsCounter from "@/components/landing/BedroomsCounter";
import BottomSheet from "@/components/mobile/BottomSheet";
import PinchZoomCanvas, { type PinchZoomHandle } from "@/components/mobile/PinchZoomCanvas";
import MobileTopBar from "@/components/mobile/MobileTopBar";
import {
  pickPlan,
  availableBedrooms,
  resolveAvailableBedrooms,
  resolveAvailableSelection,
  type FloorPlanEntry,
} from "@/lib/floor-plans";
import { useFloorPlans } from "@/lib/useFloorPlans";
import { useCountryGuard } from "@/lib/use-active-country";
import { calculateBudget, countRooms, typologyInfoFor } from "@/lib/budget";
import { fmtMoney } from "@/lib/countries";
import { roomDisplayName } from "@/lib/rooms";
import { useIsMobile, usePrefersReducedMotion } from "@/lib/use-media-query";
import {
  depthLabel,
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
  const isMobile = useIsMobile();
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

  if (isMobile) {
    return (
      <MobileConfigurator
        plan={plan}
        delta={delta}
        setDelta={setDelta}
        loading={loading}
        error={error}
        view={view}
        setView={setView}
        showMezzanine={showMezzanine}
        setShowMezzanine={setShowMezzanine}
        modelLabel={modelLabel}
        bedrooms={bedrooms}
        selection={selection}
        budget={budget}
        showFallbackNotice={showFallbackNotice}
        servedLabel={servedLabel}
        roomsBreakdown={derived.rooms}
        budgetUgx={derived.budgetUgx}
        plans={plans}
        onChangeBedrooms={(n) => updateParams({ bedrooms: n })}
        onBack={() => router.push("/")}
        onContinue={goToSummary}
      />
    );
  }

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
            <button
              type="button"
              className="ab-cta"
              onClick={goToSummary}
              style={{ justifyContent: "center" }}
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
                <PhotoCollage typology={selection.typology} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Mobile configurator — Direction A "Immersive sheet".
// Plan canvas is full-bleed inside PinchZoomCanvas; controls live in a
// draggable BottomSheet. URL sync stays in the parent ConfiguratorScreen
// so width/view/plan edits round-trip exactly as on desktop.
// ──────────────────────────────────────────────────────────────────────────

interface MobileConfiguratorProps {
  plan: FloorplanJSON | null;
  delta: number;
  setDelta: (n: number) => void;
  loading: boolean;
  error: string | null;
  view: View;
  setView: (v: View) => void;
  showMezzanine: boolean;
  setShowMezzanine: (b: boolean) => void;
  modelLabel: string;
  bedrooms: number;
  selection: Selection;
  budget: number;
  showFallbackNotice: boolean;
  servedLabel: string | null;
  roomsBreakdown: ReturnType<typeof countRooms> | null;
  budgetUgx: number;
  plans: FloorPlanEntry[] | null;
  onChangeBedrooms: (n: number) => void;
  onBack: () => void;
  onContinue: () => void;
}

// Discover individual room polygons so the schedule can list them with areas.
// We iterate the parsed plan directly rather than relying on countRooms (which
// aggregates) so the design's "Living room · 16.7 m²" layout works.
function listRooms(plan: FloorplanJSON, delta: number) {
  const rows: { name: string; area: number; key: string }[] = [];
  let idx = 0;
  for (const layer of plan.layers) {
    if (!layer.name.startsWith("Rooms")) continue;
    if (layer.name.includes("Mezzanine")) continue; // listed separately
    const display = roomDisplayName(layer.name);
    for (const entity of layer.entities) {
      if (entity.type !== "polyline" || !entity.closed) continue;
      let a = 0;
      for (let i = 0; i < entity.vertices.length; i++) {
        const j = (i + 1) % entity.vertices.length;
        const xi = entity.vertices[i].x + (entity.vertices[i].moveX ? delta : 0);
        const xj = entity.vertices[j].x + (entity.vertices[j].moveX ? delta : 0);
        a += xi * entity.vertices[j].y - xj * entity.vertices[i].y;
      }
      rows.push({ name: display, area: Math.abs(a) / 2 / 1_000_000, key: `${layer.name}-${idx++}` });
    }
  }
  return rows;
}

function MobileConfigurator({
  plan,
  delta,
  setDelta,
  loading,
  error,
  view,
  setView,
  showMezzanine,
  setShowMezzanine,
  modelLabel,
  bedrooms,
  selection,
  budget,
  showFallbackNotice,
  servedLabel,
  roomsBreakdown,
  budgetUgx,
  plans,
  onChangeBedrooms,
  onBack,
  onContinue,
}: MobileConfiguratorProps) {
  const [sheetIndex, setSheetIndex] = useState(0);
  const [detents, setDetents] = useState<number[]>([380, 560, 760]);
  const pinchRef = useRef<PinchZoomHandle | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  // Detent heights are viewport-relative — recompute on resize so the half /
  // full snaps follow rotation, soft keyboard, dynamic toolbars.
  useEffect(() => {
    const compute = () => {
      const h = window.innerHeight;
      // Peek must fit: width row + slider + step helper + bedrooms row +
      // primary CTA. Half/full grow with viewport so the room schedule has
      // room to breathe.
      setDetents([380, Math.round(h * 0.62), Math.round(h * 0.9)]);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  // Poll zoom state from the imperative ref — keeps the top-bar reset button
  // in sync without coupling parent state to the zoom hook.
  useEffect(() => {
    const id = window.setInterval(() => {
      const z = pinchRef.current?.isZoomed() ?? false;
      setIsZoomed((prev) => (prev === z ? prev : z));
    }, 120);
    return () => window.clearInterval(id);
  }, []);

  const widthMm = plan ? plan.baseWidth + delta : 0;
  const minMm = plan ? plan.baseWidth + plan.minDelta : 0;
  const maxMm = plan ? plan.baseWidth + plan.maxDelta : 0;
  const steps = plan ? Math.round((delta - plan.minDelta) / 610) : 0;
  const stepsMax = plan ? Math.round((plan.maxDelta - plan.minDelta) / 610) : 0;
  const depth = depthLabel(selection) || "";
  const bedroomOptions = plans
    ? Array.from(new Set(availableBedrooms(plans, selection).concat([bedrooms]))).sort(
        (a, b) => a - b,
      )
    : [bedrooms];

  const subtitle =
    `${bedrooms === 0 ? "Studio" : `${bedrooms} bed`}${depth ? ` · ${depth} deep` : ""}`;

  const rooms = plan ? listRooms(plan, delta) : [];
  const livingTotal = roomsBreakdown
    ? roomsBreakdown.gfa + roomsBreakdown.terraceArea
    : 0;

  return (
    <div className="eh-configurator-mobile">
      <MobileTopBar
        title={modelLabel}
        subtitle={subtitle}
        onBack={onBack}
        showResetZoom={isZoomed}
        onResetZoom={() => pinchRef.current?.reset()}
      />

      <div className="eh-configurator-mobile__canvas">
        <PinchZoomCanvas ref={pinchRef} disabled={reducedMotion}>
          {view === "plan" ? (
            plan ? (
              <FloorplanSVG plan={plan} delta={delta} showMezzanine={showMezzanine} />
            ) : (
              <div style={{ color: "var(--eh-text-soft)", fontSize: 14, textAlign: "center", padding: 16 }}>
                {loading || plans == null ? "Loading floor plan…" : error ?? "No plan loaded"}
              </div>
            )
          ) : (
            <div style={{ width: "100%", height: "100%" }}>
              <PhotoCollage typology={selection.typology} />
            </div>
          )}
        </PinchZoomCanvas>
      </div>

      {showFallbackNotice && servedLabel && (
        <div className="eh-configurator-mobile__notice" role="status">
          Closest plan — showing {servedLabel}
        </div>
      )}

      <BottomSheet
        detents={detents}
        index={sheetIndex}
        onIndexChange={setSheetIndex}
        ariaLabel="Adjust configurator panel"
      >
        {/* PEEK — always visible */}
        <div className="eh-configurator-mobile__peek-row">
          <div className="eh-configurator-mobile__peek-block">
            <span className="eh-configurator-mobile__peek-label">Width</span>
            <span className="eh-configurator-mobile__peek-value">
              {plan ? (widthMm / 1000).toFixed(2) : "—"}
              <span className="eh-configurator-mobile__peek-unit">m</span>
            </span>
          </div>
          <div className="eh-configurator-mobile__peek-block" style={{ textAlign: "right" }}>
            <span className="eh-configurator-mobile__peek-label">Indicative budget</span>
            <span className="eh-configurator-mobile__peek-budget">
              {fmtMoney(Math.round(budgetUgx))}
            </span>
          </div>
        </div>

        {plan ? (
          <SliderRow
            label=""
            valueMm={widthMm}
            minMm={minMm}
            maxMm={maxMm}
            stepMm={610}
            onChange={(mm) => setDelta(mm - plan.baseWidth)}
          />
        ) : (
          <div style={{ fontSize: 13, color: "var(--eh-text-soft)" }}>
            {loading || plans == null ? "Loading…" : error ?? "Plan not available"}
          </div>
        )}
        <div className="eh-configurator-mobile__step-helper">
          {plan ? `${steps} of ${stepsMax} steps · 610 mm each` : " "}
        </div>

        {/* Bedrooms sits right under width — the two dimensional choices live
            together so the user doesn't hunt for the counter at the bottom. */}
        <div className="eh-configurator-mobile__bedrooms-row">
          <BedroomsCounter
            value={bedrooms}
            onChange={onChangeBedrooms}
            options={bedroomOptions}
          />
        </div>

        <button
          type="button"
          className="ab-cta"
          onClick={onContinue}
          style={{ justifyContent: "center", width: "100%" }}
        >
          Continue to summary →
        </button>

        {/* HALF — view toggle, mezzanine toggle, room schedule */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <ViewToggle value={view} onChange={setView} />
        </div>

        {plan?.mezzanine && view === "plan" && (
          <div style={{ display: "flex", justifyContent: "center" }}>
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
          </div>
        )}

        {rooms.length > 0 && (
          <div className="eh-configurator-mobile__rooms">
            <div className="eh-configurator-mobile__rooms-head">
              <div className="eh-configurator-mobile__rooms-title">Rooms</div>
              <div className="eh-configurator-mobile__rooms-total">
                {livingTotal.toFixed(1)} m² total
              </div>
            </div>
            {rooms.map((r) => (
              <div className="eh-configurator-mobile__room-row" key={r.key}>
                <span className="eh-configurator-mobile__room-name">
                  <span className="eh-configurator-mobile__room-dot" />
                  {r.name}
                </span>
                <span className="eh-configurator-mobile__room-area">
                  {r.area.toFixed(1)} m²
                </span>
              </div>
            ))}
            {roomsBreakdown && roomsBreakdown.mezzanineAreaM2 > 0 && (
              <div className="eh-configurator-mobile__room-row">
                <span className="eh-configurator-mobile__room-name">
                  <span className="eh-configurator-mobile__room-dot" style={{ background: "var(--eh-green)" }} />
                  Mezzanine
                </span>
                <span className="eh-configurator-mobile__room-area">
                  {roomsBreakdown.mezzanineAreaM2.toFixed(1)} m²
                </span>
              </div>
            )}
          </div>
        )}

      </BottomSheet>
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
