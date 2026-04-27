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

Replace `ACTIVE_PORT` in all examples below with the port returned by `discovery_list_active_archicads`.

```python
# Step 0 — always do this first to get the active port
discovery_list_active_archicads()
# → returns e.g. port 19723 or 19724; use that value as ACTIVE_PORT throughout the session

# List all zones
archicad_call_tool(name="elements_get_elements_by_type", arguments={"port": ACTIVE_PORT, "params": {"elementType": "Zone"}})

# Get zone bounding boxes / details
archicad_call_tool(name="elements_get_element_bounding_boxes", arguments={"port": ACTIVE_PORT, "params": {"elements": [...guids...]}})

# Get zone properties (name, number, area)
archicad_call_tool(name="elements_get_element_properties", arguments={"port": ACTIVE_PORT, "params": {"elements": [...guids...], "propertyIds": [...]}})

# Get elements related to zones (doors + windows) — NOTE: timed out in previous session
archicad_call_tool(name="elements_get_elements_related_to_zones", arguments={"port": ACTIVE_PORT, "params": {"zones": [...], "elementTypes": ["Door", "Window"]}})
```

**When to use MCP vs HTTP:**
- **Interactive Claude Code sessions** → use `ArchicadTapir` MCP tools (`archicad_call_tool` etc.). These are available natively and are the preferred route when working interactively.
- **Python scripts** (`extract_mono_pitch.py` and any new scripts) → use direct HTTP calls to the Tapir JSON API (see Extraction Script section). The `archicad` package's `Types.ElementType` is broken; HTTP is the reliable alternative for scripted use.

The Tapir command names are identical in both approaches — only the call mechanism differs.

---

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
      {
        "step": 10,
        "grid_width_mm": 6100,
        "outer_width_mm": 6188,
        "outer_width_m": 6.188,
        "zones": {
          "bedroom_w": 2887,
          "bathroom_w": 1880,
          "living_w": 4059,
          "veranda_w": 3074
        }
      },
      {
        "step": 11,
        "grid_width_mm": 6710,
        "outer_width_mm": 6798,
        "outer_width_m": 6.798,
        "zones": {
          "bedroom_w": 2887,
          "bathroom_w": 1880,
          "living_w": 4669,
          "veranda_w": 3074
        }
      }
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

**`parametric.positions[n].zones` keys:** Each entry lists the **widths of every zone at that step**. The key names are snake_case zone type names suffixed with `_w` (e.g. `bedroom_w`, `living_w`, `bathroom_w`, `veranda_w`). For multi-bedroom variants, use `bedroom_1_w`, `bedroom_2_w`, etc. Fixed zones (bathroom, veranda) repeat the same value across all steps. Variable zones change value per phase.

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
- **Parametric steps: unknown — to be determined from the calculation template.** The studio is a single open-plan space so it likely has a very limited step range (possibly a single fixed size, or 1–2 steps). Check `Copy_Berend_of_Easy_Housing__Calculation_Template_2026.xlsx` for the Studio row before populating `parametric.min_step`, `max_step`, and `positions`.
- Veranda is fixed; the studio/living space is the parametric zone (stretch_axis: x)

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

**Note:** **A-Frame** is a distinct roof typology (steep triangular cross-section, different from all Gable variants). A-Frame Compact, Standard, and Large exist in the calculation template but are **not part of the standard catalogue** — do not extract these unless explicitly requested. The Compact Gable, Standard Gable, and Large Gable in the table above are separate typologies with a conventional gable roof form and are all in scope.

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

The `outputs/` path below refers to **`./outputs/` at the repo root** — a local folder used as a working drop zone during Claude Code sessions. Files there are not yet integrated into the main codebase; once validated they should be moved to their final location alongside `mono_pitch_1br_parametric.json`.

| File | Location | Purpose |
|------|----------|---------|
| `mono_pitch_1br_parametric.json` | repo root | Reference canonical JSON (complete) |
| `mono_pitch_studio_parametric.json` | `./outputs/` | Studio JSON (zones only, needs doors/windows + parametric steps) |
| `mono_pitch_2br_parametric.json` | `./outputs/` | 2BR JSON (zones only, needs doors/windows + parametric steps) |
| `mono_pitch_3br_parametric.json` | `./outputs/` | 3BR JSON (zones only, needs doors/windows + parametric steps) |
| `extract_mono_pitch.py` | `./outputs/` | Extraction script (needs fix — see above) |
| `260416__Overview_Typologies_for_Claude.xlsx` | `./project/` | Catalogue overview (typologies + bedroom counts) |
| `Copy_Berend_of_Easy_Housing__Calculation_Template_2026.xlsx` | `./project/` | Backend calculation template (parametric step data) |

---

## Suggested Next Steps for Claude Code

1. **Fix `extract_mono_pitch.py`** — replace `Types.ElementType` calls with direct Tapir HTTP requests (see workaround above)
2. **Re-run doors/windows extraction** for Studio, 2BR, 3BR via `elements_get_elements_related_to_zones` after a Tapir restart
3. **Open each remaining .pln file** in ArchiCAD 29 and run the zone extraction pipeline per typology
4. **Cross-reference the calculation template** to populate `parametric.positions` step arrays for each variant
5. **Validate all JSONs** against the 1BR reference structure before committing

---

## Performance & Timeout Troubleshooting

This section documents observed bottlenecks and the strategies that work around them. The file `250625 MonoPitch Homes BvD.pln` contains **5,671 elements total** — most calls become slow or time out if they are not scoped tightly before execution.

### Root causes of slowness

**1. Fetching all elements before filtering**
Calling `GetAllElements()` returns all 5,671 elements. Subsequent calls to `GetTypesOfElements()` on all 5,671 IDs is the first major bottleneck. Then requesting bounding boxes for all 5,671 at once caused a crash (`BoundingBox2DWrapper` error).

**2. `elements_get_elements_related_to_zones` with multiple zones**
This command timed out when called with 6+ zones and multiple element types in one request. It appears to do a spatial intersection check per zone per element type, which is expensive in larger files.

**3. Detail calls in batches of 5**
When door/object names could not be resolved any other way, 5-element batches of `elements_get_details_of_elements` were used. At 5 items per MCP round-trip this means 20–30 calls just to identify furniture in one zone.

---

### Rules for fast extraction

#### Rule 1 — Always filter by type before fetching anything else

```python
# GOOD — fetch only zones (22 elements)
archicad_call_tool("elements_get_elements_by_type", {"elementType": "Zone"})

# GOOD — fetch only walls (166 elements)
archicad_call_tool("elements_get_elements_by_type", {"elementType": "Wall"})

# BAD — returns 5671 elements then requires type filtering in a second pass
GetAllElements()
```

The file has: Wall 166, Door 17, Window 37, Zone 22, Object 1122. Always start from the type-filtered list.

#### Rule 2 — Batch bounding box calls at 20–50 elements, not all at once and not one at a time

```python
# GOOD — 20 elements per bounding box call
def fetch_bboxes_batched(guids, port, batch_size=20):
    results = {}
    for i in range(0, len(guids), batch_size):
        batch = guids[i:i+batch_size]
        r = archicad_call_tool("elements_get_element_bounding_boxes", {"elements": batch})
        results.update(parse_bbox_response(r))
    return results

# BAD — all 166 walls at once (may crash or time out)
archicad_call_tool("elements_get_element_bounding_boxes", {"elements": all_166_walls})

# BAD — 5 at a time for 37 windows = 8 separate round-trips
```

#### Rule 3 — Do NOT use `elements_get_elements_related_to_zones` for door/window discovery

This command timed out in testing. Instead, fetch doors and windows by type first, get their bounding boxes, then do a spatial overlap check in Python to assign them to zones:

```python
# Step 1 — get all doors as a type-filtered list (fast, 17 elements)
doors = archicad_call_tool("elements_get_elements_by_type", {"elementType": "Door"})

# Step 2 — get bounding boxes for all 17 doors in one call (fast, small list)
door_bboxes = archicad_call_tool("elements_get_element_bounding_boxes", {"elements": door_guids})

# Step 3 — spatial match in Python (no ArchiCAD call needed)
def assign_to_zone(element_bbox, zone_bboxes):
    for zone_id, zone_bbox in zone_bboxes.items():
        if overlaps(element_bbox, zone_bbox):
            return zone_id
    return None
```

#### Rule 4 — Get door/window details in one batch, not one at a time

```python
# GOOD — all 17 doors in a single call
archicad_call_tool("elements_get_details_of_elements", {"elements": all_17_door_guids})

# BAD — 5 at a time = 4 round-trips for 17 doors
```

For objects (1,122 elements), filter first by zone assignment (spatial match) before calling details. Never call details on all 1,122 objects.

#### Rule 5 — Restart Tapir between typologies

After a timeout, the Tapir MCP server can enter a degraded state where subsequent calls are slow even for small payloads. **Restart Tapir before starting each new `.pln` file.** In Claude Desktop: Settings → Developer → MCP Servers → restart Tapir. Alternatively, close and reopen ArchiCAD.

After restart the port may change (was 19724 before restart, 19723 after). Always call `discovery_list_active_archicads` after any restart.

#### Rule 6 — Extract one element type completely before moving to the next

Interleaving type queries adds overhead. The recommended call sequence per file is:

1. `discovery_list_active_archicads` → confirm port
2. `elements_get_elements_by_type` Zone → get all 22 zone GUIDs
3. `elements_get_element_bounding_boxes` (zones) → all in one call
4. `elements_get_element_properties` (zones) → names, areas
5. Cluster zones by X-gap in Python → no ArchiCAD call
6. `elements_get_elements_by_type` Wall → 166 GUIDs
7. `elements_get_element_bounding_boxes` (walls, batch 50) → 4 calls
8. `elements_get_elements_by_type` Door → 17 GUIDs
9. `elements_get_element_bounding_boxes` (doors) → 1 call
10. `elements_get_details_of_elements` (doors) → 1 call for all 17
11. `elements_get_elements_by_type` Window → 37 GUIDs
12. `elements_get_element_bounding_boxes` (windows) → 1–2 calls
13. `elements_get_details_of_elements` (windows) → 2 calls max
14. Spatial matching and JSON assembly in Python → no ArchiCAD calls

This order avoids all known timeout triggers and keeps the total ArchiCAD round-trips under 20 for a full Mono Pitch extraction.

---

#### Rule 7 — Ignore ArchiCAD layers entirely

Layers in the ArchiCAD file are **not a reliable classification signal** and should be ignored. Layer names vary between files, change during modelling, and do not consistently distinguish structural walls from partitions, facade cladding from structural skin, or furniture from equipment.

**Classify everything from geometry and spatial relationships instead:**

| What you need to know | How to determine it (not from layers) |
|-----------------------|---------------------------------------|
| Exterior vs partition wall | Thickness — see wall buildup table below |
| Which zone a wall belongs to | Spatial overlap: wall centre-line intersects or abuts zone bounding box |
| Door is interior vs exterior | Which wall it sits in (partition = interior; outer wall = exterior) |
| Furniture vs equipment | ArchiCAD object name prefix — extract the name string and match against known lists |
| Zone type (Bedroom, Bathroom, etc.) | Zone name string from `elements_get_element_properties` |

Never use layer name as a filter condition in any extraction script or MCP call.

**Wall buildup (inside → outside):**

| Wall type | Layers | Total thickness |
|-----------|--------|----------------|
| **Structural / facade / outer wall** | 12 mm plywood + 70 mm timber frame + 22 mm + 22 mm cladding | **126 mm** |
| **Partition wall** | 12 mm plywood + 70 mm timber stud + 12 mm plywood | **94 mm** |
| **Bathroom wet wall** (structural) | 126 mm outer wall + cement board layer on bathroom-facing side | **>126 mm** |
| **Bathroom wet wall** (partition) | 94 mm partition + cement board layer on bathroom-facing side | **>94 mm** |

**Grid line position:** The structural grid sits at the **outside face of the 70 mm frame** — i.e. 12 mm inward from the outer face of the frame, but 44 mm inward from the outermost face of the wall (22 + 22 mm cladding layers). This is why `wall_offset_mm = 44` in the JSON: it is the distance from the grid line to the outer wall face. `outer_width = grid_width + 2 × 44`.

When extracting bounding boxes, expect outer walls to measure ~126 mm thick and partitions ~94 mm thick. Walls thicker than 126 mm are bathroom wet walls (cement board added). Use these thresholds to classify, not layer names.

---


1. **Claude Desktop**: Settings → Developer → MCP Servers → find Tapir → restart/toggle
2. **Task Manager**: find the Python process running the Tapir MCP server, end it, relaunch from the original terminal
3. **Last resort**: close and reopen ArchiCAD 29 — this resets the JSON API server entirely

After restart, always verify with `discovery_list_active_archicads` before proceeding.

---


Understanding the physical building system is essential for correctly classifying elements extracted from ArchiCAD. All homes are prefabricated **FSC-certified pine timber** construction on prefab concrete or recycled plastic foundation blocks.

### Structure

The structural system is a **timber frame on a 610 mm bay grid**. Every parametric step = one additional bay. The frame sits on prefab concrete or recycled plastic blocks (300×300×300–600 mm) with stainless steel bolts. This is why `wall_offset_mm = 44` — it is the outer wall's half-thickness within the structural frame.

### Wall Types

| Wall type | Buildup (inside → outside) | Total thickness |
|-----------|----------------------------|----------------|
| **Structural / facade / outer wall** | 12 mm plywood + 70 mm timber frame + 22 mm + 22 mm shiplap cladding | 126 mm |
| **Partition wall** | 12 mm plywood + 70 mm timber stud + 12 mm plywood | 94 mm |
| **Bathroom wet wall** | Either outer or partition buildup + cement board on the bathroom-facing side | >126 mm or >94 mm |

The structural grid line sits at the **outside face of the 70 mm frame** — 44 mm inward from the outermost wall face (the 22 + 22 mm cladding layers). This is the meaning of `wall_offset_mm = 44` in the JSON.

Parametric behaviour: outer walls move with the envelope. Partition walls are anchored to a zone boundary and move with their zone during stretching. The bathroom wet wall is always fixed (the bathroom zone never stretches).

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

## Floor Plan Drawing Style

The configurator floor plan must visually match the ArchiCAD drawings used in the Easy Housing catalogue. The reference drawings are the authoritative style guide — all SVG/canvas rendering should aim to reproduce them as closely as possible. The catalogue PDF (`Easy_Housing__Catalogue_2026.pdf`) contains reference floor plans for every typology.

### Colours

| Element | Fill | Stroke |
|---------|------|--------|
| Habitable rooms (bedroom, living, kitchen) | `#C8B88A` (warm tan) | — |
| Bathroom / wet room | `#E0D9C8` (pale warm grey) | — |
| Veranda / porch | `#D6D0C0` (slightly cooler grey-tan) | — |
| Walls (all types) | `#1A1A1A` (near-black) | — |
| Furniture & equipment outlines | `#FFFFFF` fill, `#1A1A1A` stroke | 0.5–1 pt |
| Window glazing lines | `#1A1A1A` | 0.5 pt |
| Door arc | `#1A1A1A` | 0.5 pt |
| Background / exterior | `#FFFFFF` | — |
| Dimension lines | `#1A1A1A` | 0.5 pt |

The tan room fill is the dominant visual. Bathrooms are noticeably lighter. The veranda sits between the two. Do not use saturated colours anywhere in the floor plan itself.

### Wall rendering

Draw walls as filled black polygons, not as stroked centre-lines. The outer wall (126 mm) should read visibly heavier than partitions (94 mm) at any zoom level.

- **Outer wall**: full 126 mm thickness, filled solid `#1A1A1A`
- **Partition wall**: full 94 mm thickness, filled solid `#1A1A1A`
- **Bathroom wet wall**: same as the base wall type, plus an additional ~10 mm cement board layer on the bathroom-facing side rendered in `#888888` (mid grey)

Wall junctions (T-intersections, corners) should be mitered cleanly — no gaps or overlaps at corners.

### Doors

Draw every door as two elements:

1. **Door leaf**: thin rectangle spanning the opening width, thickness ~20 mm, fill `#FFFFFF`, stroke `#1A1A1A` at 0.5 pt
2. **Swing arc**: quarter-circle arc from the hinge point, radius = opening width, stroke `#1A1A1A` at 0.5 pt, no fill

Hinge point and swing direction come from `hinge_local_mm`, `swing_from_deg`, `swing_to_deg` in the JSON. Exterior doors: door leaf slightly thicker (~30 mm) to suggest the aluminium frame.

### Windows

Draw every window as three parallel lines spanning the full wall thickness:

- Two outer lines flush with the wall faces (the frame jambs), stroke `#1A1A1A` at 1 pt
- One centre line (the glazing), stroke `#1A1A1A` at 0.5 pt

Window labels (W1, W2…) in ~7 pt, placed just outside the wall at the window midpoint.

### Furniture & equipment shapes

All furniture drawn as simple 2D plan-view outlines — `#FFFFFF` fill, thin `#1A1A1A` stroke. No hatching, gradients, or shadows.

| Object | Plan-view shape |
|--------|----------------|
| Single bed | Rectangle (~900×2000 mm) with a filled semicircle on the headboard end (pillow) |
| Double bed | Rectangle (~1400×2000 mm) with two adjacent filled semicircles on the headboard end |
| Wardrobe | Rectangle with two diagonal crossing lines inside (sliding door symbol) |
| Nightstand | Small square |
| Dining table | Oval or rounded rectangle |
| Dining chairs | Circles (~450 mm ø) arranged around the table |
| Sofa (2-seat) | Rectangle with a thin back line along one long edge |
| Armchair | Smaller rectangle with a thin back line |
| Coffee table | Small rectangle or oval |
| WC / toilet | D-shape: rectangle with rounded front, oval seat inside |
| Shower cabin | Square with small showerhead circle in one corner |
| Washbasin / sink | Rounded rectangle with a small circle drain |
| Kitchen sink | Rectangle subdivided into one or two basins, each with a small circle drain |
| Stove / hob | Square with 4 small circles as burners |
| Fridge | Rectangle labelled **F** |
| Washing machine | Square labelled **W** |
| TV | Thin rectangle |
| TV stand | Slightly wider rectangle behind the TV |
| Mirror | Very thin rectangle flush with the wall |
| Kitchen base cabinet | Plain rectangle |
| Kitchen wall cabinet | Same rectangle with dashed outline (overhead = not at floor level) |
| Bistro / side chair | Circle (~380 mm ø) |
| Bistro table | Small circle or square |

### Labels

Zone labels centred within their zone fill:

```
Bedroom
12 m²
```

- Font: sans-serif (Inter or similar)
- Zone name: ~10 pt regular
- Area: ~9 pt regular, line below the name
- Colour: `#1A1A1A`

Fridge and washing machine are labelled **F** and **W** inside their rectangle — no separate label needed.

### Dimension lines

Shown above and to the left of the plan only (overall width and depth — not individual zone widths):

- Thin line with tick-mark end stops, `#1A1A1A`, 0.5 pt
- Value in metres to 3 decimal places (e.g. `7.413`) centred above the line

### Scale bar

Bottom-right, alternating filled/empty segments of 1 m each, range 0–3 m, small text at 0, 1, 2, 3.

### What to omit

Do not render: roof structure, foundation blocks, electrical/plumbing runs, section cut markers, north arrow, structural grid lines, ArchiCAD annotation objects.

---

## Notes on Working Style

- Always call `discovery_list_active_archicads` at the start of each session — the port is not guaranteed to be 19723
- Cluster zones by X-gap of >1000 mm to separate variants within a single file
- Normalise all coordinates to (0, 0) origin after clustering
- When Tapir calls time out, build JSONs from the zone data already extracted and mark doors/windows as `TODO`
- The `stretch_axis`, `stretch_phase`, and `anchor` fields on zones must be filled in from the calculation template logic — ArchiCAD does not expose these directly
