"use client";

import { useState, useEffect, useRef } from "react";
import type { FloorplanJSON } from "@/types/floorplan";
import FloorplanSVG from "@/components/FloorplanSVG";
import { FLOOR_PLANS, type FloorPlanEntry } from "@/lib/floor-plans";

export default function Home() {
  const [plan, setPlan] = useState<FloorplanJSON | null>(null);
  const [delta, setDelta] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEntry, setCurrentEntry] = useState<FloorPlanEntry>(FLOOR_PLANS[0]);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadFloorPlan = async (entry: FloorPlanEntry) => {
    setLoading(true);
    setError(null);
    setMenuOpen(false);
    try {
      const res = await fetch(`/api/parse-dxf?file=${encodeURIComponent(entry.file)}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Load failed");
      }
      const json: FloorplanJSON = await res.json();
      setPlan(json);
      setDelta(json.minDelta);
      setCurrentEntry(entry);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFloorPlan(FLOOR_PLANS[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const widthMm = plan ? plan.baseWidth + delta : 0;
  const widthM = (widthMm / 1000).toFixed(2);

  return (
    <main className="min-h-screen bg-stone-50 font-sans">
      <header className="border-b border-stone-200 bg-white px-8 py-4 flex items-center gap-4">
        <h1 className="text-lg font-semibold tracking-tight text-stone-800">EH Configurator</h1>

        {/* Floor plan selector */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900 border border-stone-200 hover:border-stone-300 rounded-lg px-3 py-1.5 bg-white transition-colors"
          >
            {currentEntry.name}
            <svg
              className={`w-3.5 h-3.5 transition-transform ${menuOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute left-0 top-full mt-1 z-10 bg-white border border-stone-200 rounded-lg shadow-md min-w-[200px] py-1">
              {FLOOR_PLANS.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => loadFloorPlan(entry)}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    entry.id === currentEntry.id
                      ? "text-stone-900 bg-stone-100 font-medium"
                      : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                  }`}
                >
                  {entry.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-col items-center gap-6 p-8">
        {loading && (
          <div className="text-stone-500 text-sm">Loading floor plan…</div>
        )}

        {error && (
          <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-4 py-2">
            {error}
          </div>
        )}

        {plan && (
          <div className="w-full max-w-5xl flex flex-col gap-6">
            {/* Controls */}
            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-stone-700">Width</label>
                <span className="text-sm font-mono text-stone-800 bg-stone-100 px-2 py-0.5 rounded">
                  {widthM} m
                </span>
              </div>
              <input
                type="range"
                min={plan.minDelta}
                max={plan.maxDelta}
                step={610}
                value={delta}
                onChange={(e) => setDelta(Number(e.target.value))}
                className="w-full accent-stone-700"
              />
              <div className="flex justify-between text-xs text-stone-400 mt-1">
                <span>{((plan.baseWidth + plan.minDelta) / 1000).toFixed(1)} m</span>
                <span>{((plan.baseWidth + plan.maxDelta) / 1000).toFixed(1)} m</span>
              </div>
            </div>

            {/* Floor plan */}
            <FloorplanSVG plan={plan} delta={delta} />
          </div>
        )}
      </div>
    </main>
  );
}
