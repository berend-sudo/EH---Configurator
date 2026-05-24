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
import { pickPlan, type FloorPlanEntry } from "@/lib/floor-plans";
import { calculateBudget, countRooms, typologyInfoFor } from "@/lib/budget";
import {
  dxfFilename,
  selectionFromParams,
  selectionLabel,
  type Selection,
} from "@/lib/typologies";

const LANDING_DEFAULT_BUDGET = 75_000_000;

function ConfiguratorScreen() {
  const [plan, setPlan] = useState<FloorplanJSON | null>(null);
  const [delta, setDelta] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("plan");

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const typologyParam = searchParams.get("typology");
  const subtypeParam = searchParams.get("subtype");
  const bedroomsParam = searchParams.get("bedrooms");
  const budgetParam = searchParams.get("budget");
  const versionParam = searchParams.get("v");
  const version = (() => {
    const n = versionParam != null ? Number(versionParam) : NaN;
    return Number.isInteger(n) && n > 0 ? n : 1;
  })();
  const selection: Selection = useMemo(
    () => selectionFromParams(typologyParam, subtypeParam),
    [typologyParam, subtypeParam],
  );
  const bedroomsNum = bedroomsParam != null && bedroomsParam !== "" ? Number(bedroomsParam) : null;
  const currentEntry: FloorPlanEntry = useMemo(
    () => pickPlan(selection, bedroomsNum),
    [selection, bedroomsNum],
  );
  const budget = (() => {
    const n = budgetParam != null ? Number(budgetParam) : NaN;
    return Number.isFinite(n) && n > 0 ? n : LANDING_DEFAULT_BUDGET;
  })();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/parse-dxf?file=${encodeURIComponent(currentEntry.file)}`
        );
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
  }, [currentEntry]);

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

  const bedrooms = currentEntry.bedrooms;
  const roofLabel = selectionLabel(selection);
  const modelLabel = `${roofLabel} · ${bedrooms === 0 ? "Studio" : `${bedrooms}-bed`}`;
  const subtitle = `${bedrooms === 0 ? "Studio" : bedrooms === 1 ? "1 bedroom" : `${bedrooms} bedrooms`} · ${roofLabel} roof`;
  const dxfName = dxfFilename(selection, bedrooms, version);

  const handleReset = () => {
    if (plan) setDelta(plan.minDelta);
  };

  const updateParams = (next: { bedrooms?: number; selection?: Selection }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.bedrooms != null) params.set("bedrooms", String(next.bedrooms));
    if (next.selection) {
      params.set("typology", next.selection.typology);
      if (next.selection.subtype) params.set("subtype", next.selection.subtype);
      else params.delete("subtype");
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

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
      <EHNavBar step={2} totalSteps={3} />

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
          </div>

          {/* Plan switcher (bedrooms + roof) */}
          <PlanSwitcher
            bedrooms={bedrooms}
            selection={selection}
            budget={budget}
            onChange={updateParams}
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
                {loading ? "Loading…" : error ?? "Plan not available"}
              </div>
            )}
          </div>

          {/* Summary */}
          <SummaryCard
            footprintM2={footprintM2}
            livingM2={livingM2}
            terraceM2={terraceM2}
            budgetUgx={derived.budgetUgx}
            dxfName={dxfName}
          />

          {/* CTAs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: "auto" }}>
            {/* /summary route doesn't exist yet — disabled placeholder. */}
            <button
              type="button"
              className="ab-cta"
              disabled
              aria-disabled
              title="Coming soon"
              style={{ opacity: 0.55, cursor: "not-allowed" }}
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
            <ViewToggle value={view} onChange={setView} />
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
                    <FloorplanSVG plan={plan} delta={delta} />
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
                    {loading ? "Loading floor plan…" : error ?? "No plan loaded"}
                  </div>
                )
              ) : (
                <PhotoCollage />
              )}
            </div>
          </div>
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
