---
name: ai-slop
description: Operational rubric that turns "don't make AI slop" into observable properties, severity levels, evidence requirements, and repair actions for interface design. Use as the reference rubric when building or reviewing marketing sites, product interfaces, dashboards, portfolios, or e-commerce pages, especially alongside frontend-design.
license: MIT (modified; see UPSTREAMS.json)
---

Scope: marketing sites, product interfaces, dashboards, portfolios, editorial pages, and e-commerce. Complements `frontend-design`: that skill builds the interface, this one is the detailed rubric for judging whether the result is generic ("AI slop") or genuinely fit for the product.

This is not a universal style guide. It does not ban a visual style merely because AI systems use it often — a gradient, card grid, serif headline, glass surface, or dark theme may be appropriate. It becomes a slop signal when used by reflex rather than because the product, audience, content, interaction, or brand requires it.

MUST/MUST NOT are required for acceptance; SHOULD/SHOULD NOT are default rules whose deviations need a written rationale; MAY is optional and context-dependent.

## 1. Core definition

**AI slop is superficially competent output that lacks sufficient intention, grounding, specificity, coherence, truthfulness, or product fit.** It usually shows up as one or more of:

1. **Default-driven** — recognizable model/template reflexes replace deliberate decisions.
2. **Interchangeable** — could be relabeled for another product with minimal change.
3. **Ungrounded** — content, claims, visuals, or features aren't supported by the brief or evidence.
4. **Incoherent** — polished elements that don't form one consistent system.
5. **Decorative without purpose** — effects attract attention without clarifying hierarchy, meaning, state, or action.
6. **Quantity-over-value** — extra sections/cards/copy exist mainly to look complete.
7. **Unreviewed** — obvious responsive, accessibility, factual, or interaction defects remain.
8. **Overfitted to current AI aesthetics** — follows the fashionable model output distribution rather than the project's needs.

Output is **not** slop merely because AI helped produce it — a result can be AI-assisted and still strong when it's grounded in real product/user context, deliberately art-directed, specific, factually honest, coherent, accessible, edited, browser-validated, and hard to transplant unchanged to another product. Human-made work can also be slop; the classification concerns the output, not proof of authorship.

## 2. Two quick tests

- **Substitution test**: could the product name, logo, and accent color be swapped while 80% of the page stays equally plausible for another product? Yes = strong slop risk; No = likely meaningfully tied to the product.
- **Rationale test**: every prominent decision MUST answer at least one of: what user need does this serve, what product truth does it express, what hierarchy does it clarify, what brand trait does it embody, what interaction state does it communicate, what constraint made it appropriate? If the only answer is "it looks modern" or "AI suggested it," it's a slop candidate.

## 3. Evaluation dimensions (score each 0-4: 0 excellent, 1 minor, 2 noticeable, 3 serious, 4 blocking)

- **Product grounding & specificity** — generic value props, checklist-driven sections, invented features/personas, visual metaphors unrelated to the product. *Evidence:* a `PRODUCT.md` (or equivalent) with explicit users, jobs, constraints, and a traceable reason per section. *Repair:* cut unsupported sections, rewrite around concrete user tasks.
- **Truthfulness & evidence** (blocking) — invented prices, metrics, testimonials, logos, citations, or controls that imply unavailable functionality. Use `[NEEDS INPUT]`, "Price on request," or clearly labeled sample data instead; keep an evidence ledger for verifiable claims; mark fictional demo data as demo data.
- **Information architecture & narrative** — default hero → logo cloud → cards → metrics → testimonials → pricing → FAQ; shuffleable section order; front-loaded slogans. *Repair:* define the reader's questions in order, give each section a unique job, cut sections that don't advance understanding.
- **Composition & layout** — everything centered, identical repeated cards, uniform spacing, excessive pills, desktop merely stacked on mobile, heading overflow at mid widths. *Repair:* content-led layouts, intentional density variation, a spatial system broken only for a reason, test real content at multiple widths.
- **Visual system coherence** — inconsistent radii/shadows/icon weights, unrelated surface treatments per section, tokens defined but bypassed. *Evidence:* a `DESIGN.md` with semantic tokens (color, type, spacing, radius, elevation, motion) that components actually consume, and a documented exception when something breaks the system.
- **Color & material** — unexplained purple/violet "tech" gradients, cyan glows on dark backgrounds, gradient headline text without purpose, glassmorphism everywhere, palette chosen from category stereotype alone. None of these are automatically forbidden — flag them when repeated, unsupported by the brand concept, or chosen as a reflex.
- **Typography** — same popular default typefaces everywhere, one weight pattern for every role, oversized display type for "editorial" feel, tiny tracked eyebrow labels, flat hierarchy, hero text that fails on mobile. *Repair:* select type from brand attributes and reading conditions, define role-based type tokens, test long words/localization/zoom.
- **Copy & voice** — "revolutionize/unlock/seamless/elevate," "not just X, but Y," empty claims ("built for the future"), repetitive cadence and em dashes, "Learn more" buttons with a predictable destination. *Repair:* concrete nouns/verbs, state what the product does for whom and why, remove undemonstrable claims.
- **Imagery & iconography** — generic gradient blobs standing in for the product, unlicensed stock hotlinks, AI imagery with anatomy/lighting inconsistencies, mixed icon families. *Repair:* authentic product imagery, purpose-built illustration, real screenshots, or honest placeholders — define an art-direction rule before generating assets.
- **Motion & interaction** — every element fades/rises on scroll, indiscriminate bounce easing, long entrance sequences, parallax with no semantic purpose, motion that ignores reduced-motion preferences. *Repair:* write a motion rationale, use a small tokenized duration/easing system, test keyboard/touch/reduced-motion/low-performance conditions.
- **Usability & accessibility** (blocking signals) — keyboard traps, missing focus states, insufficient contrast, unlabeled controls, tiny targets, hover-only information, broken zoom/reflow. Baseline: WCAG 2.2 AA for ordinary public-facing work.
- **Responsive behavior** — desktop grid collapsed into an undifferentiated stack, horizontal overflow, abrupt type-scale jumps, unchanged content priority on small screens. *Repair:* pick breakpoints from content failure (not device labels), test narrow/medium/wide plus zoom.
- **Functional completeness** — dead buttons/links, forms that can't submit or report state, tabs/menus/dialogs implemented only visually, missing loading/empty/error/disabled states. *Repair:* browser-based task tests from the brief, including edge states; never present incomplete controls as finished.
- **Implementation quality** — avoidable layout shift, unoptimized assets, excessive client JS for static content, repeated one-off CSS values, invalid semantics, console/hydration errors, performance sacrificed for decoration.
- **Distinctiveness & category reflex** — could someone guess the palette/typography/hero/components from the category alone (first-order reflex)? After banning the obvious cliché, did the result just move to the next fashionable alternative, e.g. dark-purple-glass → cream-editorial-serif (second-order reflex)? A design should feel plausible for *this* project, not inevitable from its category.

## 4. Cross-signal rule and severity

Classify the result as slop when: one **blocking** issue exists, three or more dimensions score 3, the same reflex repeats across multiple registers (color + typography + layout + copy), or both quick tests fail.

- **Blocking** (must fix before delivery): fabricated claims/facts, broken primary tasks, serious accessibility failures, deceptive controls, unusable responsive behavior, missing evidence for public claims, legal/safety-risk content.
- **Major** (strongly harms quality/distinctiveness): page-wide template reflex, incoherent design system, repetitive composition, unreadable typography, purposeless motion, generic copy dominating the experience.
- **Minor** (localized): one unnecessary pill, one weak label, one inconsistent radius, one overly long line, one generic section.

## 5. Required project artifacts

- **`PRODUCT.md`**: product/offer, target users, primary jobs, key tasks, real facts vs. assumptions, non-goals, content gaps, accessibility target, success criteria.
- **`DESIGN.md`**: art-direction sentence, brand attributes, anti-references, extracted principles from visual references, palette and semantic color roles, typography roles, spacing/grid system, radius/border/elevation/material rules, imagery direction, motion rules, component vocabulary, responsive principles, intentional exceptions.
- **`EVIDENCE.md`**: for every externally verifiable claim — exact claim, source, confidence, allowed wording, where it appears. Unsupported claims MUST NOT ship.

## 6. Review pipeline

A single self-review is insufficient. Gate through, in order:

1. **Deterministic source scan** — unsupported numbers/claims, forbidden phrase patterns, off-token colors/spacing, typography violations, inaccessible semantics, small targets, missing states, broken links, console/perf defects.
2. **Browser task tests** — keyboard navigation, forms/validation, menus/dialogs, error/empty states, mobile navigation, reduced motion, realistic content lengths.
3. **Screenshot review** — narrow mobile, wide mobile/small tablet, laptop, wide desktop, 200% zoom where relevant; inspect hierarchy, rhythm, overflow, coherence, product fit.
4. **Visual judge** — a vision-capable evaluator scores dimension-by-dimension against this rubric and the brief, with evidence tied to visible regions and a confidence level; "AI-looking" is not automatically low quality.
5. **Pairwise comparison** — candidate vs. previous version, vs. a control build without this rubric, vs. one alternative art direction, or vs. a relevant reference. Prefer pairwise preference over isolated "8/10" scores.
6. **Human acceptance** — does this feel made for this product? What feels generic, dishonest, or unsupported? What would be remembered tomorrow? Which decision would a competent designer challenge?

## 7. Scoring

Track two separate results — never collapse them into one number:

- **Shipping readiness** (pass/fail): blocking defects, functional tasks, accessibility target, evidence. A visually distinctive page can still fail shipping readiness.
- **Slop risk** (weighted 0-100): product grounding 15, truthfulness 15, information architecture 10, composition/layout 10, system coherence 10, copy/voice 8, typography 7, color/material 7, imagery 5, motion 5, responsive 4, distinctiveness 4. 0-14 low risk, 15-29 minor concerns, 30-49 noticeable genericity, 50-69 major slop characteristics, 70-100 dominated by slop.

## 8. Repair protocol

When slop is detected: name the failed dimension, cite visible/source-level evidence, identify whether the cause is missing context, a model reflex, incomplete implementation, or weak review, remove unsupported content before adding polish, fix the system or rule (not just the symptom), re-run the deterministic/browser/screenshot checks, compare pairwise against the previous version, and record what changed and why.

## 9. Anti-overcorrection

Do not turn "anti-slop" into another recognizable house style. Don't automatically replace dark-neon with cream-editorial, sans-serif with giant italic serif, cards with arbitrary asymmetry, gradients with flat beige, polished copy with forced quirkiness, or standard layouts with scroll gimmicks. The goal isn't to look less like one AI default by adopting another — it's decisions justified by the project.

## 10. Stable principles vs. temporal trends

Separate rules into two layers so the rubric doesn't fight yesterday's cliché while ignoring tomorrow's:

- **Stable (no expiry)**: interchangeability/substitution, product grounding, truthfulness, coherence, accessibility, functional completeness, rationale, distinctiveness-from-stereotype.
- **Temporal (contextual, must expire)**: give each an introduction date and a review date, e.g. `dark-purple-cyan-glass-default` (current LLM tech-product default — flag when used without brand rationale) or `overused-default-fonts: Inter, Roboto, Geist, Plus Jakarta Sans, Space Grotesk` (exception: Roboto Mono for monospace, Roboto Condensed for display). Review temporal rules at their review date; drop them if the trend faded, otherwise renew. A temporal rule MUST NOT become a new predictable default — after banning a trend, check whether the agent just adopted the next fashionable alternative instead.

## 11. Definition of done

No blocking issue remains; primary tasks work in the browser; claims are supported or explicitly labeled; the accessibility target is met; screenshots pass responsive review; the design is internally coherent; prominent decisions have written rationale; the substitution test doesn't reveal broad interchangeability; pairwise review prefers the final result over its control/previous version; remaining known limitations are documented.

## 12. Compact instruction (use under tight context)

AI slop is superficially polished but insufficiently intentional, grounded, specific, coherent, truthful, or product-fit output. Don't judge styles in isolation — detect default reflexes, interchangeability, unsupported content, system inconsistency, decorative excess, incomplete interaction, and unreviewed defects. Ground every major decision in `PRODUCT.md`/`DESIGN.md`, verify claims through `EVIDENCE.md`, test real browser tasks and responsive screenshots, and use pairwise review instead of a self-assigned score. A common visual treatment is fine when deliberate, coherent, accessible, and justified by the project.
