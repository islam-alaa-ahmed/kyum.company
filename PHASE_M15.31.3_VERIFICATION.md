# Phase M15.31.3 — Installation Mobile Visual Identity + Semantic Icon Guard

## Scope
- Mobile only: quotation/invoice semantic-icon regression closure.
- Mobile only: installation requests, scheduling, execution and completion visual identity.
- Desktop/tablet selectors and business logic remain unchanged.

## Root cause closed
M15.31.2 created the KPI icon container with `::before` but did not assign/render a semantic SVG layer. This phase adds a dedicated masked `::after` semantic icon and requires an explicit `--kyum-semantic-icon` mapping for every KPI covered by the phase.

## Regression guard
- KPI container without semantic SVG mapping is a phase failure.
- No emoji/icon-font dependency; SVGs are inline data masks.
- Styling remains inside the existing mobile canonical owner (`@media (max-width:767px)`).
