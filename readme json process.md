# CLAUDE.md — Easy Housing: ArchiCAD Parametric JSON Extraction

This file gives Claude Code the full context needed to continue the ArchiCAD → parametric JSON extraction pipeline for the **Easy Housing** prefabricated modular housing project.

---

## Project Overview

**Easy Housing** is a prefabricated timber housing product line aimed at the East African (Uganda) market. The product catalogue consists of ~15 housing models across five architectural typologies, each with multiple bedroom variants that can be configured via a parametric width slider (snapping to 610 mm structural bay steps).

The goal of this codebase is to **extract geometric and element data from ArchiCAD .pln files** and output **parametric JSON files** — one per housing variant — that drive a web-based configurator.

---

## Environment

| Item | Detail |
|------|--------|
| OS | Windows 10 (Version 10.0.26200) |
| ArchiCAD | Version 29, running on port **19723** (default) or **19724** (observed in session) |
| Python | 3.14 (path: `C:\Users\beren\AppData\Local\Python\pythoncore-3.14-64\python.exe`) |
| archicad package | `archicad-29.3000` (installed via pip) |
| Tapir MCP | Tapir ArchiCAD Automation — exposes all Tapir + AC JSON API commands via MCP |
| ArchiCAD file | `250625 MonoPitch Homes BvD.pln` (Mono Pitch typology; other typologies in separate .pln files) |

---

## Known API Issue — Do Not Use `Types.ElementType`

The `archicad` Python package's `Types.ElementType` attribute raises:

```
'Types' object has no attribute 'ElementType'
```

**Workaround:** Call Tapir's HTTP JSON API directly, or use MCP tools. The correct approach is:

```python
# WRONG — do not use this
acc.GetAllElements()
acc.GetElementsByType(Types.ElementType.Wall)

# CORRECT — use Tapir commands via HTTP or MCP
# Tapir command: elements_get_elements_by_type
# Params: { "elementType": "Zone" }  (or "Wall", "Door", "Window", "Object")
```

When using the `archicad` Python package, connect as follows:

```python
from archicad import ACConnection
conn = ACConnection.connect(port=19723)  # or 19724
acc = conn.acc
```

But prefer the **Tapir MCP** (available as `ArchicadTapir` tools in Claude Code) for all element queries.

---

## Tapir MCP Tools Available

Three tools are available via the `ArchicadTapir` MCP server:

| Tool | Purpose |
|------|---------|
| `ArchicadTapir:discovery_list_active_archicads` | Find running AC instances and their ports |
| `ArchicadTapir:archicad_discover_tools` | Semantic search over all 137 Tapir commands |
| `ArchicadTapir:archicad_call_tool` | Execute any Tapir command by name |

**Key Tapir commands used so far:**

```python
# List all zones
archicad_call_tool(name="elements_get_elements_by_type", arguments={"port": 19724, "params": {"elementType": "Zone"}})

# Get zone bounding boxes / details
archicad_call_tool(name="elements_get_element_bounding_boxes", arguments={"port": 19724, "params": {"elements": [...guids...]}})

# Get zone properties (name, number, area)
archicad_call_tool(name="elements_get_element_properties", arguments={"port": 19724, "params": {"elements": [...guids...], "propertyIds": [...]}})

# Get elements related to zones (doors + windows) — NOTE: timed out in previous session
archicad_call_tool(name="elements_get_elements_related_to_zones", arguments={"port": 19724, "params": {"zones": [...], "elementTypes": ["Door", "Window"]}})
```

**Tip:** Always call `discovery_list_active_archicads` first to confirm the active port. The port can vary between sessions.

---

## Target JSON Structure

Every variant produces one parametric JSON file. The canonical reference is `mono_pitch_1br_parametric.json`. Its structure:

```json
{
  "meta": {
    "unit_type": "Mono Pitch 1BR",
    "source": "filename.pln",
    "units": "mm",
    "origin": "outer bottom-left corner of unit footprint",
    "coord_system": "X = right (width), Y = up (depth)"
  },
  "envelope": {
    "grid_depth_mm": 4884,
    "outer_depth_mm": 4972,
    "wall_offset_mm": 44,
    "note": "depth is fixed for all Mono Pitch typologies"
  },
  "parametric": {
    "step_mm": 610,
    "min_step": 10,
    "max_step": 14,
    "base_step": 10,
    "note_on_steps": "slider snaps to discrete steps. 1 step = one 610mm structural bay.",
    "phase_1": {
      "steps": "10 → 12",
      "rule": "living room grows +610mm per step, bedroom fixed",
      "living_cap_mm": 4800
    },
    "phase_2": {
      "steps": "13 → 14",
      "rule": "bedroom grows +610mm per step, living locked at 4800mm"
    },
    "fixed_zones": {
      "bathroom_w_mm": 1880,
      "veranda_w_mm": 3074,
      "veranda_h_mm": 1221
    },
    "positions": [
      { "step": 10, "grid_width_mm": 6100, "outer_width_mm": 6188, "zones": { ... } }
    ]
  },
  "zones_at_base": [
    {
      "id": "zone_bedroom",
      "type": "Bedroom",
      "x": 0, "y": 105, "w": 2887, "h": 3005,
      "area_m2": 8.68,
      "stretch_axis": "x",
      "stretch_phase": 2,
      "anchor": "left"
    }
  ],
  "doors": [
    { "id": "Door with Transom 26", "swing_radius_mm": 870, "swing_from_deg": 90, "swing_to_deg": 180, "hinge_local_mm": [435, 0] }
  ],
  "windows": [
    { "id": "Window 26" }
  ],
  "furniture": [
    { "id": "Wardrobe 01 26", "category": "furniture", "zone": "Bedroom", "x": 2337, "y": 1329, "rotation_deg": 270, "anchor": "right_wall" }
  ]
}
```

**Important geometry conventions:**
- All coordinates in **mm**, origin at outer bottom-left of the unit footprint
- `X` = right (width axis), `Y` = up (depth axis)
- `wall_offset_mm = 44` — outer wall half-thickness; `grid_width = outer_width - 2 × 44`
- Zone `x, y` = inner bottom-left of zone bounding box
- Zone `w, h` = inner width and height

---

## Completed Work

### Mono Pitch typology — `250625 MonoPitch Homes BvD.pln`

All four variants are extracted. 22 zones were pulled and clustered by X-gap (>1000 mm = new variant).

| File | Status |
|------|--------|
| `mono_pitch_1br_parametric.json` | ✅ Complete (incl. doors, windows, furniture) |
| `mono_pitch_studio_parametric.json` | ✅ Zones complete — doors/windows TODO |
| `mono_pitch_2br_parametric.json` | ✅ Zones complete — doors/windows TODO |
| `mono_pitch_3br_parametric.json` | ✅ Zones complete — doors/windows TODO |

**Finding from extraction:** The file contained **two instances of the 1BR** at different parametric steps (outer width 6.04 m = step 10; 7.26 m ≈ step 12), confirming the sliding-width model works as designed.

### Zone layout summaries (Mono Pitch)

**Studio** (outer W = 4.82 m, D = 4.82 m)
- Single open-plan room + bathroom nook + veranda (1784 mm wide)
- Veranda is fixed; studio space is the parametric zone

**1BR** (base outer W = 6.19 m, range steps 10–14)
- Layout: `[Bed1 | Bath] [Living (stretches phase 1)] [Veranda (fixed, anchored right)]`
- Phase 1 (steps 10–12): living grows; Phase 2 (steps 13–14): bedroom grows

**2BR** (outer W = 8.58 m)
- Layout: `[Bed1+Bath left block] [Bed2 partitions left of Living] [Veranda fixed right]`

**3BR** (outer W = 9.08 m)
- Layout: `[Bed1+Bath left] [Living centre] [Bed2+Bed3 stacked vertically on right]`

---

## Remaining Work

### 1. Fill in doors & windows for Studio, 2BR, 3BR

The `elements_get_elements_related_to_zones` Tapir call timed out in the previous session. To retry:

1. Restart the Tapir MCP server (or reopen ArchiCAD)
2. Call `discovery_list_active_archicads` to confirm the port
3. Run `elements_get_elements_by_type` with `"Door"` and `"Window"` separately
4. Match doors/windows to zones by spatial overlap (compare bounding boxes)
5. For doors: extract swing radius and hinge position from element details
6. Fill the `"doors"` and `"windows"` arrays in each JSON

### 2. Extract all remaining typologies

Each typology is a separate `.pln` file. Open each in ArchiCAD 29, then run the same zone extraction pipeline.

| Typology | Variants | Status |
|----------|----------|--------|
| Mono Pitch | Studio, 1BR, 2BR, 3BR | ✅ Zones done |
| Compact Gable | 1BR, 2BR, 2BR Comfort, 3BR, 4BR | ❌ Not started |
| Standard Gable | 2BR, 3BR, 4BR | ❌ Not started |
| Large Gable | 3BR | ❌ Not started |
| Clerestory | 2BR, 4BR | ❌ Not started |

**Note:** A-Frame variants (Compact, Standard, Large) exist in the calculation template but are **not part of the standard catalogue** — do not extract these unless explicitly requested.

### 3. Add parametric step data to Studio, 2BR, 3BR JSONs

The `parametric.positions` array (listing zone widths per step) needs to be populated from the calculation template (`Copy_Berend_of_Easy_Housing__Calculation_Template_2026.xlsx`). The 1BR JSON is the reference for how this block should look.

---

## Extraction Script

The Python extraction script `extract_mono_pitch.py` was written in session 1. It:
- Connects to ArchiCAD 29 on port 19723 via the `archicad` package
- Fetches all zones, walls, doors, windows, objects
- Clusters them by horizontal X-gap (>1000 mm = new variant)
- Normalises each cluster to origin (0, 0)
- Outputs one JSON per cluster matching the parametric JSON structure

**Known issue:** The script's `GetElementsByType` calls fail with `'Types' object has no attribute 'ElementType'`. This needs to be fixed by switching to Tapir HTTP calls instead of the archicad package's type system.

**Recommended fix:**

```python
import requests, json

def tapir_call(command, params, port=19723):
    url = f"http://localhost:{port}/tapir/{command}"
    r = requests.post(url, json={"parameters": params})
    return r.json()

zones_response = tapir_call("elements_get_elements_by_type", {"elementType": "Zone"})
```

---

## Project Files

| File | Location | Purpose |
|------|----------|---------|
| `mono_pitch_1br_parametric.json` | repo root / project | Reference canonical JSON (complete) |
| `mono_pitch_studio_parametric.json` | outputs | Studio JSON (zones only) |
| `mono_pitch_2br_parametric.json` | outputs | 2BR JSON (zones only) |
| `mono_pitch_3br_parametric.json` | outputs | 3BR JSON (zones only) |
| `extract_mono_pitch.py` | outputs | Extraction script (needs fix — see above) |
| `260416__Overview_Typologies_for_Claude.xlsx` | `/mnt/project/` | Catalogue overview (typologies + bedroom counts) |
| `Copy_Berend_of_Easy_Housing__Calculation_Template_2026.xlsx` | `/mnt/project/` | Backend calculation template (parametric step data) |

---

## Suggested Next Steps for Claude Code

1. **Fix `extract_mono_pitch.py`** — replace `Types.ElementType` calls with direct Tapir HTTP requests (see workaround above)
2. **Re-run doors/windows extraction** for Studio, 2BR, 3BR via `elements_get_elements_related_to_zones` after a Tapir restart
3. **Open each remaining .pln file** in ArchiCAD 29 and run the zone extraction pipeline per typology
4. **Cross-reference the calculation template** to populate `parametric.positions` step arrays for each variant
5. **Validate all JSONs** against the 1BR reference structure before committing

---

## Building System & Materials Reference

Understanding the physical building system is essential for correctly classifying elements extracted from ArchiCAD. All homes are prefabricated **FSC-certified pine timber** construction on prefab concrete or recycled plastic foundation blocks.

### Structure

The structural system is a **timber frame on a 610 mm bay grid**. Every parametric step = one additional bay. The frame sits on prefab concrete or recycled plastic blocks (300×300×300–600 mm) with stainless steel bolts. This is why `wall_offset_mm = 44` — it is the outer wall's half-thickness within the structural frame.

### Wall Types

| Wall type | Role | Parametric behaviour |
|-----------|------|----------------------|
| **Structural / exterior walls** | Load-bearing perimeter frame | Moves with the envelope; defines `outer_width` and `outer_depth` |
| **Partition walls** | Internal room dividers (non-structural) | Anchored to a zone boundary; move with their zone during stretching |
| **Bathroom wet wall** | Partition between bathroom and adjacent room | Fixed — bathroom never stretches |

Interior wall finishing: **12 mm pine plywood**. Ceiling: **9 mm pine plywood** at 260–386 cm height.

### Facade

The facade is **vertical 22×96 mm pine planks with a shiplap profile**, varnished or painted (colour is a customer choice). The facade sits outside the structural frame — it is cosmetic, not load-bearing, and does not affect zone dimensions. When extracting facade elements from ArchiCAD, treat them as envelope decoration, not as zone boundaries.

Additional facade options (extra cost, customer-selectable): bigger windows, sliding/terrace doors, different colour schemes.

### Floor

**22×96 mm tongue-and-groove pine floor planks**, varnished or oiled. Terrace/veranda decking: same plank profile, linseed oiled. Floor finishing is interior only — the veranda is treated as decking.

### Bathroom Finishing

The bathroom has a specific layered construction relevant to element classification:

1. **Structure**: standard pine timber frame (same as the rest of the house)
2. **Wet wall substrate**: cement board (tiling substrate) on the shower wall and toilet wall — *not* on all walls. This is because tiles cannot adhere directly to timber.
3. **Tiling**: not included in the base price — customer tiles over the cement board themselves
4. **Equipment included in base price**: plumbing pipes, WC rough-in, shower connections, sewerage to manhole. Sanitary wares (WC pan, basin, shower fittings) are **extra cost**.

In the JSON, bathroom equipment objects (`WC 26`, `Shower Cabin 26`, `Multi-Basin Counter 26`, `Mirror 26`) are tagged `"category": "equipment"`. These represent the ArchiCAD model objects placed for spatial coordination — not necessarily what is physically supplied.

### Doors

Two door types exist in the system:

| Type | Spec | JSON classification |
|------|------|---------------------|
| **Exterior / front door** | Black aluminium frame (default), with lock and grip; burglar bars optional | Extracted as door element, placed on exterior wall |
| **Interior doors** | Standard timber door 90×215 cm with a **transom window above** (hence `"Door with Transom 26"` in ArchiCAD) | Extracted as door element, placed on partition wall |

Door data captured in JSON: `swing_radius_mm`, `swing_from_deg`, `swing_to_deg`, `hinge_local_mm`. Swing angles are needed by the configurator to draw the door arc in plan view.

### Windows

**Aluminium frames** with hinges, locks, and insect screens included as standard. Burglar bars are an optional extra cost item. Window sizes can be increased as an upgrade option (larger aluminium frame, same system).

In the current JSON the `"windows"` array only stores element IDs — width, sill height, and position still need to be extracted from ArchiCAD and added.

### Furniture (ArchiCAD objects)

Furniture in the ArchiCAD model is **illustrative / for spatial validation** — it is not supplied by Easy Housing (furniture is explicitly excluded from the price). It exists to verify room layouts work at each parametric step.

Two categories appear in the JSON:

- `"category": "furniture"` — movable items (wardrobe, nightstand, TV stand, chairs, tables, fridge, cabinets)
- `"category": "equipment"` — fixed/built-in items tied to services (WC, shower, basin counter, mirror, hood)

The `anchor` field (`"left_wall"`, `"right_wall"`, `"top_wall"`) tells the configurator which wall a piece is pinned to so it repositions correctly when the zone stretches.

### Veranda

The veranda is a **semi-open covered outdoor space** at the front of the unit. It uses the same decking plank specification as terrace areas. It is always **fixed in size** (never parametrically stretched) and anchored to the right exterior wall. Verandas are listed as an extra-cost option in the price list — so the base unit footprint excludes the veranda cost, even though it appears in the ArchiCAD model.

Additional veranda upgrades: pergola, railings, sliding door connection to interior.

### Roof

**Iron sheets, box profile, gauge 28**, in a customer-chosen colour. Rain gutters (PVC) with downpipes are included. The roof structure is closed against birds/bats; ventilation openings have mosquito screens.

### Electricals & Plumbing (for context)

Both are included in the base price at standard fixture counts. The electrical installation covers wiring, light points (fittings only, not bulbs), switches, sockets, and a distribution board with capacity for a washing machine. Empty conduit runs to the roof are included for future solar PV. Plumbing covers all water and sewerage piping up to the external manhole — not the septic tank.

These systems do not appear as geometric elements in the parametric JSON but are relevant background for understanding why bathroom zone placement and kitchen zone placement matter.

---

## Notes on Working Style

- Always call `discovery_list_active_archicads` at the start of each session — the port is not guaranteed to be 19723
- Cluster zones by X-gap of >1000 mm to separate variants within a single file
- Normalise all coordinates to (0, 0) origin after clustering
- When Tapir calls time out, build JSONs from the zone data already extracted and mark doors/windows as `TODO`
- The `stretch_axis`, `stretch_phase`, and `anchor` fields on zones must be filled in from the calculation template logic — ArchiCAD does not expose these directly
