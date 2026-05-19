"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { FloorplanJSON } from "@/types/floorplan";
import FloorplanSVG from "@/components/FloorplanSVG";
import EHNavBar from "@/components/configurator/EHNavBar";
import SliderRow from "@/components/configurator/SliderRow";
import SummaryCard from "@/components/configurator/SummaryCard";
import ViewToggle, { type View } from "@/components/configurator/ViewToggle";
import PhotoCollage from "@/components/configurator/PhotoCollage";
import { FLOOR_PLANS, type FloorPlanEntry } from "@/lib/floor-plans";
import { calculateBudget, countRooms, detectTypology } from "@/lib/budget";

const cap = (s: string) => (s.length === 0 ? s : s[0].toUpperCase() + s.slice(1));

function ConfiguratorScreen() {
  const [plan, setPlan] = useState<FloorplanJSON | null>(null);
  const [delta, setDelta] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("plan");
  const [currentEntry] = useState<FloorPlanEntry>(FLOOR_PLANS[0]);

  const searchParams = useSearchParams();
  const roofParam = searchParams.get("roof");
  const bedroomsParam = searchParams.get("bedrooms");
  // budget is preserved from Landing for the eventual round-trip; not displayed here.
  // (Indicative budget on this screen is derived from the resolved plan, not the Landing input.)
  searchParams.get("budget");

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
      return { rooms: null, typology: null, budgetUgx: 0 };
    }
    const rooms = countRooms(plan, delta);
    const typology = detectTypology(plan.name);
    const budgetUgx = calculateBudget(rooms, typology).coreTotal;
    return { rooms, typology, budgetUgx };
  }, [plan, delta]);

  const widthMm = plan ? plan.baseWidth + delta : 0;
  const footprintM2 = derived.rooms ? derived.rooms.gfa + derived.rooms.terraceArea : 0;
  const livingM2 = derived.rooms?.gfa ?? 0;
  const terraceM2 = derived.rooms?.terraceArea ?? 0;

  const detectedRoof =
    derived.typology?.name.toLowerCase().includes("gable")
      ? "gable"
      : derived.typology?.name.toLowerCase().includes("clerestory")
      ? "clerestory"
      : derived.typology?.name.toLowerCase().includes("a frame")
      ? "a-frame"
      : "monopitch";
  const roof = roofParam ?? detectedRoof;
  const hasBedroomsParam = bedroomsParam !== null && bedroomsParam !== "";
  // Default state matches the README §02 example verbatim: "Monopitch · Studio"
  // / "2 bedrooms · Monopitch roof". When ?bedrooms= is supplied, both lines
  // respond to the explicit count.
  const bedrooms = hasBedroomsParam ? Number(bedroomsParam) : 2;
  const modelLabel = hasBedroomsParam
    ? `${cap(roof)} · ${bedrooms === 0 ? "Studio" : `${bedrooms}-bed`}`
    : `${cap(roof)} · Studio`;
  const subtitle = `${bedrooms === 1 ? "1 bedroom" : `${bedrooms} bedrooms`} · ${cap(roof)} roof`;

  const handleReset = () => {
    if (plan) setDelta(plan.minDelta);
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
          />

          {/* CTAs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: "auto" }}>
            {/* TODO(next turn): /summary route is built in the Final/Summary turn — 404s until then */}
            <Link href="/summary" className="ab-cta">
              Continue to summary →
            </Link>
            <button type="button" className="ab-cta ab-cta--ghost" onClick={handleReset}>
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
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 0 }}>
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
