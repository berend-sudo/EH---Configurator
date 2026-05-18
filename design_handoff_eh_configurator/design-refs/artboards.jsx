// artboards-landing.jsx — 3 landing-screen variations for the EH Configurator

// Shared brand chrome (top nav)
const EHNavBar = ({ onDark = false, step = "Start", style }) => (
  <div style={{
    display:"flex", alignItems:"center", justifyContent:"space-between",
    padding: "20px 48px",
    borderBottom: onDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid var(--eh-stroke)",
    color: onDark ? "#fff" : "var(--eh-text)",
    ...style,
  }}>
    <div style={{ display:"flex", alignItems:"center", gap:14 }}>
      <img src={onDark ? "design-system/assets/logo-full-white.png" : "design-system/assets/logo-full-color.png"}
           alt="Easy Housing" style={{ height: 28, display:"block" }} />
      <span style={{ width:1, height:18, background: onDark ? "rgba(255,255,255,.2)" : "var(--eh-stroke-strong)" }} />
      <span style={{ fontSize:14, fontWeight:500, opacity:.85 }}>Configurator</span>
    </div>
    <div style={{ display:"flex", alignItems:"center", gap:18, fontSize:13 }}>
      <span style={{ opacity:.6 }}>Step</span>
      <span style={{ fontWeight:600 }}>{step}</span>
      <span style={{ opacity:.4 }}>·</span>
      <span style={{ opacity:.6 }}>Save & exit</span>
    </div>
  </div>
);

// UGX currency formatter — used everywhere a price appears.
const fmtUGX = (n) => 'UGX ' + n.toLocaleString('en-UG');

// Tiny budget tick scale (for the slider mock)
const BudgetSlider = ({ value = 32500000, min = 18000000, max = 75000000 }) => {
  const pct = (value - min) / (max - min);
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:14 }}>
        <span style={{ fontSize:11, fontWeight:600, letterSpacing:".08em", textTransform:"uppercase", color:"var(--eh-text-muted)" }}>
          Budget
        </span>
        <span style={{ fontSize:20, fontWeight:600, color:"var(--eh-text)", fontVariantNumeric:"tabular-nums" }}>
          {fmtUGX(value)}
        </span>
      </div>
      <div className="rail">
        <div className="rail__fill" style={{ width: `${pct * 100}%` }} />
        <div className="rail__knob" style={{ left: `${pct * 100}%` }} />
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:8, fontSize:12, color:"var(--eh-text-soft)", fontVariantNumeric:"tabular-nums" }}>
        <span>{fmtUGX(min)}</span>
        <span>{fmtUGX(max)}</span>
      </div>
    </div>
  );
};

const RoomsCounter = ({ value = 2 }) => (
  <div>
    <div style={{ fontSize:11, fontWeight:600, letterSpacing:".08em", textTransform:"uppercase", color:"var(--eh-text-muted)", marginBottom:14 }}>
      Bedrooms
    </div>
    <div style={{ display:"flex", alignItems:"center", gap:14 }}>
      <button style={{ width:42, height:42, border:"1.5px solid var(--eh-stroke-strong)", borderRadius:"50%",
                       background:"#fff", fontSize:20, color:"var(--eh-text)", cursor:"pointer" }}>–</button>
      <div style={{ minWidth:60, textAlign:"center", fontSize:34, fontWeight:600, color:"var(--eh-text)" }}>{value}</div>
      <button style={{ width:42, height:42, border:0, borderRadius:"50%",
                       background:"var(--eh-green)", color:"var(--eh-green-900)", fontSize:20, cursor:"pointer", fontWeight:600 }}>+</button>
    </div>
  </div>
);

const RoofPicker = ({ active = "monopitch" }) => {
  const types = [
    { id: "monopitch", label: "Monopitch", path: "M 6 28 L 6 14 L 50 6 L 50 28 Z" },
    { id: "gable",     label: "Gable",     path: "M 6 28 L 6 16 L 28 6 L 50 16 L 50 28 Z" },
    { id: "flat",      label: "Flat",      path: "M 6 28 L 6 12 L 50 12 L 50 28 Z" },
  ];
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:600, letterSpacing:".08em", textTransform:"uppercase", color:"var(--eh-text-muted)", marginBottom:14 }}>
        Roof type
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:10 }}>
        {types.map(t => (
          <div key={t.id} style={{
            padding:"14px 10px", borderRadius:14, textAlign:"center", cursor:"pointer",
            background: t.id === active ? "var(--eh-green-900)" : "#fff",
            color: t.id === active ? "#fff" : "var(--eh-text)",
            border: t.id === active ? "1.5px solid var(--eh-green-900)" : "1.5px solid var(--eh-stroke)",
            transition:"all .15s var(--eh-ease)",
          }}>
            <svg viewBox="0 0 56 32" width="56" height="32" style={{ display:"block", margin:"0 auto 6px" }}>
              <path d={t.path} fill="none" stroke={t.id === active ? "var(--eh-green)" : "var(--eh-green-900)"} strokeWidth="2" strokeLinejoin="round" />
            </svg>
            <div style={{ fontSize:12, fontWeight:500 }}>{t.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── L1 — Split: deep-green editorial left + warm photo collage right ───────
const LandingA = () => (
  <div style={{ width:"100%", height:"100%", background:"#fff", display:"flex", flexDirection:"column", fontFamily:"var(--eh-font-sans)", color:"var(--eh-text)" }}>
    <EHNavBar />
    <div style={{ flex:1, display:"grid", gridTemplateColumns:"1.05fr 1fr", gap:0 }}>
      {/* LEFT — copy + form */}
      <div style={{ padding:"56px 64px 48px", background:"var(--eh-green-900)", color:"#fff", display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:11, letterSpacing:".14em", textTransform:"uppercase", color:"var(--eh-green-200)", fontWeight:600, marginBottom:24 }}>
            Design your home — 3 minutes
          </div>
          <h1 style={{ fontSize:64, lineHeight:1.02, fontWeight:600, letterSpacing:"-0.025em", margin:0 }}>
            A home for<br/>everyone.
          </h1>
          <p style={{ fontSize:18, lineHeight:1.55, fontWeight:300, color:"var(--eh-text-on-dark-muted)", maxWidth:430, marginTop:24 }}>
            Tell us a little about what you need. We'll show you a circular,
            biobased home that fits — and a transparent budget you can take to
            our architects.
          </p>
        </div>

        {/* Inline 3-field form on dark */}
        <div style={{ background:"#fff", color:"var(--eh-text)", borderRadius:20, padding:32, marginTop:48, boxShadow:"0 24px 48px rgba(0,59,43,0.30)" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1.1fr 1fr", gap:36, marginBottom:28 }}>
            <BudgetSlider />
            <RoomsCounter />
          </div>
          <RoofPicker />
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:32, paddingTop:24, borderTop:"1px solid var(--eh-stroke)" }}>
            <div>
              <div style={{ fontSize:11, fontWeight:600, letterSpacing:".08em", textTransform:"uppercase", color:"var(--eh-text-muted)" }}>Estimated model</div>
              <div style={{ fontSize:18, fontWeight:600, marginTop:4 }}>Monopitch — Studio</div>
            </div>
            <button className="ab-cta ab-cta--dark">
              Start designing
              <span style={{ fontSize:18, lineHeight:1 }}>→</span>
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT — photo collage echoing the brand social-grid motif */}
      <div style={{ padding:0, display:"grid", gridTemplateRows:"1.6fr 1fr", gridTemplateColumns:"1fr 1fr", gap:0 }}>
        <div className="photo" style={{ gridColumn:"1 / span 2" }}>
          <div className="photo__label">Mukono, Uganda · 2024</div>
        </div>
        <div style={{ background:"var(--eh-green)", display:"flex", flexDirection:"column", justifyContent:"flex-end", padding:32 }}>
          <div style={{ fontSize:11, letterSpacing:".12em", textTransform:"uppercase", fontWeight:600, color:"var(--eh-green-900)", opacity:.7 }}>
            Built so far
          </div>
          <div style={{ fontSize:56, lineHeight:1, fontWeight:600, color:"var(--eh-green-900)", letterSpacing:"-0.02em", marginTop:8 }}>
            148<span style={{ fontSize:20, opacity:.6, marginLeft:6 }}>homes</span>
          </div>
          <div style={{ fontSize:13, color:"var(--eh-green-900)", opacity:.75, marginTop:10, lineHeight:1.5 }}>
            Across Uganda, Mozambique, Ghana &amp; Tanzania.
          </div>
        </div>
        <div className="photo">
          <div className="photo__label">CLT timber frame</div>
        </div>
      </div>
    </div>
  </div>
);

// ── L2 — Centered card-on-photo (simple, one-pane invitation) ──────────────
const LandingB = () => (
  <div style={{ position:"relative", width:"100%", height:"100%", overflow:"hidden", fontFamily:"var(--eh-font-sans)" }}>
    {/* Big photo backdrop */}
    <div className="photo" style={{ position:"absolute", inset:0, background:"linear-gradient(180deg, #6a8466, #2a4d3a)" }} />
    <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg, rgba(0,59,43,0.6) 0%, rgba(0,59,43,0.25) 60%, rgba(0,59,43,0.5) 100%)" }} />
    {/* Nav over photo */}
    <div style={{ position:"relative", zIndex:2 }}>
      <EHNavBar onDark />
    </div>

    {/* Centered card */}
    <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", zIndex:2, paddingTop:60 }}>
      <div style={{ background:"#fff", borderRadius:32, padding:"48px 56px", width:760, boxShadow:"0 32px 80px rgba(0,59,43,0.35)" }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <span className="ab-pill ab-pill-soft">Quick configurator</span>
          <h1 style={{ fontSize:44, lineHeight:1.08, fontWeight:600, letterSpacing:"-0.025em", margin:"18px 0 10px", color:"var(--eh-text)" }}>
            Let's design your home.
          </h1>
          <p style={{ fontSize:16, lineHeight:1.55, fontWeight:300, color:"var(--eh-text-muted)", margin:0, maxWidth:520, marginInline:"auto" }}>
            Three quick choices — we'll generate a floor plan and a transparent
            budget you can share with our architects.
          </p>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr", gap:36, marginBottom:32 }}>
          <BudgetSlider />
          <RoomsCounter />
        </div>
        <RoofPicker />

        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", marginTop:36 }}>
          <button className="ab-cta" style={{ padding:"16px 36px", fontSize:16 }}>
            Open the configurator
            <span style={{ fontSize:18, lineHeight:1 }}>→</span>
          </button>
        </div>
        <div style={{ textAlign:"center", marginTop:18, fontSize:12, color:"var(--eh-text-soft)" }}>
          You can change anything in the next step.
        </div>
      </div>
    </div>
  </div>
);

// ── L3 — Multi-step wizard (showing step 2 of 3) ───────────────────────────
const LandingC = () => (
  <div style={{ width:"100%", height:"100%", background:"var(--eh-bg-alt)", fontFamily:"var(--eh-font-sans)", color:"var(--eh-text)", display:"flex", flexDirection:"column" }}>
    <EHNavBar step="2 of 3 · Bedrooms" />

    <div style={{ flex:1, display:"grid", gridTemplateColumns:"1fr 1fr", gap:0 }}>
      {/* LEFT — the active question */}
      <div style={{ padding:"56px 80px", display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
        <div>
          <div className="stepper" style={{ marginBottom:40 }}>
            <span className="dot is-on" />
            <span className="bar is-on" />
            <span className="dot is-current" />
            <span className="bar" />
            <span className="dot" />
            <span style={{ marginLeft:14, fontSize:13, color:"var(--eh-text-muted)" }}>Budget · <strong style={{ color:"var(--eh-text)", fontWeight:600 }}>Bedrooms</strong> · Roof</span>
          </div>

          <div style={{ fontSize:13, letterSpacing:".12em", textTransform:"uppercase", color:"var(--eh-green-700)", fontWeight:600, marginBottom:14 }}>
            Question 2
          </div>
          <h1 style={{ fontSize:56, lineHeight:1.05, fontWeight:600, letterSpacing:"-0.025em", margin:0 }}>
            How many bedrooms?
          </h1>
          <p style={{ fontSize:18, lineHeight:1.55, fontWeight:300, color:"var(--eh-text-muted)", margin:"18px 0 40px", maxWidth:480 }}>
            Most of our homes are 1–3 bedrooms. You can always change this on the
            next step.
          </p>

          {/* Big card options */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:14, maxWidth:560 }}>
            {[1,2,3,4].map((n) => (
              <div key={n} style={{
                aspectRatio:"1 / 1.05", borderRadius:18, padding:18,
                background: n === 2 ? "var(--eh-green-900)" : "#fff",
                color: n === 2 ? "#fff" : "var(--eh-text)",
                border: n === 2 ? "1.5px solid var(--eh-green-900)" : "1.5px solid var(--eh-stroke)",
                display:"flex", flexDirection:"column", justifyContent:"space-between", cursor:"pointer",
              }}>
                <div style={{ fontSize:44, fontWeight:600, letterSpacing:"-0.02em" }}>{n}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:500 }}>{n === 1 ? "Studio" : `${n}-bed`}</div>
                  <div style={{ fontSize:11, opacity:.65, marginTop:4 }}>{30 + n * 12} m²</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:24, borderTop:"1px solid var(--eh-stroke)" }}>
          <button className="ab-cta ab-cta--ghost">← Back</button>
          <button className="ab-cta">Next: Roof type →</button>
        </div>
      </div>

      {/* RIGHT — live preview that updates as the user answers */}
      <div style={{ background:"#fff", borderLeft:"1px solid var(--eh-stroke)", padding:"56px 64px", display:"flex", flexDirection:"column" }}>
        <div style={{ fontSize:11, letterSpacing:".12em", textTransform:"uppercase", color:"var(--eh-text-muted)", fontWeight:600, marginBottom:14 }}>
          Live preview
        </div>
        <div style={{ flex:1, background:"var(--eh-bg-alt)", borderRadius:24, padding:32, display:"flex", flexDirection:"column", justifyContent:"center" }}>
          <FloorPlan widthM={6.2} lengthM={4.5} showFurniture={true} showDims={false} />
        </div>
        <div style={{ display:"flex", gap:24, marginTop:24 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, letterSpacing:".08em", textTransform:"uppercase", color:"var(--eh-text-muted)", fontWeight:600 }}>Working budget</div>
            <div style={{ fontSize:32, fontWeight:600, marginTop:4 }}>{fmtUGX(32500000)}</div>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, letterSpacing:".08em", textTransform:"uppercase", color:"var(--eh-text-muted)", fontWeight:600 }}>Estimated footprint</div>
            <div style={{ fontSize:32, fontWeight:600, marginTop:4 }}>42 m²</div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

Object.assign(window, { LandingA, LandingB, LandingC, EHNavBar, BudgetSlider, RoomsCounter, RoofPicker });


// ────────────────────────────────────────

// artboards-configurator.jsx — 2 configurator-screen variations

// A clean labelled slider that mimics the screenshot's pattern
const SliderRow = ({ label, value, min, max, unit = "m", accent = "var(--eh-green-900)" }) => {
  const pct = (value - min) / (max - min);
  return (
    <div>
      <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:14 }}>
        <span style={{ fontSize:14, fontWeight:500, color:"var(--eh-text)" }}>{label}</span>
        <span style={{
          display:"inline-flex", alignItems:"center", gap:4,
          background:"var(--eh-bg-alt)", borderRadius:10, padding:"4px 12px",
          fontSize:14, fontWeight:600, color:"var(--eh-text)", fontVariantNumeric:"tabular-nums",
        }}>
          {value.toFixed(2)} <span style={{ opacity:.55, fontWeight:400 }}>{unit}</span>
        </span>
      </div>
      <div className="rail">
        <div className="rail__fill" style={{ width:`${pct * 100}%`, background: accent }} />
        <div className="rail__knob" style={{ left:`${pct * 100}%` }} />
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:8, fontSize:12, color:"var(--eh-text-soft)" }}>
        <span>{min.toFixed(1)} {unit}</span>
        <span>{max.toFixed(1)} {unit}</span>
      </div>
    </div>
  );
};

// Live budget chip — same in both variants
const BudgetChip = ({ amount = 32500000, delta = "+ UGX 1,500,000", style, compact = false }) => (
  <div style={{
    display:"flex", alignItems:"center", gap: compact ? 14 : 18,
    background:"var(--eh-green-900)", color:"#fff",
    padding: compact ? "14px 18px" : "16px 22px", borderRadius:18,
    boxShadow: compact ? "none" : "0 16px 40px rgba(0,59,43,0.22)",
    ...style,
  }}>
    <div style={{ width:38, height:38, borderRadius:"50%", background:"var(--eh-green)",
                  display:"flex", alignItems:"center", justifyContent:"center", color:"var(--eh-green-900)",
                  fontWeight:600, fontSize:14, letterSpacing:"-0.02em" }}>USh</div>
    <div>
      <div style={{ fontSize:10, letterSpacing:".12em", textTransform:"uppercase", color:"var(--eh-green-200)", fontWeight:600 }}>
        Live budget
      </div>
      <div style={{ display:"flex", alignItems:"baseline", gap:10, marginTop:2, flexWrap:"wrap" }}>
        <span style={{ fontSize: compact ? 20 : 24, fontWeight:600, fontVariantNumeric:"tabular-nums" }}>{fmtUGX(amount)}</span>
        <span style={{ fontSize:11, color:"var(--eh-green-200)", fontWeight:500 }}>{delta}</span>
      </div>
    </div>
  </div>
);

// Summary row (in left rail)
const SummaryItem = ({ label, value, sub }) => (
  <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid var(--eh-stroke)" }}>
    <div>
      <div style={{ fontSize:13, color:"var(--eh-text-muted)" }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:"var(--eh-text-soft)", marginTop:2 }}>{sub}</div>}
    </div>
    <div style={{ fontSize:15, fontWeight:600, fontVariantNumeric:"tabular-nums" }}>{value}</div>
  </div>
);

// ── C1 — Left rail of controls, plan centre stage ──────────────────────────
const ConfiguratorA = () => {
  const widthM = 7.42, lengthM = 4.97;
  const [view, setView] = React.useState("plan");
  return (
    <div style={{ width:"100%", height:"100%", background:"var(--eh-bg-alt)", fontFamily:"var(--eh-font-sans)", color:"var(--eh-text)", display:"flex", flexDirection:"column" }}>
      <EHNavBar step="Configure · Monopitch Studio" />

      <div style={{ flex:1, display:"grid", gridTemplateColumns:"380px 1fr", gap:0, minHeight:0 }}>
        {/* LEFT — controls rail */}
        <div style={{ background:"#fff", borderRight:"1px solid var(--eh-stroke)", padding:"32px 32px 28px", display:"flex", flexDirection:"column", gap:28, overflow:"auto" }}>
          <div>
            <div style={{ fontSize:11, letterSpacing:".12em", textTransform:"uppercase", color:"var(--eh-green-700)", fontWeight:600 }}>Your design</div>
            <h2 style={{ fontSize:26, fontWeight:600, letterSpacing:"-0.02em", margin:"6px 0 6px" }}>Monopitch · Studio</h2>
            <div style={{ fontSize:13, color:"var(--eh-text-muted)" }}>2 bedrooms · Monopitch roof</div>
          </div>

          {/* Dimensions section */}
          <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:".08em", textTransform:"uppercase", color:"var(--eh-text-muted)" }}>
              Dimensions
            </div>
            <SliderRow label="Width" value={widthM} min={5.0} max={7.5} />
          </div>

          {/* Footprint summary */}
          <div style={{ background:"var(--eh-bg-alt)", border:"1px solid var(--eh-stroke)", borderRadius:16, padding:"20px 22px" }}>
            <SummaryItem label="Footprint" value="36.88 m²" />
            <SummaryItem label="Living area" value="16.39 m²" sub="incl. kitchen" />
            <SummaryItem label="Terrace" value="5.10 m²" />
            <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", paddingTop:14, marginTop:6 }}>
              <div style={{ fontSize:13, fontWeight:600 }}>Indicative budget</div>
              <div style={{ fontSize:18, fontWeight:600, color:"var(--eh-green-900)", fontVariantNumeric:"tabular-nums" }}>{fmtUGX(32500000)}</div>
            </div>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:"auto" }}>
            <button className="ab-cta" style={{ justifyContent:"center" }}>
              Continue to summary →
            </button>
            <button className="ab-cta ab-cta--ghost" style={{ justifyContent:"center" }}>
              Reset to default
            </button>
          </div>
        </div>

        {/* RIGHT — plan canvas */}
        <div style={{ padding:"28px 36px 36px", display:"flex", flexDirection:"column", minHeight:0 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <span className="ab-pill ab-pill-soft">{view === "plan" ? "Plan view · 1:50" : "Example images"}</span>
              <span style={{ fontSize:13, color:"var(--eh-text-muted)" }}>
                {view === "plan" ? "Use the slider to change width" : "From recent Easy Housing builds"}
              </span>
            </div>
            <div className="seg">
              <button className={view === "plan" ? "is-active" : ""} onClick={() => setView("plan")}>Plan</button>
              <button className={view === "images" ? "is-active" : ""} onClick={() => setView("images")}>Example images</button>
            </div>
          </div>

          <div style={{ flex:1, background:"#fff", border:"1px solid var(--eh-stroke)", borderRadius:24, padding: view === "plan" ? "40px 48px" : 24, minHeight:0, display:"flex" }}>
            {view === "plan" ? (
              <FloorPlan widthM={widthM} lengthM={lengthM} />
            ) : (
              <div style={{ flex:1, display:"grid", gridTemplateColumns:"2fr 1fr", gridTemplateRows:"1fr 1fr", gap:14, minHeight:0 }}>
                <div className="photo" style={{ gridRow:"1 / span 2", borderRadius:18, overflow:"hidden" }}>
                  <div className="photo__label">Studio exterior · Mukono pilot</div>
                </div>
                <div className="photo" style={{ borderRadius:18, overflow:"hidden" }}>
                  <div className="photo__label">Living area</div>
                </div>
                <div className="photo" style={{ borderRadius:18, overflow:"hidden" }}>
                  <div className="photo__label">Bedroom</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── C2 — Top toolbar with sliders, plan full-bleed, chip bottom-right ──────
const ConfiguratorB = () => {
  const widthM = 7.42, lengthM = 4.97;
  const [view, setView] = React.useState("plan");
  return (
    <div style={{ width:"100%", height:"100%", background:"var(--eh-bg-alt)", fontFamily:"var(--eh-font-sans)", color:"var(--eh-text)", display:"flex", flexDirection:"column" }}>
      <EHNavBar step="Configure · Monopitch Studio" />

      {/* Top toolbar — single width slider + actions */}
      <div style={{ background:"#fff", borderBottom:"1px solid var(--eh-stroke)", padding:"22px 48px",
                    display:"grid", gridTemplateColumns:"1fr auto", gap:48, alignItems:"center" }}>
        <SliderRow label="Width" value={widthM} min={5.0} max={7.5} />
        <div style={{ display:"flex", gap:10 }}>
          <button className="ab-cta ab-cta--ghost" style={{ padding:"12px 22px", fontSize:14 }}>Reset</button>
          <button className="ab-cta" style={{ padding:"12px 22px", fontSize:14 }}>Continue →</button>
        </div>
      </div>

      {/* Plan canvas */}
      <div style={{ flex:1, padding:"32px 48px 48px", display:"grid", gridTemplateColumns:"280px 1fr", gap:32, minHeight:0 }}>
        {/* Left column — summary card (footprint + breakdown + live budget) */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ background:"#fff", border:"1px solid var(--eh-stroke)",
                        borderRadius:18, padding:0, boxShadow:"var(--eh-shadow-sm)", overflow:"hidden" }}>
            <div style={{ padding:"18px 22px 16px" }}>
              <div style={{ fontSize:10, letterSpacing:".12em", textTransform:"uppercase", color:"var(--eh-text-muted)", fontWeight:600 }}>
                Footprint
              </div>
              <div style={{ fontSize:28, fontWeight:600, letterSpacing:"-0.02em", marginTop:4 }}>36.88 m²</div>
              <div style={{ height:1, background:"var(--eh-stroke)", margin:"14px 0" }} />
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"var(--eh-text-muted)" }}>
                <span>Living</span><span style={{ color:"var(--eh-text)", fontWeight:500 }}>16.39 m²</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"var(--eh-text-muted)", marginTop:6 }}>
                <span>Bed</span><span style={{ color:"var(--eh-text)", fontWeight:500 }}>8.54 m²</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"var(--eh-text-muted)", marginTop:6 }}>
                <span>Bath</span><span style={{ color:"var(--eh-text)", fontWeight:500 }}>3.36 m²</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"var(--eh-text-muted)", marginTop:6 }}>
                <span>Terrace</span><span style={{ color:"var(--eh-text)", fontWeight:500 }}>5.10 m²</span>
              </div>
            </div>
            {/* Live budget docked at the bottom of the same card */}
            <BudgetChip
              amount={32500000}
              delta="+ UGX 1,500,000 vs base"
              compact
              style={{ borderRadius:0, width:"100%" }}
            />
          </div>
        </div>

        {/* Right column — plan / images */}
        <div style={{ display:"flex", flexDirection:"column", minWidth:0, minHeight:0 }}>
          {/* View toggle docked top-right of the plan column */}
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:18 }}>
            <div className="seg">
              <button className={view === "plan" ? "is-active" : ""} onClick={() => setView("plan")}>Plan</button>
              <button className={view === "images" ? "is-active" : ""} onClick={() => setView("images")}>Example images</button>
            </div>
          </div>

          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", minHeight:0 }}>
            {view === "plan" ? (
              <div style={{ width:"100%", maxWidth:880, maxHeight:"100%" }}>
                <FloorPlan widthM={widthM} lengthM={lengthM} />
              </div>
            ) : (
              <div style={{ width:"100%", maxWidth:880, display:"grid", gridTemplateColumns:"2fr 1fr", gridTemplateRows:"1fr 1fr", gap:14, height:"100%", maxHeight:520 }}>
                <div className="photo" style={{ gridRow:"1 / span 2", borderRadius:18, overflow:"hidden" }}>
                  <div className="photo__label">Studio exterior · Mukono pilot</div>
                </div>
                <div className="photo" style={{ borderRadius:18, overflow:"hidden" }}>
                  <div className="photo__label">Living area</div>
                </div>
                <div className="photo" style={{ borderRadius:18, overflow:"hidden" }}>
                  <div className="photo__label">Bedroom</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { ConfiguratorA, ConfiguratorB, SliderRow, BudgetChip });


// ────────────────────────────────────────

// artboards-finish.jsx — final client-info screen + PDF mock

// ── Final client-info & "Generate PDF" screen ──────────────────────────────
const FinalScreen = () => (
  <div style={{ width:"100%", height:"100%", background:"var(--eh-bg-alt)", fontFamily:"var(--eh-font-sans)", color:"var(--eh-text)", display:"flex", flexDirection:"column" }}>
    <EHNavBar step="3 of 3 · Your details" />

    <div style={{ flex:1, display:"grid", gridTemplateColumns:"1.05fr 1fr", gap:0, minHeight:0 }}>
      {/* LEFT — design summary */}
      <div style={{ padding:"56px 64px", display:"flex", flexDirection:"column" }}>
        <div style={{ fontSize:11, letterSpacing:".12em", textTransform:"uppercase", color:"var(--eh-green-700)", fontWeight:600, marginBottom:10 }}>
          Your design
        </div>
        <h1 style={{ fontSize:42, fontWeight:600, letterSpacing:"-0.02em", margin:"0 0 8px" }}>
          Monopitch · Studio
        </h1>
        <p style={{ fontSize:15, fontWeight:300, color:"var(--eh-text-muted)", margin:"0 0 32px" }}>
          Saved 18 May 2026 · ref EH-2026-0418
        </p>

        {/* Mini plan card */}
        <div style={{ background:"#fff", borderRadius:24, border:"1px solid var(--eh-stroke)", padding:24, marginBottom:24 }}>
          <FloorPlan widthM={7.42} lengthM={4.97} showDims={false} />
        </div>

        {/* Stat strip */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:14 }}>
          {[
            { k:"Width",      v:"7.42 m" },
            { k:"Length",     v:"4.97 m" },
            { k:"Footprint",  v:"36.88 m²" },
            { k:"Bedrooms",   v:"2" },
          ].map(s => (
            <div key={s.k} style={{ background:"#fff", border:"1px solid var(--eh-stroke)", borderRadius:14, padding:"14px 16px" }}>
              <div style={{ fontSize:10, letterSpacing:".12em", textTransform:"uppercase", color:"var(--eh-text-muted)", fontWeight:600 }}>{s.k}</div>
              <div style={{ fontSize:20, fontWeight:600, marginTop:4 }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT — contact form */}
      <div style={{ background:"#fff", borderLeft:"1px solid var(--eh-stroke)", padding:"56px 64px", display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
        <div>
          <h2 style={{ fontSize:32, fontWeight:600, letterSpacing:"-0.02em", margin:"0 0 10px" }}>
            Your details.
          </h2>
          <p style={{ fontSize:15, fontWeight:300, color:"var(--eh-text-muted)", margin:"0 0 36px", lineHeight:1.55 }}>
            We'll generate a PDF overview and send it to you. Bring it along
            when you meet our architects.
          </p>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>
            <div className="field" style={{ gridColumn:"1 / -1" }}>
              <label>Full name</label>
              <input defaultValue="Anna van der Berg" />
            </div>
            <div className="field">
              <label>Email</label>
              <input defaultValue="anna@example.com" />
            </div>
            <div className="field">
              <label>Phone</label>
              <input defaultValue="+31 6 1234 5678" />
            </div>
            <div className="field" style={{ gridColumn:"1 / -1" }}>
              <label>Intended timeline</label>
              <select defaultValue="6-12">
                <option value="0-3">Within 3 months</option>
                <option value="3-6">3 – 6 months</option>
                <option value="6-12">6 – 12 months</option>
                <option value="12+">Over a year</option>
              </select>
            </div>
          </div>

          <label style={{ display:"flex", alignItems:"flex-start", gap:12, fontSize:13, color:"var(--eh-text-muted)", lineHeight:1.5, marginTop:8 }}>
            <input type="checkbox" defaultChecked style={{ marginTop:3, width:18, height:18, accentColor:"var(--eh-green-500)" }} />
            <span>I agree to be contacted by an Easy Housing architect about
            this design. We never sell your details.</span>
          </label>
        </div>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:32, paddingTop:24, borderTop:"1px solid var(--eh-stroke)" }}>
          <button className="ab-cta ab-cta--ghost">← Edit design</button>
          <button className="ab-cta" style={{ padding:"16px 30px" }}>
            <span data-lucide="file-down" style={{ width:18, height:18 }} />
            Generate PDF
          </button>
        </div>
      </div>
    </div>
  </div>
);

// ── PDF mock pages (A4 portrait, 595 × 842 at 72dpi) ──────────────────────

// Cover
const PDFCover = () => (
  <div className="pdf-page" style={{ width:"100%", height:"100%", display:"flex", flexDirection:"column" }}>
    {/* Top deep-green band */}
    <div style={{ background:"var(--eh-green-900)", color:"#fff", padding:"32px 36px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <img src="design-system/assets/logo-full-white.png" alt="Easy Housing" style={{ height:22 }} />
      <div style={{ fontSize:10, letterSpacing:".14em", textTransform:"uppercase", color:"var(--eh-green-200)", fontWeight:600 }}>
        Design Brief · 2026
      </div>
    </div>

    {/* Hero photo */}
    <div className="photo" style={{ flex:"1 1 0", minHeight:0 }}>
      <div className="photo__label">Mukono, Uganda · Easy Housing pilot</div>
    </div>

    {/* Title block */}
    <div style={{ padding:"36px 36px 24px", background:"#fff" }}>
      <div style={{ fontSize:10, letterSpacing:".14em", textTransform:"uppercase", color:"var(--eh-green-700)", fontWeight:600 }}>
        Configurator output
      </div>
      <h1 style={{ fontSize:34, fontWeight:600, letterSpacing:"-0.02em", margin:"6px 0 0", lineHeight:1.05 }}>
        Monopitch · Studio
      </h1>
      <div style={{ fontSize:13, color:"var(--eh-text-muted)", marginTop:6 }}>
        2-bedroom · 36.88 m² · Indicative budget {fmtUGX(32500000)}
      </div>

      <div style={{ height:1, background:"var(--eh-stroke)", margin:"22px 0 18px" }} />

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div>
          <div style={{ fontSize:9, letterSpacing:".12em", textTransform:"uppercase", color:"var(--eh-text-muted)", fontWeight:600 }}>Prepared for</div>
          <div style={{ fontSize:14, fontWeight:600, marginTop:4 }}>Anna van der Berg</div>
          <div style={{ fontSize:11, color:"var(--eh-text-muted)" }}>anna@example.com</div>
        </div>
        <div>
          <div style={{ fontSize:9, letterSpacing:".12em", textTransform:"uppercase", color:"var(--eh-text-muted)", fontWeight:600 }}>Reference</div>
          <div style={{ fontSize:14, fontWeight:600, marginTop:4 }}>EH-2026-0418</div>
          <div style={{ fontSize:11, color:"var(--eh-text-muted)" }}>Generated 18 May 2026</div>
        </div>
      </div>
    </div>

    {/* Footer */}
    <div style={{ background:"var(--eh-bg-alt)", padding:"14px 36px", display:"flex", justifyContent:"space-between", fontSize:9, color:"var(--eh-text-muted)" }}>
      <span>A home for everyone, Easy Housing</span>
      <span>1 / 3</span>
    </div>
  </div>
);

// Plan page
const PDFPlan = () => (
  <div className="pdf-page" style={{ width:"100%", height:"100%", display:"flex", flexDirection:"column", padding:"32px 36px" }}>
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <img src="design-system/assets/logo-full-color.png" alt="Easy Housing" style={{ height:18 }} />
      <div style={{ fontSize:9, letterSpacing:".14em", textTransform:"uppercase", color:"var(--eh-text-muted)", fontWeight:600 }}>
        Floor plan
      </div>
    </div>

    <div style={{ marginTop:18 }}>
      <h2 style={{ fontSize:22, fontWeight:600, letterSpacing:"-0.02em", margin:0 }}>Plan view.</h2>
      <p style={{ fontSize:11, color:"var(--eh-text-muted)", margin:"4px 0 0" }}>1 : 50 · all dimensions in mm</p>
    </div>

    <div style={{ flex:1, background:"var(--eh-bg-alt)", border:"1px solid var(--eh-stroke)", borderRadius:14, padding:24, marginTop:18, display:"flex" }}>
      <FloorPlan widthM={7.42} lengthM={4.97} />
    </div>

    {/* Legend */}
    <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:10, marginTop:18 }}>
      {[
        { color:"#FDF6E6", label:"Living room", value:"16.39 m²" },
        { color:"#E7F1F4", label:"Bath room",   value:"3.36 m²" },
        { color:"#FDF6E6", label:"Bed room",    value:"8.54 m²" },
        { color:"#D9B786", label:"Terrace",     value:"5.10 m²" },
      ].map(r => (
        <div key={r.label} style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:18, height:18, borderRadius:4, background:r.color, border:"1px solid var(--eh-stroke)" }} />
          <div>
            <div style={{ fontSize:10, color:"var(--eh-text-muted)" }}>{r.label}</div>
            <div style={{ fontSize:12, fontWeight:600 }}>{r.value}</div>
          </div>
        </div>
      ))}
    </div>

    <div style={{ borderTop:"1px solid var(--eh-stroke)", marginTop:18, paddingTop:10, display:"flex", justifyContent:"space-between", fontSize:9, color:"var(--eh-text-muted)" }}>
      <span>EH-2026-0418 · Monopitch Studio</span>
      <span>2 / 3</span>
    </div>
  </div>
);

// Spec / budget sheet
const PDFSpec = () => {
  const rows = [
    { cat:"Foundation",      item:"Concrete pad, 36.88 m²",                cost: 4500000 },
    { cat:"Structure",       item:"CLT timber frame, prefab panels",       cost: 10500000 },
    { cat:"Cladding",        item:"FSC pine, vertical board-on-board",     cost: 3400000 },
    { cat:"Roof",            item:"Monopitch, insulated, corrugated steel",cost: 5200000 },
    { cat:"Interior",        item:"Plywood lining, partition walls",       cost: 3800000 },
    { cat:"Windows & doors", item:"Triple-glazed, 4 windows, 2 doors",     cost: 3000000 },
    { cat:"Kitchen & bath",  item:"Compact units, fittings",               cost: 3400000 },
    { cat:"Electrical",      item:"Solar-ready, 8 outlets, LED",           cost: 1900000 },
    { cat:"Logistics",       item:"Transport & local install crew",        cost: 2800000 },
  ];
  const total = rows.reduce((s,r) => s + r.cost, 0);
  return (
    <div className="pdf-page" style={{ width:"100%", height:"100%", display:"flex", flexDirection:"column", padding:"32px 36px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <img src="design-system/assets/logo-full-color.png" alt="Easy Housing" style={{ height:18 }} />
        <div style={{ fontSize:9, letterSpacing:".14em", textTransform:"uppercase", color:"var(--eh-text-muted)", fontWeight:600 }}>
          Spec & budget
        </div>
      </div>

      <div style={{ marginTop:18 }}>
        <h2 style={{ fontSize:22, fontWeight:600, letterSpacing:"-0.02em", margin:0 }}>Spec sheet.</h2>
        <p style={{ fontSize:11, color:"var(--eh-text-muted)", margin:"4px 0 0" }}>
          Indicative budget — final pricing depends on site &amp; local sourcing.
        </p>
      </div>

      {/* Cost table */}
      <div style={{ flex:1, marginTop:18, fontSize:11, color:"var(--eh-text)" }}>
        <div style={{ display:"grid", gridTemplateColumns:"110px 1fr 90px", padding:"10px 0", borderBottom:"1.5px solid var(--eh-green-900)", fontSize:9, letterSpacing:".12em", textTransform:"uppercase", fontWeight:600, color:"var(--eh-text-muted)" }}>
          <span>Category</span><span>Item</span><span style={{ textAlign:"right" }}>UGX</span>
        </div>
        {rows.map((r,i) => (
          <div key={i} style={{ display:"grid", gridTemplateColumns:"110px 1fr 90px", padding:"10px 0", borderBottom:"1px solid var(--eh-stroke)" }}>
            <span style={{ fontWeight:500 }}>{r.cat}</span>
            <span style={{ color:"var(--eh-text-muted)", fontWeight:300 }}>{r.item}</span>
            <span style={{ textAlign:"right", fontVariantNumeric:"tabular-nums", fontWeight:500 }}>{r.cost.toLocaleString("en-US")}</span>
          </div>
        ))}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 90px", padding:"14px 0", marginTop:6 }}>
          <span style={{ fontSize:14, fontWeight:600 }}>Indicative total</span>
          <span style={{ textAlign:"right", fontSize:18, fontWeight:600, color:"var(--eh-green-900)", fontVariantNumeric:"tabular-nums" }}>
            {fmtUGX(total)}
          </span>
        </div>
      </div>

      {/* CO₂ proof box */}
      <div style={{ background:"var(--eh-green-900)", color:"#fff", borderRadius:14, padding:"18px 22px", marginTop:14, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:9, letterSpacing:".14em", textTransform:"uppercase", color:"var(--eh-green-200)", fontWeight:600 }}>
            Climate impact
          </div>
          <div style={{ fontSize:13, fontWeight:300, marginTop:4, lineHeight:1.5, maxWidth:300 }}>
            Reduces <strong style={{ fontWeight:600 }}>26 tonnes of CO₂</strong> — equivalent
            to 130 000 km of plane travel.
          </div>
        </div>
        <div style={{ fontSize:42, fontWeight:600, color:"var(--eh-green)", letterSpacing:"-0.02em" }}>−26<span style={{ fontSize:14, opacity:.7, marginLeft:4 }}>t CO₂</span></div>
      </div>

      <div style={{ borderTop:"1px solid var(--eh-stroke)", marginTop:14, paddingTop:10, display:"flex", justifyContent:"space-between", fontSize:9, color:"var(--eh-text-muted)" }}>
        <span>A home for everyone, Easy Housing</span>
        <span>3 / 3</span>
      </div>
    </div>
  );
};

Object.assign(window, { FinalScreen, PDFCover, PDFPlan, PDFSpec });


// ────────────────────────────────────────

// app.jsx — wires every artboard into the DesignCanvas

const DESKTOP_W = 1440;
const DESKTOP_H = 900;
const PDF_W = 595;     // A4 at 72dpi
const PDF_H = 842;

const App = () => {
  // Refresh lucide whenever React mounts new icons
  React.useEffect(() => {
    if (window.lucide?.createIcons) window.lucide.createIcons();
  });

  return (
    <DesignCanvas>
      <DCSection
        id="landing"
        title="01 · Landing"
        subtitle="Three takes on capturing budget, bedrooms & roof type before entering the configurator."
      >
        <DCArtboard id="landing-a" label="A · Editorial split + photo collage" width={DESKTOP_W} height={DESKTOP_H}>
          <LandingA />
        </DCArtboard>
        <DCArtboard id="landing-b" label="B · Centered card on photo" width={DESKTOP_W} height={DESKTOP_H}>
          <LandingB />
        </DCArtboard>
        <DCArtboard id="landing-c" label="C · Multi-step wizard with live preview" width={DESKTOP_W} height={DESKTOP_H}>
          <LandingC />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="configurator"
        title="02 · Configurator"
        subtitle="Width slider on the left rail, plan / example images on the right. Live budget lives in the summary, off the plan."
      >
        <DCArtboard id="config-a" label="A · Left control rail (chosen)" width={DESKTOP_W} height={DESKTOP_H}>
          <ConfiguratorA />
        </DCArtboard>
        <DCArtboard id="config-b" label="B · Top toolbar (alt)" width={DESKTOP_W} height={DESKTOP_H}>
          <ConfiguratorB />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="finish"
        title="03 · Client info & PDF"
        subtitle="Capture name / email / phone / timeline, then generate the 3-page PDF the client takes to the architects."
      >
        <DCArtboard id="final" label="Final · Client info + generate" width={DESKTOP_W} height={DESKTOP_H}>
          <FinalScreen />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="pdf"
        title="04 · Generated PDF"
        subtitle="What the user gets: a cover, the plan, and a spec sheet with budget breakdown."
      >
        <DCArtboard id="pdf-cover" label="Page 1 · Cover" width={PDF_W} height={PDF_H}>
          <PDFCover />
        </DCArtboard>
        <DCArtboard id="pdf-plan" label="Page 2 · Plan" width={PDF_W} height={PDF_H}>
          <PDFPlan />
        </DCArtboard>
        <DCArtboard id="pdf-spec" label="Page 3 · Spec & budget" width={PDF_W} height={PDF_H}>
          <PDFSpec />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
