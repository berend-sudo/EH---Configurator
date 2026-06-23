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
import MobileSliderRow from "@/components/mobile/MobileSliderRow";
import MobileBudgetSlider from "@/components/mobile/MobileBudgetSlider";
import TypologyPicker from "@/components/landing/TypologyPicker";
import BudgetReach from "@/components/BudgetReach";
import {
  pickPlan,
  availableBedrooms,
  resolveAvailableBedrooms,
  resolveAvailableSelection,
  type FloorPlanEntry,
} from "@/lib/floor-plans";
import { useFloorPlans } from "@/lib/useFloorPlans";
import { useCountryGuard } from "@/lib/use-active-country";
import { calculateBudget, countRooms } from "@/lib/budget";
import { fmtLocal } from "@/lib/countries";
import { roomDisplayName } from "@/lib/rooms";
import { useIsMobile, useMediaQuery, usePrefersReducedMotion } from "@/lib/use-media-query";
import { FURNITURE_CAVEAT } from "@/lib/configurator-submit";
import {
  depthLabel,
  minBedroomsFor,
  selectionFromParams,
  selectionLabel,
  type Selection,
} from "@/lib/typologies";
import {
  budgetBounds,
  maxAffordableBedrooms,
  priceForSelection,
  resolveAffordableSelection,
  type Currency,
  type PriceIndex,
} from "@/lib/affordability";

function ConfiguratorScreen({
  initialPlans,
  priceIndex,
}: {
  initialPlans: FloorPlanEntry[];
  priceIndex: PriceIndex;
}) {
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
  const plans = useFloorPlans(initialPlans);
  const currentEntry: FloorPlanEntry | null = useMemo(
    () => (plans ? pickPlan(plans, selection, requestedBedrooms) : null),
    [plans, selection, requestedBedrooms],
  );
  const planFile = currentEntry?.file ?? null;
  // Budget is local state (source of truth for gating + the slider) so dragging
  // stays smooth; it's seeded from ?budget= (NATIVE currency) and synced back to
  // the URL below. When absent we default to the top of the catalog range, so
  // nothing is greyed out until the user lowers it.
  const currency = (country?.currency.code ?? "UGX") as Currency;
  const budgetStep = country?.currency.displayRound ?? 100_000;
  const bounds = budgetBounds(priceIndex, currency);
  const sliderMin = Math.floor(bounds.min / budgetStep) * budgetStep;
  const sliderMax = Math.ceil(bounds.max / budgetStep) * budgetStep;
  const [budget, setBudget] = useState<number | null>(() => {
    const n = budgetParam != null ? Number(budgetParam) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  });
  const budgetValue = budget ?? sliderMax;

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
    if (!plan || !country) {
      return { rooms: null, budgetLocal: 0 };
    }
    const rooms = countRooms(plan, delta);
    const budgetLocal = calculateBudget(rooms, selection, country).total;
    return { rooms, budgetLocal };
  }, [plan, delta, selection, country]);

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
    params.set("budget", String(budgetValue));
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
      if ((params.get("budget") ?? "") !== String(budgetValue)) {
        params.set("budget", String(budgetValue));
        router.replace(`${pathname}?${params.toString()}`);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [budgetValue, searchParams, pathname, router]);

  // When the budget drops below the current selection/bedroom cost, move to the
  // cheapest still-affordable + available option (mirrors the landing screen).
  useEffect(() => {
    if (!plans) return;
    if (priceForSelection(priceIndex, currency, selection, requestedBedrooms) <= budgetValue) return;
    const affordable = resolveAffordableSelection(priceIndex, currency, budgetValue, selection);
    const reachable = resolveAvailableSelection(plans, affordable) ?? affordable;
    const maxBr = maxAffordableBedrooms(priceIndex, currency, budgetValue, reachable, requestedBedrooms);
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
  }, [priceIndex, currency, budgetValue, selection, requestedBedrooms, plans]);

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
        budget={budgetValue}
        budgetMin={sliderMin}
        budgetMax={sliderMax}
        budgetStep={budgetStep}
        priceIndex={priceIndex}
        currency={currency}
        showFallbackNotice={showFallbackNotice}
        servedLabel={servedLabel}
        roomsBreakdown={derived.rooms}
        budgetLocal={derived.budgetLocal}
        plans={plans}
        onChangeBedrooms={(n) => updateParams({ bedrooms: n })}
        onChangeSelection={(s) => updateParams({ selection: s })}
        onChangeBudget={setBudget}
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
          gridTemplateColumns: "minmax(300px, 380px) 1fr",
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
            budget={budgetValue}
            plans={plans ?? undefined}
            priceIndex={priceIndex}
            currency={currency}
            onChange={updateParams}
          />

          {/* Budget — adjustable here too; gates the switcher above. */}
          <BudgetSlider
            value={budgetValue}
            onChange={setBudget}
            min={sliderMin}
            max={sliderMax}
            step={budgetStep}
          />
          <BudgetReach
            priceIndex={priceIndex}
            currency={currency}
            budget={budgetValue}
            selection={selection}
          />

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
            budgetLocal={derived.budgetLocal}
          />

          {/* CTAs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: "auto" }}>
            {/* Primary CTA stepped down to the kit's medium size — the
                landing's "Open the configurator" uses the larger 16/36 form
                of .ab-cta; this stays smaller so it doesn't dominate the
                rail. Padding kept ≥12 px vertical so the hit target still
                clears the 44 px iOS touch minimum. */}
            {/* Both CTAs stay at the kit's medium size with matching
                padding / font / border so they read as a balanced pair.
                The 1.5 px transparent border on the primary keeps its
                box height identical to the secondary's outlined version
                — without it the bordered button reads 3 px taller. */}
            <button
              type="button"
              className="ab-cta"
              onClick={goToSummary}
              style={{
                justifyContent: "center",
                padding: "12px 24px",
                fontSize: 14,
                border: "1.5px solid transparent",
              }}
            >
              Continue to summary →
            </button>
            <button
              type="button"
              className="ab-cta"
              onClick={handleReset}
              style={{
                justifyContent: "center",
                padding: "12px 24px",
                fontSize: 14,
                background: "transparent",
                color: "var(--eh-green-900)",
                border: "1.5px solid var(--eh-green-900)",
              }}
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
                <PhotoCollage typology={selection.typology} subtype={selection.subtype} bedrooms={bedrooms} />
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
              {FURNITURE_CAVEAT}
            </p>
          )}
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
  budgetMin: number;
  budgetMax: number;
  budgetStep: number;
  priceIndex: PriceIndex;
  currency: Currency;
  showFallbackNotice: boolean;
  servedLabel: string | null;
  roomsBreakdown: ReturnType<typeof countRooms> | null;
  budgetLocal: number;
  plans: FloorPlanEntry[] | null;
  onChangeBedrooms: (n: number) => void;
  onChangeSelection: (s: Selection) => void;
  onChangeBudget: (n: number) => void;
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
  budgetMin,
  budgetMax,
  budgetStep,
  priceIndex,
  currency,
  showFallbackNotice,
  servedLabel,
  roomsBreakdown,
  budgetLocal,
  plans,
  onChangeBedrooms,
  onChangeSelection,
  onChangeBudget,
  onBack,
  onContinue,
}: MobileConfiguratorProps) {
  // Sheet starts HALF-OPEN (index 1). With the view toggle now in the
  // top bar (next to the title), the slider/CTA menu is the only thing
  // left for the sheet, and Kim asked for it to sit "somewhere half
  // the screen" by default rather than being hidden behind a peek the
  // user has to discover. Two detents:
  //   0 — closed peek: just the grab handle (transparent bar) and a
  //       sliver of the white content card; drag down to see the full
  //       floor plan.
  //   1 — half-open: ~50 % of the viewport so the slider / typology /
  //       Continue button are all reachable with the plan still
  //       visible above.
  const [sheetIndex, setSheetIndex] = useState(1);
  const [detents, setDetents] = useState<number[]>([96, 360]);
  // Live sheet height — the canvas pins its bottom to this so the plan
  // fills exactly the band above the sheet (no dead gap, no overlap).
  // Seeded with the half-open detent so first paint is already correct.
  const [sheetHeight, setSheetHeight] = useState(360);
  const pinchRef = useRef<PinchZoomHandle | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  // Below ~340px the two-up typology grid leaves chips too cramped to read,
  // so drop to a single column on the narrowest (older) phones.
  const isTiny = useMediaQuery("(max-width: 340px)");

  // Detent heights are viewport-relative — recompute on resize so the
  // half-open snap follows rotation, soft keyboard, dynamic toolbars.
  useEffect(() => {
    const compute = () => {
      const h = window.innerHeight;
      // Closed peek is just the handle + a thin lip of the white card
      // (96 px) since the white background no longer sits behind the
      // grab handle — the handle floats over the plan.
      setDetents([96, Math.round(h * 0.5)]);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  const widthMm = plan ? plan.baseWidth + delta : 0;
  const minMm = plan ? plan.baseWidth + plan.minDelta : 0;
  const maxMm = plan ? plan.baseWidth + plan.maxDelta : 0;
  const steps = plan ? Math.round((delta - plan.minDelta) / 610) : 0;
  const stepsMax = plan ? Math.round((plan.maxDelta - plan.minDelta) / 610) : 0;
  const depth = depthLabel(selection) || "";
  // Bedroom options = what's on disk for this selection, capped by what the
  // current budget affords — mirrors the landing so the counter's "max N for
  // this budget" hint and the greyed-out + button track the budget slider
  // live. Falls back to the full available set if nothing is affordable yet.
  const bedroomOptions = (() => {
    if (!plans) return [bedrooms];
    const availBR = availableBedrooms(plans, selection);
    const affordableMax = maxAffordableBedrooms(priceIndex, currency, budget, selection, bedrooms);
    const affordableBR = availBR.filter((b) => b <= affordableMax);
    return affordableBR.length > 0 ? affordableBR : availBR;
  })();

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
        // Plan / Example-images toggle now lives in the top bar's right
        // slot, next to the title pill, instead of floating below.
        // Double-tap on the canvas still resets pinch-zoom, so the
        // dedicated reset-zoom button isn't needed here.
        right={<ViewToggle value={view} onChange={setView} />}
      />

      <div
        className="eh-configurator-mobile__canvas"
        // Pin the canvas bottom to the sheet's live top edge so the plan
        // centres in the visible band rather than in the full screen
        // height (which left a big empty gap above it). Tracks drags.
        style={{ bottom: sheetHeight }}
      >
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
            <div style={{ width: "100%", height: "100%", display: "flex" }}>
              {/* display:flex gives PhotoCollage's `flex:1` a flex parent so
                  the grid resolves a real height — without it the collage
                  collapses to 0 and the fill images never show. */}
              <PhotoCollage typology={selection.typology} subtype={selection.subtype} bedrooms={bedrooms} />
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
        onHeightChange={setSheetHeight}
        ariaLabel="Adjust configurator panel"
      >
        {/* PEEK — always visible. Single inline summary instead of two
            floating uppercase eyebrow labels, so the menu top doesn't
            read as a separate "headings" section above the slider. */}
        <div className="eh-configurator-mobile__peek-row">
          <span className="eh-configurator-mobile__peek-stat">
            <strong>{plan ? (widthMm / 1000).toFixed(2) : "—"} m</strong> wide
          </span>
          <span className="eh-configurator-mobile__peek-divider" aria-hidden>·</span>
          <span className="eh-configurator-mobile__peek-stat">
            <strong>{fmtLocal(Math.round(budgetLocal))}</strong> indicative
          </span>
        </div>

        {plan ? (
          <MobileSliderRow
            valueMm={widthMm}
            minMm={minMm}
            maxMm={maxMm}
            stepMm={610}
            onChange={(mm) => setDelta(mm - plan.baseWidth)}
            helper={`${steps} of ${stepsMax} steps · 610 mm each`}
          />
        ) : (
          <div style={{ fontSize: 13, color: "var(--eh-text-soft)" }}>
            {loading || plans == null ? "Loading…" : error ?? "Plan not available"}
          </div>
        )}

        {/* D3 — same furniture-scale caveat as the desktop rail. Mobile
            hides the canvas behind the bottom sheet, so the caveat sits
            with the dimensional controls instead of next to the drawing.
            TODO(X4): drop once furniture is redrawn to true scale. */}
        {view === "plan" && (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              lineHeight: 1.45,
              color: "var(--eh-text-soft)",
              fontWeight: 300,
            }}
          >
            {FURNITURE_CAVEAT}
          </p>
        )}

        {/* Bedrooms sits right under width — the two dimensional choices live
            together so the user doesn't hunt for the counter at the bottom. */}
        <div className="eh-configurator-mobile__bedrooms-row">
          <BedroomsCounter
            value={bedrooms}
            onChange={onChangeBedrooms}
            options={bedroomOptions}
          />
        </div>

        {/* Budget + roof live in the peek too so the user can re-shape the
            design without going back to the landing. */}
        <MobileBudgetSlider
          value={budget}
          onChange={onChangeBudget}
          min={budgetMin}
          max={budgetMax}
          step={budgetStep}
        />
        <BudgetReach
          priceIndex={priceIndex}
          currency={currency}
          budget={budget}
          selection={selection}
        />

        <div className="eh-configurator-mobile__typology-wrap">
          <TypologyPicker
            selection={selection}
            onChange={onChangeSelection}
            budget={budget}
            priceIndex={priceIndex}
            currency={currency}
            plans={plans ?? undefined}
            compact
            columns={isTiny ? 1 : 2}
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

        {/* HALF — mezzanine toggle, room schedule. View toggle now lives
            above the canvas (see header), not in the sheet. */}
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
                  <span className="eh-configurator-mobile__room-label">{r.name}</span>
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
                  <span className="eh-configurator-mobile__room-label">Mezzanine</span>
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

export default function ConfiguratorClient({
  initialPlans,
  priceIndex,
}: {
  initialPlans: FloorPlanEntry[];
  priceIndex: PriceIndex;
}) {
  return (
    <Suspense fallback={null}>
      <ConfiguratorScreen initialPlans={initialPlans} priceIndex={priceIndex} />
    </Suspense>
  );
}
