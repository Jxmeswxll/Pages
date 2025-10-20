# Code Reference (with Line Numbers)

Purpose: Quickly point engineers to the exact places in this repo where key logic lives, especially error handling and the budget “requires-attention” UX. Line numbers reflect the current state of this repo.

Files
- index.html — Structure and elements referenced by JS
- script.js — All quiz/navigation, loader, fetch, parsing, rendering, and UX logic
- styles.css — Styling only

Webhook (server integration)
- script.js:18 — webhookUrl = 'https://aftershockpc.app.n8n.cloud/...'
  - Note: Product inclusion/exclusion is not implemented client‑side in this repo; recommendations are rendered as returned from the server.

Error handling and loader logic (script.js)
- Submit and fetch
  - 373–454 — submitBtn.addEventListener('click', ...): orchestrates request and UI transitions
  - 391–395 — Hard timeout via AbortController
  - 396–401 — fetch(..., { signal: abortController.signal })
  - 402–408 — HTTP status gate: if (!response.ok) throw Error with status
  - 409–411 — Success: showFinalResults(data)
- Abort vs failure UI
  - 412–453 — Unified .catch(error): branches on error.name === 'AbortError'
    - 416–419 — User copy for aborted vs generic error
    - 420–453 — Restore quiz when aborted; otherwise show inline retry block
- Loader configuration and cancel
  - 28–38 — LOADER_CFG (minShowMs, slowBeatMs, hardTimeoutMs, staged copy)
  - 279–333 — startLoader(): begin loader; schedule staged text; wire cancel button
  - 314–315 — Slow network hint copy
  - 318–333 — #loader-cancel → abortController.abort(); stopLoader(true); restore quiz UI
  - 335–371 — stopLoader(wasCancelled): ARIA cleanup; “Ready!” copy on success

Recommendation parsing/validation (script.js)
- 456–506 — showFinalResults(recommendationData)
  - 474–489 — If payload has output as string, strip ```json fences and JSON.parse
  - 484–485 — Throw on invalid JSON string
  - 493–498 — Throw if required arrays RTS and Custom are missing
  - 500–504 — Catch parsing/shape errors; log + user‑facing fallback message

Results rendering (script.js)
- 508–525 — displayResults(): choose grid vs mobile view; handle empty results
- 527–580 — displayDesktopGrid(recs): render desktop cards
- 582–671 — displayMobileSingleView(recs): mobile card carousel/pagination
- 673–744 — updateMobileView(pc): fill mobile view

Budget attention UX (4K vs $1500–$2500)
- Decision point
  - 232–245 — updateBudgetOptions(): if resolution === '4K' → add 'requires-attention' to $1500–$2500 card; else remove/collapse
- Triggers
  - 81–83 — showStep(...): call updateBudgetOptions() when entering budget step
  - 247–260 — switchResolution(newResolution): updates selection → updateBudgetOptions(); updateButtons()
- Click behavior
  - 171–174 — If card has 'requires-attention' and not 'expanded' → expand and stop (prevents immediate selection)
  - 147–153 — ".switch-res-button" → calls switchResolution(), then selectCard(card)
  - 155–169 — ".change-budget-button" → unselect budget value for the question; updateButtons()
- Markup (index.html)
  - 188–213 — Budget step wrapper (data-step-id="budget")
  - 192–203 — $1500–$2500 option card
  - 195–201 — Expandable content with actions (Switch to 1440p, Choose a different budget)

Quiz flow anchors (script.js)
- 42–69 — determineStepOrder(): builds step order based on answers
- 71–88 — showStep(stepId): show/hide, update progress/buttons; triggers budget logic on budget step
- 100–141 — updateButtons(): next/submit enable rules
- 179–230 — selectCard(card): selection handling (single/single-exclusive/multiple), step order recompute for primaryUse/pcType/resolution

Suggested insertion point for client‑side product exclusion (if needed)
- Option A: After successful parse, before display
  - 493–496
