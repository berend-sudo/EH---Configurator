"use client";

import { useRef, useState } from "react";
import type { AIDetectedPlan } from "@/lib/admin/aiDetection";
import type { BackgroundImage } from "@/lib/admin/editorState";

interface Props {
  onComplete: (result: {
    background: BackgroundImage;
    detected: AIDetectedPlan;
  }) => void;
}

/** Step 1 — upload a PNG and call the vision API. */
export function UploadStep({ onComplete }: Props) {
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawJson, setRawJson] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setRawJson(null);
    setDetecting(true);
    try {
      // Read the file once as a data URL (for thumbnail + background)
      // and then as base64 (to send to the API).
      const dataUrl = await readAsDataUrl(file);
      const { base64, mediaType } = splitDataUrl(dataUrl);
      const { widthPx, heightPx } = await readImageDims(dataUrl);

      const resp = await fetch("/api/floorplans/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        throw new Error(json.error ?? `detect failed (${resp.status})`);
      }
      setRawJson(JSON.stringify(json.detected, null, 2));
      const bg: BackgroundImage = {
        url: URL.createObjectURL(file),
        dataUrl,
        widthPx,
        heightPx,
      };
      onComplete({ background: bg, detected: json.detected as AIDetectedPlan });
    } catch (err) {
      setError(err instanceof Error ? err.message : "detection failed");
    } finally {
      setDetecting(false);
    }
  }

  return (
    <div className="space-y-4 rounded-md border border-eh-sage p-6">
      <div>
        <h2 className="text-lg font-semibold text-eh-forest">
          Step 1 — Upload a floor plan PNG
        </h2>
        <p className="text-sm text-eh-charcoal/70">
          The image is sent to Claude Sonnet 4 vision, which returns a first
          draft of walls, rooms, furniture, doors, windows and building
          dimensions. You'll correct the scale in the next step and refine
          everything by hand afterwards.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <button
          className="rounded bg-eh-forest px-3 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
          disabled={detecting}
          onClick={() => inputRef.current?.click()}
        >
          {detecting ? "Analysing with Claude…" : "Choose PNG"}
        </button>
        {detecting && (
          <span className="text-xs text-eh-charcoal/60">
            This typically takes 10–30 s.
          </span>
        )}
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-2 text-xs text-red-800">
          {error}
        </div>
      )}

      {rawJson && (
        <details className="rounded border border-eh-sage p-2">
          <summary className="cursor-pointer text-xs text-eh-charcoal/70">
            Raw AI output
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto text-[10px]">{rawJson}</pre>
        </details>
      )}
    </div>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function splitDataUrl(dataUrl: string): { base64: string; mediaType: string } {
  const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
  if (!match) throw new Error("Could not parse uploaded file.");
  return { mediaType: match[1], base64: match[2] };
}

function readImageDims(src: string): Promise<{ widthPx: number; heightPx: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ widthPx: img.naturalWidth, heightPx: img.naturalHeight });
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}
