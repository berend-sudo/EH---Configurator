"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface State {
  scale: number;
  tx: number;
  ty: number;
}

interface Options {
  minScale?: number;
  maxScale?: number;
  doubleTapScale?: number;
}

interface Result {
  state: State;
  isZoomed: boolean;
  reset: () => void;
  /** Attach to the wrapper that should capture pointer/touch events. */
  bind: {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
  };
  /** Imperative ref to attach to the frame whose bounding box clamps panning. */
  frameRef: React.MutableRefObject<HTMLDivElement | null>;
}

// Lightweight pinch / pan / double-tap zoom over the floor plan canvas. Pointer
// Events are used so it also works with a mouse during dev. Pan is clamped to
// the frame so the plan can't leave the visible area.
export function usePinchZoom({
  minScale = 1,
  maxScale = 4,
  doubleTapScale = 2.2,
}: Options = {}): Result {
  const [state, setState] = useState<State>({ scale: 1, tx: 0, ty: 0 });
  const stateRef = useRef(state);
  stateRef.current = state;

  const frameRef = useRef<HTMLDivElement | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ startDist: number; startScale: number; center: { x: number; y: number } } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; startTx: number; startTy: number } | null>(null);
  const lastTapRef = useRef<{ t: number; x: number; y: number } | null>(null);

  const clamp = useCallback((next: State): State => {
    const frame = frameRef.current;
    if (!frame || next.scale <= 1) return { scale: next.scale, tx: 0, ty: 0 };
    const w = frame.clientWidth;
    const h = frame.clientHeight;
    const maxTx = (w * (next.scale - 1)) / 2;
    const maxTy = (h * (next.scale - 1)) / 2;
    return {
      scale: next.scale,
      tx: Math.max(-maxTx, Math.min(maxTx, next.tx)),
      ty: Math.max(-maxTy, Math.min(maxTy, next.ty)),
    };
  }, []);

  const reset = useCallback(() => {
    setState({ scale: 1, tx: 0, ty: 0 });
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const pts = Array.from(pointersRef.current.values());
    if (pts.length === 1) {
      const now = Date.now();
      const last = lastTapRef.current;
      if (last && now - last.t < 300 && Math.hypot(last.x - pts[0].x, last.y - pts[0].y) < 30) {
        // Double-tap toggles between 1 and doubleTapScale.
        const current = stateRef.current;
        const next: State =
          current.scale > 1.05
            ? { scale: 1, tx: 0, ty: 0 }
            : clamp({ scale: doubleTapScale, tx: 0, ty: 0 });
        setState(next);
        lastTapRef.current = null;
      } else {
        lastTapRef.current = { t: now, x: pts[0].x, y: pts[0].y };
      }
      const current = stateRef.current;
      panRef.current = {
        startX: pts[0].x,
        startY: pts[0].y,
        startTx: current.tx,
        startTy: current.ty,
      };
    } else if (pts.length === 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchRef.current = {
        startDist: dist,
        startScale: stateRef.current.scale,
        center: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
      };
      panRef.current = null;
    }
  }, [clamp, doubleTapScale]);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!pointersRef.current.has(e.pointerId)) return;
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = Array.from(pointersRef.current.values());
      if (pts.length === 2 && pinchRef.current) {
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const nextScale = Math.max(
          minScale,
          Math.min(maxScale, pinchRef.current.startScale * (dist / pinchRef.current.startDist)),
        );
        setState((s) => clamp({ ...s, scale: nextScale }));
      } else if (pts.length === 1 && panRef.current && stateRef.current.scale > 1) {
        const dx = pts[0].x - panRef.current.startX;
        const dy = pts[0].y - panRef.current.startY;
        setState(
          clamp({
            scale: stateRef.current.scale,
            tx: panRef.current.startTx + dx,
            ty: panRef.current.startTy + dy,
          }),
        );
      }
    },
    [clamp, minScale, maxScale],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) panRef.current = null;
  }, []);

  // Block native page pinch-zoom inside the frame so two-finger gestures map to
  // the canvas zoom rather than the browser's. touch-action: none on the frame
  // is the cleanest declarative way; we still register a non-passive
  // touchmove handler so the browser doesn't try to scroll while we drag.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const handler = (e: TouchEvent) => {
      if (e.touches.length >= 2) e.preventDefault();
    };
    frame.addEventListener("touchmove", handler, { passive: false });
    return () => frame.removeEventListener("touchmove", handler);
  }, []);

  return {
    state,
    isZoomed: state.scale > 1.02,
    reset,
    bind: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
    frameRef,
  };
}
