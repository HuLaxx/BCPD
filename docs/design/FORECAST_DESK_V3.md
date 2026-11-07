# Forecast Desk V3 — Figma / frontend handoff

## Editable source of truth
Figma artboard: https://www.figma.com/design/YlQbLWTBrglkBNl0jimIgl?node-id=8-3

The v3 design retains all the editable native text, panels, controls and vector shapes from the existing Figma design. It adds a future-week inspector and intentionally carries scientific disclosures as first-class interface content. Do **not** embed the Figma screen as a raster image.

**Status:** Designer/developer iteration; Figma screenshot comparison could not be repeated because the connected Figma Starter plan's MCP tool limit was reached after the new editable artboard was created. The implementer must perform a manual Figma-to-preview visual review before release.

## Interaction and evidence contract

- **Historical data:** Observations originate in `/api/markets` with explicit provider and access timestamp. Partial UTC weeks are excluded.
- **Forecast:** The chart uses the actual `lib/forecasting.ts` future projection series, never hardcoded scenario points. An illustrated fan in Figma is schematic *only*.
- **Inspector:** A 1/4/12/26-week button group is keyboard-operable and only enables weeks inside the selected projection horizon. One selected week highlights the chart point and displays its generated date, median and nominal 80/95% intervals.
- **Model status:** All baseline forecasts are marked *experimental*; interval coverage diagnostics are retrospective, not accuracy guarantees. Do not represent BOCPD historical candidates as future regime-change dates.
- **Error recovery:** Source failure is visible with retry. No "demo" price is substituted when a source fails.
- **Responsive navigation:** Left desktop rail and accessible four-tab compact mobile navigation are intentionally different representations of the same paths.

## Design primitives

| Token | Value | Usage |
|---|---|---|
| Surface / ink | `#0B1517` | App background |
| Panel | `#152325` | Analysis and settings |
| Divider | `#30433F` | Panel edges |
| Positive accent | `#D7F3A0` | Active controls and observed-data trace (not price direction) |
| Projection accent | `#F3BB92` | Future median, uncertainty, caution |
| Primary type | `#F0F2E8` | Titles and values |
| Secondary type | `#A1B5AC` | Definitions and caveats |

Never imply that a green active-state accent means positive return, bullish direction, or validated accuracy. Ensure contrast and focus states survive system font fallback and mobile viewports.

## Ready-for-review checks

1. GitHub: Node unit tests, TypeScript, lint, production Next.js build.
2. Playwright Chromium: chart projection, selected-week buttons, disabled beyond-horizon points, mobile navigation, source outages, evidence export, mobile horizontal overflow.
3. Vercel preview READY on the **same SHA** and core routes HTTP 200.
4. Human reviewer: compare Figma V3 frame and deployed screen on desktop, 390px mobile and narrow 320px mobile; verify screen-reader labels and interaction states.
5. Explicit owner approval, legal market-data rights and independent predictive evaluation remain prerequisites to commercialization—not frontend build completion.
