export default function PhotoCollage() {
  return (
    <div
      style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "2fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gap: 14,
        minHeight: 0,
      }}
    >
      <div className="photo" style={{ gridRow: "1 / span 2", borderRadius: 18, overflow: "hidden" }}>
        <div className="photo__label">Studio exterior · Mukono pilot</div>
      </div>
      <div className="photo" style={{ borderRadius: 18, overflow: "hidden" }}>
        <div className="photo__label">Living area</div>
      </div>
      <div className="photo" style={{ borderRadius: 18, overflow: "hidden" }}>
        <div className="photo__label">Bedroom</div>
      </div>
    </div>
  );
}
