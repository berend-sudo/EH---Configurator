# DXF coverage / gap report

_Generated from `src/lib/typologies.ts` against the live contents of_
_`public/floorplans/`. Scheme: `EH_<TYP>[-<SUB>]_<BR>BR_v<n>.dxf`._
_Bedroom range per row is `[minBedrooms(selection) .. 4]`._

## Present inventory (16 on disk)

| typology | subtype | bedrooms | file on disk |
|---|---|---|---|
| Monopitch | — | 0 | `EH_MNP_0BR_v6.dxf` |
| Monopitch | — | 1 | `EH_MNP_1BR_v1.dxf` |
| Monopitch | — | 2 | `EH_MNP_2BR_v3.dxf` |
| Monopitch | — | 3 | `EH_MNP_3BR_v1.dxf` |
| Gable | Compact | 1 | `EH_GBL-CMP_1BR_v2.dxf` |
| Gable | Compact | 2 | `EH_GBL-CMP_2BR_v1.dxf` |
| Gable | Compact | 3 | `EH_GBL-CMP_3BR_v1.dxf` |
| Gable | Standard | 2 | `EH_GBL-STD_2BR_v1.dxf` |
| Gable | Standard | 3 | `EH_GBL-STD_3BR_v1.dxf` |
| Gable | Standard | 4 | `EH_GBL-STD_4BR_v1.dxf` |
| Gable | Large | 3 | `EH_GBL-LRG_3BR_v1.dxf` |
| A-frame | Small | 0 | `EH_AFR-SML_0BR_v1.dxf` |
| A-frame | Normal | 0 | `EH_AFR-NML_0BR_v1.dxf` |
| A-frame | Large | 1 | `EH_AFR-LRG_1BR_v1.dxf` |
| Clerestory | Large | 2 | `EH_CLR-LRG_2BR_v1.dxf` |
| Clerestory | Large | 4 | `EH_CLR-LRG_4BR_v1.dxf` |

## Coverage matrix

| typology | subtype | bedrooms | expected (v1) | on disk? |
|---|---|---|---|---|
| Monopitch | — | 0 | `EH_MNP_0BR_v1.dxf` | yes (`EH_MNP_0BR_v6.dxf`) |
| Monopitch | — | 1 | `EH_MNP_1BR_v1.dxf` | yes (`EH_MNP_1BR_v1.dxf`) |
| Monopitch | — | 2 | `EH_MNP_2BR_v1.dxf` | yes (`EH_MNP_2BR_v3.dxf`) |
| Monopitch | — | 3 | `EH_MNP_3BR_v1.dxf` | yes (`EH_MNP_3BR_v1.dxf`) |
| Monopitch | — | 4 | `EH_MNP_4BR_v1.dxf` | **MISSING** |
| Gable | Small | 1 | `EH_GBL-SML_1BR_v1.dxf` | **MISSING** |
| Gable | Small | 2 | `EH_GBL-SML_2BR_v1.dxf` | **MISSING** |
| Gable | Small | 3 | `EH_GBL-SML_3BR_v1.dxf` | **MISSING** |
| Gable | Small | 4 | `EH_GBL-SML_4BR_v1.dxf` | **MISSING** |
| Gable | Compact | 1 | `EH_GBL-CMP_1BR_v1.dxf` | yes (`EH_GBL-CMP_1BR_v2.dxf`) |
| Gable | Compact | 2 | `EH_GBL-CMP_2BR_v1.dxf` | yes (`EH_GBL-CMP_2BR_v1.dxf`) |
| Gable | Compact | 3 | `EH_GBL-CMP_3BR_v1.dxf` | yes (`EH_GBL-CMP_3BR_v1.dxf`) |
| Gable | Compact | 4 | `EH_GBL-CMP_4BR_v1.dxf` | **MISSING** |
| Gable | Standard | 1 | `EH_GBL-STD_1BR_v1.dxf` | **MISSING** |
| Gable | Standard | 2 | `EH_GBL-STD_2BR_v1.dxf` | yes (`EH_GBL-STD_2BR_v1.dxf`) |
| Gable | Standard | 3 | `EH_GBL-STD_3BR_v1.dxf` | yes (`EH_GBL-STD_3BR_v1.dxf`) |
| Gable | Standard | 4 | `EH_GBL-STD_4BR_v1.dxf` | yes (`EH_GBL-STD_4BR_v1.dxf`) |
| Gable | Large | 1 | `EH_GBL-LRG_1BR_v1.dxf` | **MISSING** |
| Gable | Large | 2 | `EH_GBL-LRG_2BR_v1.dxf` | **MISSING** |
| Gable | Large | 3 | `EH_GBL-LRG_3BR_v1.dxf` | yes (`EH_GBL-LRG_3BR_v1.dxf`) |
| Gable | Large | 4 | `EH_GBL-LRG_4BR_v1.dxf` | **MISSING** |
| A-frame | Small | 0 | `EH_AFR-SML_0BR_v1.dxf` | yes (`EH_AFR-SML_0BR_v1.dxf`) |
| A-frame | Small | 1 | `EH_AFR-SML_1BR_v1.dxf` | **MISSING** |
| A-frame | Small | 2 | `EH_AFR-SML_2BR_v1.dxf` | **MISSING** |
| A-frame | Small | 3 | `EH_AFR-SML_3BR_v1.dxf` | **MISSING** |
| A-frame | Small | 4 | `EH_AFR-SML_4BR_v1.dxf` | **MISSING** |
| A-frame | Normal | 0 | `EH_AFR-NML_0BR_v1.dxf` | yes (`EH_AFR-NML_0BR_v1.dxf`) |
| A-frame | Normal | 1 | `EH_AFR-NML_1BR_v1.dxf` | **MISSING** |
| A-frame | Normal | 2 | `EH_AFR-NML_2BR_v1.dxf` | **MISSING** |
| A-frame | Normal | 3 | `EH_AFR-NML_3BR_v1.dxf` | **MISSING** |
| A-frame | Normal | 4 | `EH_AFR-NML_4BR_v1.dxf` | **MISSING** |
| A-frame | Large | 1 | `EH_AFR-LRG_1BR_v1.dxf` | yes (`EH_AFR-LRG_1BR_v1.dxf`) |
| A-frame | Large | 2 | `EH_AFR-LRG_2BR_v1.dxf` | **MISSING** |
| A-frame | Large | 3 | `EH_AFR-LRG_3BR_v1.dxf` | **MISSING** |
| A-frame | Large | 4 | `EH_AFR-LRG_4BR_v1.dxf` | **MISSING** |
| Clerestory | Standard | 1 | `EH_CLR-STD_1BR_v1.dxf` | **MISSING** |
| Clerestory | Standard | 2 | `EH_CLR-STD_2BR_v1.dxf` | **MISSING** |
| Clerestory | Standard | 3 | `EH_CLR-STD_3BR_v1.dxf` | **MISSING** |
| Clerestory | Standard | 4 | `EH_CLR-STD_4BR_v1.dxf` | **MISSING** |
| Clerestory | Large | 1 | `EH_CLR-LRG_1BR_v1.dxf` | **MISSING** |
| Clerestory | Large | 2 | `EH_CLR-LRG_2BR_v1.dxf` | yes (`EH_CLR-LRG_2BR_v1.dxf`) |
| Clerestory | Large | 3 | `EH_CLR-LRG_3BR_v1.dxf` | **MISSING** |
| Clerestory | Large | 4 | `EH_CLR-LRG_4BR_v1.dxf` | yes (`EH_CLR-LRG_4BR_v1.dxf`) |

**Summary: 16 present, 27 missing of 43 combinations.**

### Missing DXFs the architects still need to produce

- `EH_MNP_4BR_v1.dxf`  _(Monopitch —, 4BR)_
- `EH_GBL-SML_1BR_v1.dxf`  _(Gable Small, 1BR)_
- `EH_GBL-SML_2BR_v1.dxf`  _(Gable Small, 2BR)_
- `EH_GBL-SML_3BR_v1.dxf`  _(Gable Small, 3BR)_
- `EH_GBL-SML_4BR_v1.dxf`  _(Gable Small, 4BR)_
- `EH_GBL-CMP_4BR_v1.dxf`  _(Gable Compact, 4BR)_
- `EH_GBL-STD_1BR_v1.dxf`  _(Gable Standard, 1BR)_
- `EH_GBL-LRG_1BR_v1.dxf`  _(Gable Large, 1BR)_
- `EH_GBL-LRG_2BR_v1.dxf`  _(Gable Large, 2BR)_
- `EH_GBL-LRG_4BR_v1.dxf`  _(Gable Large, 4BR)_
- `EH_AFR-SML_1BR_v1.dxf`  _(A-frame Small, 1BR)_
- `EH_AFR-SML_2BR_v1.dxf`  _(A-frame Small, 2BR)_
- `EH_AFR-SML_3BR_v1.dxf`  _(A-frame Small, 3BR)_
- `EH_AFR-SML_4BR_v1.dxf`  _(A-frame Small, 4BR)_
- `EH_AFR-NML_1BR_v1.dxf`  _(A-frame Normal, 1BR)_
- `EH_AFR-NML_2BR_v1.dxf`  _(A-frame Normal, 2BR)_
- `EH_AFR-NML_3BR_v1.dxf`  _(A-frame Normal, 3BR)_
- `EH_AFR-NML_4BR_v1.dxf`  _(A-frame Normal, 4BR)_
- `EH_AFR-LRG_2BR_v1.dxf`  _(A-frame Large, 2BR)_
- `EH_AFR-LRG_3BR_v1.dxf`  _(A-frame Large, 3BR)_
- `EH_AFR-LRG_4BR_v1.dxf`  _(A-frame Large, 4BR)_
- `EH_CLR-STD_1BR_v1.dxf`  _(Clerestory Standard, 1BR)_
- `EH_CLR-STD_2BR_v1.dxf`  _(Clerestory Standard, 2BR)_
- `EH_CLR-STD_3BR_v1.dxf`  _(Clerestory Standard, 3BR)_
- `EH_CLR-STD_4BR_v1.dxf`  _(Clerestory Standard, 4BR)_
- `EH_CLR-LRG_1BR_v1.dxf`  _(Clerestory Large, 1BR)_
- `EH_CLR-LRG_3BR_v1.dxf`  _(Clerestory Large, 3BR)_

### Notes

- Mezzanine: `EH_AFR-LRG_1BR_v1.dxf` is the only plan carrying a `Rooms$Mezzanine` layer.
- Gable **Small** and Clerestory **Standard** are defined in `TYPOLOGIES` but have no DXF on disk, so the picker hides them (see `availableSubtypes`). Dropping a correctly-named DXF re-enables them automatically.
- Where a present file's version differs from the `v1` canonical name (e.g. `_v2`, `_v3`, `_v6`), the scan keys on `(typology, subtype, bedrooms)` and serves the highest version.
