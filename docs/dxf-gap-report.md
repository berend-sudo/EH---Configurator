# DXF rename plan & gap report

_Generated from src/lib/typologies.ts. Scheme: `EH_<TYP>[-<SUB>]_<BR>BR_v<n>.dxf`._

## A. Rename plan (served plans in public/floorplans/)

| old name | → new name |
|---|---|
| `Monopitch - Studio v6.dxf` | `EH_MNP_0BR_v6.dxf` |
| `Monopitch - 1BR.dxf` | `EH_MNP_1BR_v1.dxf` |
| `Monopitch - 2BR v3.dxf` | `EH_MNP_2BR_v3.dxf` |
| `Monopitch - 3BR.dxf` | `EH_MNP_3BR_v1.dxf` |

## A2. Other DXFs in the repo (root-level, not served)

| file | classification | suggested new name |
|---|---|---|
| `Monopitch - Studio v4.dxf` | root-level archive (not served by the app) | `EH_MNP_0BR_v4.dxf` |
| `Monopitch - Studio v5.dxf` | root-level archive (not served by the app) | `EH_MNP_0BR_v5.dxf` |

**Unclassifiable (manual review — not floor plans):**

- `Furniture.dxf` — furniture overlay block — not a typology floor plan
- `Furniture v2.dxf` — furniture overlay block — not a typology floor plan

## B. Coverage / gap report

For every `{typology, subtype, bedrooms in [minBedrooms..4]}` triple:

| typology | subtype | bedrooms | expected filename | exists? |
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
| Gable | Compact | 1 | `EH_GBL-CMP_1BR_v1.dxf` | **MISSING** |
| Gable | Compact | 2 | `EH_GBL-CMP_2BR_v1.dxf` | **MISSING** |
| Gable | Compact | 3 | `EH_GBL-CMP_3BR_v1.dxf` | **MISSING** |
| Gable | Compact | 4 | `EH_GBL-CMP_4BR_v1.dxf` | **MISSING** |
| Gable | Standard | 1 | `EH_GBL-STD_1BR_v1.dxf` | **MISSING** |
| Gable | Standard | 2 | `EH_GBL-STD_2BR_v1.dxf` | **MISSING** |
| Gable | Standard | 3 | `EH_GBL-STD_3BR_v1.dxf` | **MISSING** |
| Gable | Standard | 4 | `EH_GBL-STD_4BR_v1.dxf` | **MISSING** |
| Gable | Large | 1 | `EH_GBL-LRG_1BR_v1.dxf` | **MISSING** |
| Gable | Large | 2 | `EH_GBL-LRG_2BR_v1.dxf` | **MISSING** |
| Gable | Large | 3 | `EH_GBL-LRG_3BR_v1.dxf` | **MISSING** |
| Gable | Large | 4 | `EH_GBL-LRG_4BR_v1.dxf` | **MISSING** |
| A-frame | Small | 1 | `EH_AFR-SML_1BR_v1.dxf` | **MISSING** |
| A-frame | Small | 2 | `EH_AFR-SML_2BR_v1.dxf` | **MISSING** |
| A-frame | Small | 3 | `EH_AFR-SML_3BR_v1.dxf` | **MISSING** |
| A-frame | Small | 4 | `EH_AFR-SML_4BR_v1.dxf` | **MISSING** |
| A-frame | Normal | 1 | `EH_AFR-NML_1BR_v1.dxf` | **MISSING** |
| A-frame | Normal | 2 | `EH_AFR-NML_2BR_v1.dxf` | **MISSING** |
| A-frame | Normal | 3 | `EH_AFR-NML_3BR_v1.dxf` | **MISSING** |
| A-frame | Normal | 4 | `EH_AFR-NML_4BR_v1.dxf` | **MISSING** |
| A-frame | Large | 1 | `EH_AFR-LRG_1BR_v1.dxf` | **MISSING** |
| A-frame | Large | 2 | `EH_AFR-LRG_2BR_v1.dxf` | **MISSING** |
| A-frame | Large | 3 | `EH_AFR-LRG_3BR_v1.dxf` | **MISSING** |
| A-frame | Large | 4 | `EH_AFR-LRG_4BR_v1.dxf` | **MISSING** |
| Clerestory | Standard | 1 | `EH_CLR-STD_1BR_v1.dxf` | **MISSING** |
| Clerestory | Standard | 2 | `EH_CLR-STD_2BR_v1.dxf` | **MISSING** |
| Clerestory | Standard | 3 | `EH_CLR-STD_3BR_v1.dxf` | **MISSING** |
| Clerestory | Standard | 4 | `EH_CLR-STD_4BR_v1.dxf` | **MISSING** |
| Clerestory | Large | 1 | `EH_CLR-LRG_1BR_v1.dxf` | **MISSING** |
| Clerestory | Large | 2 | `EH_CLR-LRG_2BR_v1.dxf` | **MISSING** |
| Clerestory | Large | 3 | `EH_CLR-LRG_3BR_v1.dxf` | **MISSING** |
| Clerestory | Large | 4 | `EH_CLR-LRG_4BR_v1.dxf` | **MISSING** |

**Summary: 4 present, 37 missing of 41 combinations.**

### Missing DXFs the architects need to produce

- `EH_MNP_4BR_v1.dxf`
- `EH_GBL-SML_1BR_v1.dxf`
- `EH_GBL-SML_2BR_v1.dxf`
- `EH_GBL-SML_3BR_v1.dxf`
- `EH_GBL-SML_4BR_v1.dxf`
- `EH_GBL-CMP_1BR_v1.dxf`
- `EH_GBL-CMP_2BR_v1.dxf`
- `EH_GBL-CMP_3BR_v1.dxf`
- `EH_GBL-CMP_4BR_v1.dxf`
- `EH_GBL-STD_1BR_v1.dxf`
- `EH_GBL-STD_2BR_v1.dxf`
- `EH_GBL-STD_3BR_v1.dxf`
- `EH_GBL-STD_4BR_v1.dxf`
- `EH_GBL-LRG_1BR_v1.dxf`
- `EH_GBL-LRG_2BR_v1.dxf`
- `EH_GBL-LRG_3BR_v1.dxf`
- `EH_GBL-LRG_4BR_v1.dxf`
- `EH_AFR-SML_1BR_v1.dxf`
- `EH_AFR-SML_2BR_v1.dxf`
- `EH_AFR-SML_3BR_v1.dxf`
- `EH_AFR-SML_4BR_v1.dxf`
- `EH_AFR-NML_1BR_v1.dxf`
- `EH_AFR-NML_2BR_v1.dxf`
- `EH_AFR-NML_3BR_v1.dxf`
- `EH_AFR-NML_4BR_v1.dxf`
- `EH_AFR-LRG_1BR_v1.dxf`
- `EH_AFR-LRG_2BR_v1.dxf`
- `EH_AFR-LRG_3BR_v1.dxf`
- `EH_AFR-LRG_4BR_v1.dxf`
- `EH_CLR-STD_1BR_v1.dxf`
- `EH_CLR-STD_2BR_v1.dxf`
- `EH_CLR-STD_3BR_v1.dxf`
- `EH_CLR-STD_4BR_v1.dxf`
- `EH_CLR-LRG_1BR_v1.dxf`
- `EH_CLR-LRG_2BR_v1.dxf`
- `EH_CLR-LRG_3BR_v1.dxf`
- `EH_CLR-LRG_4BR_v1.dxf`
