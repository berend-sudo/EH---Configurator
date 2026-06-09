"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { usePrefersReducedMotion } from "@/lib/use-media-query";

interface Props {
  /** Visible heights in px, ascending — e.g. [232, viewport * 0.52, viewport * 0.86]. */
  detents: number[];
  index: number;
  onIndexChange: (i: number) => void;
  children: ReactNode;
  ariaLabel?: string;
}

export interface BottomSheetHandle {
  setIndex: (i: number) => void;
}

// Flick threshold above which we always bump a detent regardless of distance.
const FLICK_VELOCITY = 0.6; // px / ms

const BottomSheet = forwardRef<BottomSheetHandle, Props>(function BottomSheet(
  { detents, index, onIndexChange, children, ariaLabel = "Adjust panel height" },
  ref,
) {
  const reducedMotion = usePrefersReducedMotion();
  const [dragDelta, setDragDelta] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    startY: number;
    lastY: number;
    lastT: number;
    velocity: number;
    pointerId: number;
  } | null>(null);

  useImperativeHandle(ref, () => ({ setIndex: onIndexChange }), [onIndexChange]);

  const safeIndex = Math.max(0, Math.min(detents.length - 1, index));
  const baseHeight = detents[safeIndex];
  const liveHeight = Math.max(
    detents[0],
    Math.min(detents[detents.length - 1], baseHeight - dragDelta),
  );

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startY: e.clientY,
      lastY: e.clientY,
      lastT: e.timeStamp,
      velocity: 0,
      pointerId: e.pointerId,
    };
    setDragging(true);
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dt = Math.max(1, e.timeStamp - drag.lastT);
    drag.velocity = (e.clientY - drag.lastY) / dt;
    drag.lastY = e.clientY;
    drag.lastT = e.timeStamp;
    setDragDelta(e.clientY - drag.startY);
  }, []);

  const settle = useCallback(
    (velocity: number) => {
      const target = baseHeight - dragDelta;
      let nextIndex = safeIndex;
      if (Math.abs(velocity) >= FLICK_VELOCITY) {
        nextIndex =
          velocity > 0
            ? Math.max(0, safeIndex - 1)
            : Math.min(detents.length - 1, safeIndex + 1);
      } else {
        let best = 0;
        let bestDist = Infinity;
        for (let i = 0; i < detents.length; i++) {
          const d = Math.abs(detents[i] - target);
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        }
        nextIndex = best;
      }
      setDragDelta(0);
      setDragging(false);
      dragRef.current = null;
      if (nextIndex !== safeIndex) onIndexChange(nextIndex);
    },
    [baseHeight, dragDelta, detents, safeIndex, onIndexChange],
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      settle(drag.velocity);
    },
    [settle],
  );

  // Tap on the grab handle cycles detents so the sheet still works without
  // the gesture (and for keyboard users via the button).
  const onHandleClick = useCallback(() => {
    if (dragging) return;
    const next = (safeIndex + 1) % detents.length;
    onIndexChange(next);
  }, [dragging, detents.length, onIndexChange, safeIndex]);

  // Lock body scroll while the sheet is above the peek so background scroll
  // doesn't fight the sheet's internal scroll.
  useEffect(() => {
    if (safeIndex === 0) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [safeIndex]);

  return (
    <div
      className="eh-mobile-sheet"
      role="dialog"
      aria-modal={false}
      style={{
        height: liveHeight,
        transition:
          dragging || reducedMotion
            ? "none"
            : "height var(--eh-duration-base) var(--eh-ease)",
      }}
    >
      <button
        type="button"
        className="eh-mobile-sheet__handle"
        aria-label={ariaLabel}
        aria-expanded={safeIndex > 0}
        onClick={onHandleClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span className="eh-mobile-sheet__grab" />
      </button>
      <div className="eh-mobile-sheet__content">{children}</div>
    </div>
  );
});

export default BottomSheet;
