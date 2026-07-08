# Design Handover — Dynamic Supply Chain UI/UX Overhaul

> **How to use this document:** Paste it as the opening prompt for a Claude design pass running **as a Claude Code session inside this repo** (`dynamic-supplychains`). It references real file paths. You (Claude) have creative latitude on the *visual* direction — colour story, hero treatment, composition — **as long as every hard constraint in §3 holds.** Bring taste; don't break logic.

---

## 1. Mission

Perform a **visual + UX overhaul** of this existing Next.js demo. **Presentation only — no logic, data, or API changes.** Specifically:

1. **Add a new landing page** that explains what the demo does.
2. **Reskin** the three existing pages (Create, Receive, Directory + chain detail) and their modals into one cohesive, polished design system.
3. **Make it self-explanatory** — weave explanatory copy, guides, and contextual help *throughout* so a first-time, non-technical visitor understands what's happening and how to use the demo at every step (see §8).

This is a facelift *within* the existing framework — not a rewrite, not a re-platform.

---

## 2. What the product is (design the right story)

**Dynamic Supply Chain** — *build any custom supply chain lifecycle.* A flexible, fully-customisable engine (built on Bitcoin SV) for composing a verifiable supply chain record for *practically any* product journey. Users build free-form **stages**, each carrying arbitrary metadata, recorded as an immutable, encrypted on-chain transaction. Each finalized chain is an end-to-end record of a product's life, custody, and provenance. It was built to **supersede bespoke, industry-specific supply-chain tools**: one adaptable engine instead of one codebase per vertical.

**The design should communicate:** trust, provenance, verifiability, and *flexibility across industries*. Avoid looking like a single-vertical app — it's a supply chain engine that fits agriculture, manufacturing, aviation, pharma, logistics, anything.

(See `README.md` for full product detail. Do not change product behaviour.)

---

## 3. Hard constraints — DO NOT break these

**Stack (work within it; no re-platforming):**
- Next.js 16 (App Router), React 19, TypeScript.
- **Tailwind CSS v4** — theme/design tokens are configured via `@theme` in `src/app/globals.css` (Tailwind v4 has no `tailwind.config.js`). Centralise the new design system there.

**Approved UI layer (decided — use it):**
- **shadcn/ui** — Radix primitives + Tailwind + CVA. Components are scaffolded *into this repo* via the shadcn CLI, so you **own and freely restyle them** — it is not a locked black-box dependency. Use the current shadcn CLI that targets **Tailwind v4 + React 19** (CSS-variable theming, compatible with the `@theme` block). Build the app's own components on top of shadcn primitives; don't fork in a different direction per file.
- **lucide-react** — the icon system. Retire the emoji indicators (🔒 🔓 📤 ⚠️ 💡 ⏳ 🔄) and the one-off inline SVGs in favour of consistent lucide icons.
- **tw-animate-css** — animation utilities (this is what makes the `animate-in` / `fade-in` / `zoom-in` classes the code already references actually work; see §9).
- Keep additions lean and purposeful: shadcn components as needed + lucide + tw-animate-css (plus their transitive `class-variance-authority` / `clsx` / `tailwind-merge`). **No other** heavy dependencies — especially no second component library and no CSS-in-JS runtime — without separate approval.

**Do NOT change (this is the line between "facelift" and "logic change"):**
- Component **props / interfaces** consumed by logic, component **state**, **event handlers**, data fetching, API routes, MongoDB queries, wallet / PushDrop / overlay code, or validation rules.
- Any existing **conditional branch or rendered state**. Every loading, empty, error, disabled, success, and warning state that exists today must still exist and still render — just prettier.
- Business behaviour of any kind. If a change would alter *what the app does* (not *how it looks*), it's out of scope.

**What you ARE free to do:** rewrite `className` strings, restructure markup for layout/hierarchy, extract presentational sub-components, add design tokens, add purely-presentational new components (Button, Card, Badge, etc.), and adjust spacing/typography/colour/motion.

**Quality bars:**
- **Accessibility:** at least as good as today (labels tied to inputs, `role`/`aria` on status elements, visible focus states, sufficient contrast). Improve where cheap.
- **Responsive:** mobile-first; preserve/refine the existing `sm` → `md` → `lg` breakpoints.
- **Cohesion:** all five surfaces must read as one product.

---

## 4. Landing-page routing — DECIDED

**Decision (locked 2026-06-10):** `/` becomes the **landing page**; the chain builder moves to **`/create`**; update the navbar "Create" link and any internal links/redirects that point at the builder (navigation wiring only — not logic). This is the *only* permitted routing change. The builder's behaviour stays byte-for-byte identical.

*(Rejected alternative: keep the builder at `/` with the landing at `/welcome`.)*

---

## 5. Current design snapshot (the "before")

Be honest about what you're replacing:

- **Every page** uses a wall-to-wall gradient `bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900` with white rounded cards floating on top.
- **Cards:** `bg-white rounded-xl` + custom drop shadows `shadow-[6px_8px_16px_rgba(0,0,0,0.25)]`, hover `scale-105`.
- **Navbar:** `bg-blue-900` + `border-b border-blue-700`, white links, active link `border-b-2 border-blue-400`, red circular pending badge (`bg-red-500`, caps at "9+").
- **Buttons:** primary `bg-blue-600 hover:bg-blue-700`; finalize `bg-green-600`; disabled `bg-gray-400 opacity-60`.
- **Typography:** **Geist Sans + Geist Mono are loaded** via `next/font` in `src/app/layout.tsx`, **but `globals.css` overrides `body` to `Arial, Helvetica`** — so the nice fonts are currently dead. Mono (`font-mono`) is used for keys/IDs/JSON.
- **Status indicators are emoji:** 🔒 🔓 📤 ⚠️ 💡 ⏳ 🔄.
- **Two modal styles:** create-stage modal (`max-w-md`, `rounded-lg`, `backdrop-blur-sm bg-black/30`) and stage-details modal (`max-w-3xl`, `rounded-2xl`, `bg-black/50`). The stage-details *panel* (`w-80`, slides out beside a card) duplicates the modal's content at a smaller size.
- **Dark-mode tokens exist** in `globals.css` (`prefers-color-scheme`) but are effectively unused because pages hard-code the gradient.

The look reads as a generic gradient app. The opportunity is to make it feel like a premium, trustworthy *provenance* product.

---

## 6. Design direction (north star — opinionated guidance, latitude on specifics)

**Principles:** trustworthy & premium · provenance-forward · calm hierarchy · industry-neutral · flexible.

**Recommended moves (apply your own taste on the details):**
1. **Build a real design system in `@theme`** (`globals.css`): brand colour tokens, surface/elevation scale, a standard radius scale, a standard shadow scale, and font tokens — instead of ad-hoc per-component classes. **Align this with shadcn's CSS-variable theming** so shadcn components and your own utility classes read from one source of truth. Then *use the tokens everywhere*.
2. **Evolve the wall-to-wall gradient.** Reserve a branded/gradient treatment for *moments* (landing hero, page headers) and give working surfaces (builder, inbox, gallery) a calmer canvas so content and data breathe. Reduce visual noise; let the chain content be the hero.
3. **Build on shadcn/ui primitives** and reuse them everywhere: `Button` (variants), `Card`, `Badge`, `Input` + `Form` field, `Dialog` (modals), `Tooltip` + `Popover` + `HoverCard` (the §8 guidance UX), `Tabs` / `Accordion` (how-it-works, metadata grouping), `Sheet` (the slide-out stage panel). Add app-specific presentational components on top — `EmptyState`, `StatPill` / metadata row, `Timeline` for the stage flow — composed from shadcn + the Tailwind tokens.
4. **Replace emoji status with consistent `lucide-react` icons** (lock / unlock / send / alert / refresh / copy, etc.) for a professional, uniform feel.
5. **Wire up Geist** (remove the Arial override) — a free typographic upgrade. Use Geist Mono for hashes/keys/JSON.
6. **Motion:** keep it subtle. Lean on shadcn/Radix's built-in transitions + `tw-animate-css`; the `animate-in fade-in zoom-in` intent already in the code is the right baseline — refine, don't overdo.
7. **Dark mode:** decide deliberately. Either implement proper light/dark via the existing tokens, or explicitly scope to a single, consistent theme. Don't leave half-wired dark tokens.

---

## 7. Per-surface scope

For each surface: **keep** = must still work/render; **goals** = the visual/UX uplift. Additionally, apply the in-product guidance requirements from §8 to **every** surface — explanatory copy is part of each surface's goals, not a separate afterthought.

### A. NEW — Landing page  (`/`, per §4)
A static, presentational page (can be a server component; no wallet required to view). Suggested sections:
- **Hero:** product name (**Dynamic Supply Chain**) + tagline **"Build any custom supply chain lifecycle."**, primary CTA → builder, secondary CTA → Directory.
- **What it does** — short, plain-language explanation.
- **How it works** — 3–4 steps: *Create a chain → Add stages with custom data → Hand off between parties → Finalize the chain*.
- **Flexibility / use-cases** — surface the three built-in templates (agriculture "Soil to Table", "Plastic Product Lifecycle", "Aircraft Parts Lifecycle") as proof it fits any vertical.
- **On-chain trust** — PushDrop on BSV, each stage encrypted to the next party, verifiable provenance, UTXO-chained.
- **Footer** — keep the demo disclaimer (encryption is not production-secure) and a link to the README/repo.

### B. Create / Builder  (`src/app/page.tsx` → `src/app/create/page.tsx`; `src/components/renderStages/stagesColumn.tsx`; `stageItem.tsx`)
- **Keep:** chain-title input, chain-ID display + copy button, template selector chips, the dashed "Add Stage" card (with wallet-gated disabled state), the green Finalize button, the max-8-stages handling, and all wallet-connection gating.
- **Goals:** make it read as "build a supply chain." Give the vertical stage list real rhythm — consider a proper **vertical timeline** treatment connecting stages. Refine the dashed add-card and the template chips. Tidy the chain-ID block.

### C. Receive  (`src/app/receive/page.tsx`; `src/components/receive/receivedChainsList.tsx`; `continueChainColumn.tsx`)
- **Keep:** the list ↔ detail two-state flow, the "continued" badge, back button, template selector, finalize button, the yellow/green info messages, and the "view other chains" action.
- **Goals:** polished **inbox** cards; clearer affordance for "continue (keep)" vs "forward (send on)"; bring the dark gray gradient detail box (`from-gray-800 to-gray-900`) into the new system.

### D. Directory gallery + detail  (`src/app/directory/page.tsx`, `examplesList.tsx`; `src/app/directory/[id]/page.tsx`, `singleExample.tsx`)
- **Keep:** search input + clear, pagination (21/page), the empty / no-results / loading states, the read-only notice on detail, and the full stage rendering.
- **Goals:** present the gallery as a **supply chain directory**. Stronger cards (title, stage count, creator, first→last flow, finalized date). Refined search. Detail view = stage timeline + a clear "verified on-chain" treatment for TXIDs.

### E. Modals & shared
- **`createStageModal.tsx`** — **keep** every field (stage title, image URL, receiver public key, dynamic key/value metadata rows with add/remove, the collapsible template suggestions, all validation/warning states, the "broadcasting…" state, the missing-title guard). Reskin to the new modal shell; swap ⚠️ emoji for SVG; group fields more clearly.
- **`stageItemDetails.tsx`** (side panel) **+ `stageItemDetailsModal.tsx`** (full modal) — **keep** loading/error/retry, receiver & sender info, the decryption warning, the decrypted-JSON view, and the "Expand Full Details" button. **Unify both into one visual language at two sizes.** Replace 🔒 🔓 📤 ⚠️ 🔄 with SVG icons. Nicer JSON/code block.
- **`navbar.tsx`** — **keep** links, active state, the red pending badge (count + "9+"), and ConnectWallet. Reskin; update Create → `/create` (per §4); consider a wordmark/logo.
- **`connectWallet.tsx`** — **keep** disconnected / connecting / connected-disabled states and the truncated pubkey display. Reskin as a proper status button.
- **`spinner.tsx`** — **keep** the `sm`/`md`/`lg` sizes and `role="status"` / `aria-label`. Restyle: it currently assumes a dark background (`border-white`) — make it work on light surfaces too.

---

## 8. Explanatory content & in-product guidance (make the demo self-explanatory)

**Why this matters:** the audience includes non-technical evaluators and first-time visitors who don't know BSV, PushDrop, public keys, locks, or transfers. Today the UI surfaces raw concepts (pubkeys, TXIDs, "lock", "continued", "broadcasting") with little explanation. The overhaul must **teach as you go** — someone should be able to arrive cold and understand *what is happening* and *what to do next* at every step, **without reading the README.** This is a first-class requirement, applied across **all** surfaces — not decoration.

**Mechanisms to use (presentational/copy only — no logic changes):**
- **Plain-language first, jargon second.** Lead with everyday wording; show the technical term as secondary — e.g. "Send to — the recipient's wallet ID *(public key)*".
- **Contextual help on jargon.** Info tooltips / popovers (hover **and** keyboard/tap accessible) on terms like *public key, receiver, PushDrop, lock, transfer, finalize, transaction ID (TXID), on-chain, encrypted, overlay*. One or two plain sentences each.
- **Rich empty states that coach the next action.** Every empty/zero state explains what the area is and the single next step — e.g. empty builder → "A supply chain is built from stages. Add your first stage to begin."; empty inbox → what "received chains" are and how one arrives.
- **Journey framing in the builder.** Make *create → add stages → hand off → finalize* legible as a flow (a stepper, helper captions, or a "what's next" hint). Explain the 2-stage minimum and 8-stage max **in context**, not just by disabling a button.
- **"What just happened" confirmations.** After on-chain actions (stage created, chain sent, finalized), show a short plain-language explanation of what occurred and where it went — e.g. "Stage recorded on-chain. The previous stage's token was spent to create this one." Keep using the existing `react-hot-toast` for transient feedback; add inline confirmations where helpful.
- **Status explainers.** When the create modal shows "broadcasting…", say what that means ("Writing this stage to the blockchain — this can take a few seconds"). Explain lock / unlock / self-vs-receiver states in the details panel in *words*, not just icons.
- **A persistent "How it works" affordance.** A help entry point from the navbar (and/or a reusable info button) opening a concise explainer — and/or a dismissible first-run intro / coach-marks on the builder. Lightweight and presentational; "dismissed" state may use `localStorage` only (no backend).
- **A short glossary** — a landing-page section, a `/help` route or modal reachable from the navbar, or both. Cover the core terms above in plain English.
- **Inline microcopy on inputs.** Helper text under every field describing its purpose and what good input looks like (especially the receiver public-key field and the custom metadata rows).
- **Provenance/trust explainers** on the Directory detail view: state that each stage is a real, verifiable on-chain transaction, what the TXID is, and a one-line "why this matters."

**Tone:** clear, friendly, confident, jargon-light. Short sentences. Educational without being condescending. One consistent voice across all surfaces.

**Constraint reminder:** all of the above is copy + presentational UI. Do **not** change what any action does — only explain it better.

---

## 9. Polish opportunities (fix while you're in there)
- **Dead animations:** the `animate-in` / `fade-in` / `zoom-in` classes in `createStageModal.tsx` and `stageItemDetails.tsx` are currently **no-ops** — no animation plugin is installed, so the "modal entrance" doesn't animate. `tw-animate-css` (added with shadcn) makes them work, or just adopt shadcn `Dialog`/`Sheet`, which animate out of the box.
- Geist fonts loaded but unused (Arial override in `globals.css`) → wire them up.
- Emoji status indicators → consistent `lucide-react` icons.
- Ad-hoc custom shadows & raw colour classes → design tokens (aligned with shadcn's CSS variables).
- Spinner colour assumes a dark background (`border-white`) → make surface-agnostic (token-driven; or use a lucide spinner).
- Inconsistent radii (`rounded-lg` / `xl` / `2xl`) → standardise a scale (drive from the shadcn `--radius` token).
- Contrast: check `text-blue-100` / `text-blue-200` over gradients (and on any new light surfaces).

---

## 10. Out of scope — do NOT
- No changes to business logic, data models, API routes, MongoDB, wallet/PushDrop/overlay code, or validation.
- No renaming of props/interfaces consumed by logic.
- Do not remove or merge away any rendered state/branch.
- No new backend, no schema changes, no analytics/tracking.
- No heavy dependencies beyond the approved layer in §3 (shadcn/ui + lucide-react + tw-animate-css) without separate approval. No second component library; no CSS-in-JS runtime.

---

## 11. Deliverables & acceptance criteria
- New landing page + all four existing surfaces and their modals reskinned, cohesive across the set.
- **In-product guidance per §8** implemented throughout: contextual help on jargon, rich coaching empty states, journey framing in the builder, status explainers, "what just happened" confirmations, a "How it works"/glossary affordance, and inline field microcopy.
- Design tokens centralised in `globals.css` `@theme`; primitives reused, not re-styled per file.
- shadcn/ui initialised with its theming wired into `globals.css` tokens; `lucide-react` + `tw-animate-css` installed; emoji indicators retired in favour of lucide.
- `npm run build` passes (it does today — keep it that way). **Baseline note (2026-06-10):** the build is green, but `npm run lint` already reports **22 errors / 17 warnings** and `npm test` already has failures — **all pre-existing, in logic/test files that are off-limits (Appendix C)**: `no-explicit-any`/`prefer-const`/unescaped-entity in `mongo.ts`, `pushdropHelpers.ts`, `overlayFunctions.ts`, `createStageModal.tsx`, `walletContext.tsx`, plus a missing `dotenv` dev-dep that stops the PushDrop test suite from running. So the realistic bar is: **build stays green, and you introduce no *new* lint errors/warnings in the files you touch.** The pre-existing logic/test failures are a separate cleanup, not part of this UI overhaul.
- Every pre-existing state (loading / empty / error / disabled / success / warning) still renders.
- Responsive at `sm` / `md` / `lg`.
- A short **CHANGELOG** of visual changes + any new shared/presentational components created.

---

## 12. Suggested working order
1. **Setup & tokens:** init shadcn/ui (Tailwind v4 / React 19 target), add `lucide-react` + `tw-animate-css`, define the brand token system in `globals.css` (shadcn CSS variables + `@theme`), and scaffold the core primitives (Button / Card / Badge / Input / Dialog / Tooltip / Popover / Sheet / EmptyState).
2. Navbar + shared (spinner, connectWallet) — sets the tone everywhere.
3. Landing page.
4. Create / builder.
5. Receive.
6. Directory gallery + detail.
7. Modals (create-stage, stage-details panel + modal).
8. QA pass: build, lint, test, and click through every state at each breakpoint.

> Build the explanatory copy and contextual help (§8) **alongside each surface** as you go — don't leave it as a final bolt-on. Guidance and visuals ship together, per surface.

---

## Appendix — File map (exact inventory)

You are running in-repo, so read these directly. Three buckets: **restyle**, **create**, and **off-limits**.

### A. Restyle — existing UI files (19)
These are the only existing files you should change for visuals.

| # | File | Surface |
|---|------|---------|
| 1 | `src/app/layout.tsx` | Root layout — wire up Geist fonts (remove the Arial override); mount Toaster/providers. *Small change only.* |
| 2 | `src/app/globals.css` | The design-system home — tokens via `@theme` + shadcn CSS variables. |
| 3 | `src/app/page.tsx` | Currently the **builder**; becomes the **landing page** (or relocate — see §4). |
| 4 | `src/app/receive/page.tsx` | Receive inbox page. |
| 5 | `src/app/directory/page.tsx` | Directory gallery page. |
| 6 | `src/app/directory/[id]/page.tsx` | Chain detail page. |
| 7 | `src/components/navbar/navbar.tsx` | Top nav + pending badge. |
| 8 | `src/components/navbar/connectWallet.tsx` | Wallet connect button. |
| 9 | `src/components/renderStages/stagesColumn.tsx` | Builder column (title, templates, finalize, add-stage). |
| 10 | `src/components/renderStages/stageItem.tsx` | Stage card. |
| 11 | `src/components/renderStages/stageItemDetails.tsx` | Slide-out stage details panel → shadcn `Sheet`/`Popover`. |
| 12 | `src/components/renderStages/stageItemDetailsModal.tsx` | Full stage details modal → shadcn `Dialog`. |
| 13 | `src/components/stageActions/createStageModal.tsx` | Create-stage modal → shadcn `Dialog` + `Form`. |
| 14 | `src/components/stageActions/createModalTemplates.tsx` | Template **data** (not visual) — edit only if changing template copy. |
| 15 | `src/components/receive/receivedChainsList.tsx` | Inbox card grid. |
| 16 | `src/components/receive/continueChainColumn.tsx` | Continue-chain detail view. |
| 17 | `src/components/examples/examplesList.tsx` | Gallery card grid + search + pagination. |
| 18 | `src/components/examples/singleExample.tsx` | Single finalized chain view. |
| 19 | `src/components/ui/spinner.tsx` | Loading spinner — make surface-agnostic. |

### B. Create — new files (~22–32, most are small shadcn primitives)
- **Config/util (2):** `components.json` (shadcn config), `src/lib/utils.ts` (`cn()` helper).
- **shadcn primitives in `src/components/ui/` (~12–18):** button, card, badge, input, label, form, dialog, sheet, tooltip, popover, hover-card, tabs, accordion, separator, scroll-area… (generated by the CLI; pull only what you use).
- **Routing (1–2):** if relocating per §4 — `src/app/create/page.tsx` (builder moves here) and the new landing at `src/app/page.tsx`.
- **Help/learn (1–2):** `src/app/help/page.tsx` (or a `HowItWorks`/glossary `Dialog`) reachable from the navbar.
- **App-specific presentational components (~5–8):** e.g. `EmptyState`, `StatPill`/metadata row, `Timeline` (stage flow), `InfoTooltip` (jargon helper), `HowItWorks`, `GlossaryTerm`, `Stepper`. Put these in a sensible folder (e.g. `src/components/common/`).

> The count looks large but ~12–18 are tiny CLI-generated primitives. The real hand-authored new work is ~8–12 files (landing, help/glossary, and the custom presentational components).

### C. Off-limits — logic boundary, do NOT restyle or modify (19)
Read a few to learn which props/data/states you must preserve, but change **none** of them:
- API routes (11): `src/app/api/{chains/continue, chains/pending-count, chains/received, chains/receiver, chains/send, examples, lock, lock/check, stages/current, stages/finalize, stages/new-stage}/route.ts`
- Health (2): `src/app/health/route.ts`, `src/app/ready/route.ts`
- Wallet/data/logic (6): `src/context/walletContext.tsx`, `src/lib/env.ts`, `src/lib/mongo.ts`, `src/utils/mongoValidators.ts`, `src/utils/overlayFunctions.ts`, `src/utils/pushdropHelpers.ts`

**Headline:** ~19 files to restyle · ~22–32 to create (mostly primitives) · 19 fenced off.
