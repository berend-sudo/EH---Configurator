"use client";

import { useState, useCallback, useRef } from "react";
import type { FloorplanJSON } from "@/types/floorplan";
import FloorplanSVG from "@/components/FloorplanSVG";

export default function Home() {
  const [plan, setPlan] = useState<FloorplanJSON | null>(null);
  const [delta, setDelta] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".dxf")) {
      setError("Please upload a .dxf file");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/parse-dxf", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Parse failed");
      }
      const json: FloorplanJSON = await res.json();
      setPlan(json);
      setDelta(json.minDelta);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const widthMm = plan ? plan.baseWidth + delta : 0;
  const widthM = (widthMm / 1000).toFixed(2);

  return (
    <main className="min-h-screen bg-stone-50 font-sans">
      <header className="border-b border-stone-200 bg-white px-8 py-4 flex items-center gap-4">
        <h1 className="text-lg font-semibold tracking-tight text-stone-800">EH Configurator</h1>
        {plan && (
          <span className="text-sm text-stone-500">{plan.name}</span>
        )}
      </header>

      <div className="flex flex-col items-center gap-6 p-8">
        {/* Upload zone */}
        {!plan && (
          <div
            className={`w-full max-w-xl border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
              dragging ? "border-stone-500 bg-stone-100" : "border-stone-300 hover:border-stone-400"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".dxf"
              className="hidden"
              onChange={onFileChange}
            />
            <div className="text-4xl mb-3 text-stone-300">⬆</div>
            <p className="text-stone-600 font-medium">Drop a DXF file here</p>
            <p className="text-stone-400 text-sm mt-1">or click to browse</p>
            <p className="text-stone-400 text-xs mt-3">
              Expects layers: Walls, Rooms, Doors, Windows, Furniture,<br />
              PT Rechtsboven, PT Linksboven
            </p>
          </div>
        )}

        {loading && (
          <div className="text-stone-500 text-sm">Parsing DXF…</div>
        )}

        {error && (
          <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-4 py-2">
            {error}
          </div>
        )}

        {/* Configurator */}
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
                step={50}
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

            {/* Upload another */}
            <div className="flex gap-3">
              <button
                onClick={() => { setPlan(null); setDelta(0); }}
                className="text-sm text-stone-500 hover:text-stone-700 underline underline-offset-2"
              >
                Upload another DXF
              </button>
              <a
                href={`data:application/json,${encodeURIComponent(JSON.stringify(plan, null, 2))}`}
                download={`${plan.id}.json`}
                className="text-sm text-stone-500 hover:text-stone-700 underline underline-offset-2"
              >
                Download JSON
              </a>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
