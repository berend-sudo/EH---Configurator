// SVG <defs> with the room fill patterns. Origin Y is aligned to world y=0
// so stripes don't shift as the slider extends the plan to the right.

export default function RoomPatterns({
  scale,
  drawH,
  padY,
}: {
  scale: number;
  drawH: number;
  padY: number;
}) {
  const originY = padY + drawH;
  const livingPeriod = 150 * scale;
  const bathPeriod = 200 * scale;
  const plankH = 145 * scale;
  const jointH = 5 * scale;
  const terracePeriod = plankH + jointH;

  return (
    <defs>
      {/* Living / Bed Room — warm wood horizontal lines */}
      <pattern
        id="pat-living"
        x="0"
        y={originY}
        width="10000"
        height={livingPeriod}
        patternUnits="userSpaceOnUse"
      >
        <rect width="10000" height={livingPeriod} fill="#F5ECD7" />
        <line
          x1="0"
          y1={livingPeriod}
          x2="10000"
          y2={livingPeriod}
          stroke="#8B7045"
          strokeWidth="0.7"
        />
      </pattern>

      {/* Bath Room — blue tile grid */}
      <pattern
        id="pat-bath"
        x="0"
        y={originY}
        width={bathPeriod}
        height={bathPeriod}
        patternUnits="userSpaceOnUse"
      >
        <rect width={bathPeriod} height={bathPeriod} fill="#E8F4F8" />
        <line
          x1={bathPeriod}
          y1="0"
          x2={bathPeriod}
          y2={bathPeriod}
          stroke="#7AAABB"
          strokeWidth="0.6"
        />
        <line
          x1="0"
          y1={bathPeriod}
          x2={bathPeriod}
          y2={bathPeriod}
          stroke="#7AAABB"
          strokeWidth="0.6"
        />
      </pattern>

      {/* Terrace — darker plank bands */}
      <pattern
        id="pat-terrace"
        x="0"
        y={originY}
        width="10000"
        height={terracePeriod}
        patternUnits="userSpaceOnUse"
      >
        <rect width="10000" height={plankH} fill="#D4C4A0" />
        <rect y={plankH} width="10000" height={jointH} fill="#6B5A3A" />
      </pattern>
    </defs>
  );
}
