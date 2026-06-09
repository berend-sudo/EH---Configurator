"use client";

import { useImperativeHandle, forwardRef, type ReactNode } from "react";
import { usePinchZoom } from "./usePinchZoom";

interface Props {
  children: ReactNode;
  /** Disable the gesture handlers; the inner content renders normally. */
  disabled?: boolean;
}

export interface PinchZoomHandle {
  reset: () => void;
  isZoomed: () => boolean;
}

const PinchZoomCanvas = forwardRef<PinchZoomHandle, Props>(function PinchZoomCanvas(
  { children, disabled = false },
  ref,
) {
  const { state, isZoomed, reset, bind, frameRef } = usePinchZoom();

  useImperativeHandle(ref, () => ({ reset, isZoomed: () => isZoomed }), [reset, isZoomed]);

  if (disabled) {
    return <div style={{ width: "100%", height: "100%" }}>{children}</div>;
  }

  return (
    <div
      ref={frameRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
      {...bind}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          transformOrigin: "center center",
          transform: `translate3d(${state.tx}px, ${state.ty}px, 0) scale(${state.scale})`,
          transition: "transform 60ms linear",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
});

export default PinchZoomCanvas;
