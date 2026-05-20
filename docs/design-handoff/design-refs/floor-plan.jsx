// floor-plan.jsx — reusable Easy Housing floor plan (Monopitch Studio)
// Simplified SVG recreation of the configurator's plan view. Responds
// to a `widthM` prop so the plan can be shown next to a width slider.
// Drawing units: 1mm = 0.1 svg-unit (i.e. 7.42 m = 742 units).

const FloorPlan = ({
  widthM = 7.42,
  lengthM = 4.97,
  showDims = true,
  showLabels = true,
  showFurniture = true,
  padding = 70,
  style,
  ...rest
}) => {
  // Convert meters → svg units (1m = 100u).
  const W = widthM * 100;
  const L = lengthM * 100;
  const wallT = 14; // outer wall thickness (≈ 140mm in real-world)

  // Fixed-size service column on the left (bathroom + bedroom).
  // Bathroom: 165cm × 175cm. Bedroom: 280cm × 215cm. Gap between them.
  const bathW = 165, bathH = 175;
  const bedW = 280, bedH = 215;
  const colX = 0; // service column hugs left wall
  const corridor = 30; // gap between bath and bed walls

  // Terrace: takes the right ~55% of the bottom, 145cm deep
  const terraceH = 145;
  const terraceW = Math.max(360, W - bedW - 110); // shrinks with width slider
  const terraceX = W - terraceW;
  const terraceY = L - terraceH;

  // Living room is what's left.

  const vbW = W + padding * 2;
  const vbH = L + padding * 2;

  // ── Helpers ──────────────────────────────────────────────
  const dim = (x1, y1, x2, y2, label, side = "top") => {
    const off = 22;
    const tick = 6;
    const isH = y1 === y2;
    if (isH) {
      const y = side === "top" ? y1 - off : y1 + off;
      return (
        <g style={{ font: "300 11px Poppins, sans-serif", fill: "var(--eh-text-muted)" }}>
          <line x1={x1} y1={y} x2={x2} y2={y} stroke="var(--eh-text-muted)" strokeWidth={0.6} />
          <line x1={x1} y1={y - tick} x2={x1} y2={y + tick} stroke="var(--eh-text-muted)" strokeWidth={0.6} />
          <line x1={x2} y1={y - tick} x2={x2} y2={y + tick} stroke="var(--eh-text-muted)" strokeWidth={0.6} />
          <text x={(x1 + x2) / 2} y={y - 5} textAnchor="middle">{label}</text>
        </g>
      );
    } else {
      const x = side === "left" ? x1 - off : x1 + off;
      return (
        <g style={{ font: "300 11px Poppins, sans-serif", fill: "var(--eh-text-muted)" }}>
          <line x1={x} y1={y1} x2={x} y2={y2} stroke="var(--eh-text-muted)" strokeWidth={0.6} />
          <line x1={x - tick} y1={y1} x2={x + tick} y2={y1} stroke="var(--eh-text-muted)" strokeWidth={0.6} />
          <line x1={x - tick} y1={y2} x2={x + tick} y2={y2} stroke="var(--eh-text-muted)" strokeWidth={0.6} />
          <text x={x - 6} y={(y1 + y2) / 2 + 4} textAnchor="end"
                transform={`rotate(-90 ${x - 6} ${(y1 + y2) / 2 + 4})`}>{label}</text>
        </g>
      );
    }
  };

  // Living-room area for label position (right of bath/bed, full height)
  const livingX = bedW + 20;
  const livingY = 0;
  const livingW = W - livingX;
  const livingH = L - terraceH;

  return (
    <svg
      viewBox={`${-padding} ${-padding} ${vbW} ${vbH}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block", width: "100%", height: "100%", ...style }}
      {...rest}
    >
      {/* ── Slab / floor fill ── */}
      <rect x={0} y={0} width={W} height={L} fill="#FDF6E6" />

      {/* Plank pattern */}
      <defs>
        <pattern id="planks" x="0" y="0" width={W} height="14" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2={W} y2="0" stroke="rgba(140,94,54,0.18)" strokeWidth="0.5" />
        </pattern>
        <pattern id="tile" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
          <rect width="22" height="22" fill="#E7F1F4" />
          <path d="M0 0 L22 0 M0 22 L22 22 M0 0 L0 22 M22 0 L22 22" stroke="rgba(74,143,179,0.30)" strokeWidth="0.5" />
        </pattern>
        <pattern id="deck" x="0" y="0" width="18" height={terraceH} patternUnits="userSpaceOnUse">
          <rect width="18" height={terraceH} fill="#D9B786" />
          <line x1="18" y1="0" x2="18" y2={terraceH} stroke="rgba(140,94,54,0.45)" strokeWidth="0.6" />
        </pattern>
      </defs>

      {/* Living-room flooring */}
      <rect x={0} y={0} width={W} height={L} fill="url(#planks)" />

      {/* Bathroom (tiles) */}
      <rect x={colX} y={0} width={bathW} height={bathH} fill="url(#tile)" />
      {/* Bedroom (planks already covers it, just outline) */}

      {/* Terrace */}
      <rect x={terraceX} y={terraceY} width={terraceW} height={terraceH} fill="url(#deck)" />

      {/* ── Interior walls (deep green strokes) ── */}
      <g stroke="var(--eh-green-900)" strokeWidth="6" strokeLinecap="square" fill="none">
        {/* Bathroom enclosure: right wall + bottom wall */}
        <line x1={bathW} y1={0} x2={bathW} y2={bathH} />
        <line x1={0} y1={bathH} x2={bathW - 30} y2={bathH} />
        {/* Bedroom enclosure: right wall + top wall (with door gap) */}
        <line x1={bedW} y1={bathH + corridor} x2={bedW} y2={L - terraceH - 20} />
        <line x1={0} y1={bathH + corridor} x2={bedW - 80} y2={bathH + corridor} />
        {/* Terrace separator from living (top wall of terrace, with opening) */}
        <line x1={bedW + 20} y1={terraceY} x2={terraceX + 80} y2={terraceY} />
      </g>

      {/* ── Outer walls (deep green thick) ── */}
      <rect x={-wallT/2} y={-wallT/2} width={W + wallT} height={L + wallT}
            fill="none" stroke="var(--eh-green-900)" strokeWidth={wallT} />

      {/* Door arc swings (subtle) */}
      <g stroke="var(--eh-text-soft)" strokeWidth="0.6" fill="none" opacity="0.6">
        <path d={`M ${bedW - 80} ${bathH + corridor} A 80 80 0 0 1 ${bedW} ${bathH + corridor + 80}`} />
      </g>

      {/* ── Furniture ── */}
      {showFurniture && (
        <g stroke="var(--eh-green-900)" strokeWidth="1.2" fill="#fff">
          {/* Bathroom: shower + toilet + sink */}
          <rect x={10} y={10} width={70} height={70} rx={4} />
          <g stroke="var(--eh-green-900)" strokeWidth="0.8" fill="none">
            <line x1={45} y1={10} x2={10} y2={45} />
            <line x1={80} y1={10} x2={10} y2={80} />
            <line x1={80} y1={45} x2={45} y2={80} />
          </g>
          <rect x={90} y={20} width={32} height={50} rx={8} />
          <rect x={130} y={18} width={28} height={28} rx={3} />

          {/* Kitchen: sink + stove (top of living room, near bathroom wall) */}
          <rect x={bathW + 30} y={8} width={64} height={36} rx={3} />
          <circle cx={bathW + 50} cy={26} r={9} fill="none" />
          <rect x={bathW + 110} y={8} width={56} height={36} rx={3} />
          <circle cx={bathW + 124} cy={26} r={5} fill="none" />
          <circle cx={bathW + 152} cy={26} r={5} fill="none" />
          <circle cx={bathW + 124} cy={36} r={3} fill="none" />
          <circle cx={bathW + 152} cy={36} r={3} fill="none" />

          {/* Bedroom: bed */}
          <rect x={20} y={bathH + corridor + 25} width={150} height={180} rx={4} />
          <rect x={28} y={bathH + corridor + 33} width={134} height={50} rx={3} fill="#FAF9F6" />
          {/* nightstand */}
          <rect x={180} y={bathH + corridor + 25} width={50} height={32} rx={2} />

          {/* Living room: pair of armchairs + small table */}
          <ellipse cx={W - 50} cy={livingH/2 - 30} rx={26} ry={22} />
          <ellipse cx={W - 50} cy={livingH/2 + 30} rx={26} ry={22} />
          <circle cx={W - 100} cy={livingH/2} r={18} />

          {/* Terrace: small bistro chair */}
          <ellipse cx={terraceX + terraceW - 60} cy={terraceY + terraceH/2} rx={20} ry={18} />
        </g>
      )}

      {/* Window indicators on outer walls (subtle gaps + parallel lines) */}
      <g stroke="var(--eh-green-900)" strokeWidth="1" fill="none">
        {/* top wall, over kitchen */}
        <line x1={bathW + 30} y1={-wallT/2} x2={bathW + 170} y2={-wallT/2} stroke="#fff" strokeWidth={wallT - 2} />
        <line x1={bathW + 30} y1={-wallT/2} x2={bathW + 170} y2={-wallT/2} />
        {/* right wall, living */}
        <line x1={W + wallT/2 - 1} y1={livingH/2 - 60} x2={W + wallT/2 - 1} y2={livingH/2 + 60} stroke="#fff" strokeWidth={wallT - 2} />
        <line x1={W + wallT/2} y1={livingH/2 - 60} x2={W + wallT/2} y2={livingH/2 + 60} />
        {/* bottom wall, terrace opening (sliding doors) */}
        <line x1={terraceX + 30} y1={terraceY - 1} x2={terraceX + terraceW - 30} y2={terraceY - 1} stroke="#fff" strokeWidth={wallT - 2} />
        <line x1={terraceX + 30} y1={terraceY} x2={terraceX + terraceW - 30} y2={terraceY} />
      </g>

      {/* ── Labels ── */}
      {showLabels && (
        <g style={{ font: "600 11px Poppins, sans-serif", fill: "var(--eh-green-900)" }}>
          <g textAnchor="middle">
            <text x={bathW/2} y={bathH/2 - 4}>Bath Room</text>
            <text x={bathW/2} y={bathH/2 + 11} style={{ font: "300 10px Poppins" }}>3.36 m²</text>

            <text x={bedW/2} y={(bathH + corridor + L - terraceH)/2 - 4 + 50}>Bed Room</text>
            <text x={bedW/2} y={(bathH + corridor + L - terraceH)/2 + 11 + 50} style={{ font: "300 10px Poppins" }}>8.54 m²</text>

            <text x={livingX + livingW * 0.55} y={livingH/2 + 10}>Living Room</text>
            <text x={livingX + livingW * 0.55} y={livingH/2 + 25} style={{ font: "300 10px Poppins" }}>
              {((widthM - 2.85) * (lengthM - 1.45) * 0.62).toFixed(2)} m²
            </text>

            <text x={terraceX + terraceW * 0.6} y={terraceY + terraceH/2 + 4}>Terrace</text>
            <text x={terraceX + terraceW * 0.6} y={terraceY + terraceH/2 + 19} style={{ font: "300 10px Poppins" }}>
              {(terraceW * terraceH / 10000).toFixed(2)} m²
            </text>
          </g>
        </g>
      )}

      {/* ── Dimensions ── */}
      {showDims && (
        <g>
          {/* Overall top */}
          {dim(0, 0, W, 0, Math.round(widthM * 1000).toString(), "top")}
          {/* Overall left */}
          {dim(0, 0, 0, L, Math.round(lengthM * 1000).toString(), "left")}
          {/* Right side bedroom→terrace partitions */}
          {dim(W, 0, W, terraceY, Math.round((lengthM - terraceH/100) * 1000).toString(), "right")}
          {dim(W, terraceY, W, L, Math.round(terraceH * 10).toString(), "right")}
          {/* Bottom row */}
          {dim(0, L, bedW, L, Math.round(bedW * 10).toString(), "bottom")}
          {dim(bedW, L, terraceX, L, Math.round((terraceX - bedW) * 10).toString(), "bottom")}
          {dim(terraceX, L, W, L, Math.round(terraceW * 10).toString(), "bottom")}
        </g>
      )}
    </svg>
  );
};

Object.assign(window, { FloorPlan });
