# Prompt preamble

Paste this at the start of every prompt for the EH Configurator project.
It encodes the standing expectations so they don't have to be repeated
task by task.

---

## Standing instructions for every task on EH Configurator

Before treating any task as done, make sure all of the following are
handled:

1. **Responsive by default** — every change must work on both desktop
   and mobile. Test the touch targets, the slider behavior, the nav,
   and the layout at narrow widths (≤ 480 px) and wide (≥ 1280 px).
   Don't ship a desktop-only fix.

2. **Keep the docs in sync** — if behavior, routes, env vars, file
   layout, the DXF scheme, or pricing logic changed, update
   `CLAUDE.md` and `README.md` (and `docs/integrations-setup.md` /
   `docs/dxf-gap-report.md` when relevant) in the same change. Docs
   drift is a bug.

3. **Tidy the repo as you go** — keep GitHub clean: descriptive commit
   messages, no stray branches, no dead files at the root. Move
   superseded experiments, one-off scripts, or old assets into
   `archive/` rather than leaving them next to live code. Never import
   from `archive/`.

4. **Refactor and smoke-test before declaring done** —
   - Look for duplication, dead code, and constants that should route
     through `src/lib/typologies.ts`, `src/lib/budget.ts`,
     `src/lib/countries.ts`, or `dxfFilename` / `parseDxfFilename`.
     Fix what you touched; don't expand scope into unrelated cleanup.
   - Run `npm run build` (this type-checks via `next build`) and
     confirm it passes.
   - Run `npm run dev` and click through the affected flow end-to-end:
     `/country` → `/` → `/configurator` → `/summary` → Generate PDF.
     Confirm the URL params round-trip, the plan renders, the
     indicative budget updates, and the PDF generates. If you can't
     test the UI, say so explicitly rather than claiming success.

5. **Respect the hard rules in `CLAUDE.md`** — UGX-everywhere math via
   `fmtMoney`, `var(--eh-text)` not `#000`, one CTA per screen, no
   hardcoded DXF filenames, no hardcoded cost constants, width is the
   only adjustable dimension, no emoji / gradients / stock photos.

Then, the actual task:

---

> **{your task here}**
