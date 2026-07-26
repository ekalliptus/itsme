# Project Catalog, Card, and Intro Motion Design

**Date:** 2026-07-26
**Status:** Approved

## Goal

Replace `/projects` with a curated, trustworthy catalog sourced from the public GitHub accounts `ekalliptus` and `web-alf`. Remove projects outside the approved scope, make every project card visually consistent, and smooth the `CRAFT → BUILD → SHIP → brand` intro text transitions.

The output must strengthen portfolio credibility and stable SEO/GEO/AEO signals. It must not depend on GitHub during production builds.

## Scope

1. Audit public repositories owned by `ekalliptus` and `web-alf` once.
2. Replace the current project catalog completely with approved audit results.
3. Normalize project copy, metadata, ordering, categories, screenshots, and structured data.
4. Make project cards equal-height and accessible.
5. Improve category filtering without changing the page's visual language.
6. Smooth the intro word transitions using crossfade plus subtle vertical motion.
7. Correct stale project counts elsewhere in the site.

## Out of Scope

- Runtime or build-time GitHub API fetching.
- A reusable GitHub synchronization script.
- New project detail pages or case studies.
- A new visual design system.
- Intro sequence, wording, or split-panel exit redesign.

## Catalog Source and Selection

The catalog is a static snapshot produced from GitHub API metadata, repository contents, deployment configuration, and reachable public URLs.

A project is included only when all conditions hold:

- It is original work by the owner of `ekalliptus` or `web-alf`.
- It represents a real public product or website rather than an exercise, joke, archived experiment, or private deployment artifact.
- It has a reachable canonical website URL.
- Its stack and description can be verified from repository contents or public output.
- It is not a WordPress project or WordPress-derived website.
- It is not explicitly excluded below.

Permanent explicit exclusions:

- Any project named or associated with Berdu.
- Ahzelan.
- `Badal Umroh - Landing Page`.
- Wuzz Express.
- Existing unavailable or duplicate exclusions already enforced by the catalog tests.

Repository handling rules:

- Deduplicate the same project across both accounts.
- A `web-alf` fork whose upstream is original work under `ekalliptus` is a duplicate, not a separate project.
- Third-party forks, templates, coursework, experiments, utility forks, and repositories without a live product website are excluded.
- Prefer the custom production domain over preview, hosting-provider, or repository URLs.
- Reject unreachable URLs instead of publishing an unsupported claim.

The audit is one-time and manually reviewed. Production builds continue importing static `PROJECTS` data.

## Approved Audit Snapshot

The audit reviewed 63 public repositories under `ekalliptus` and 12 under `web-alf`. The approved catalog contains these 11 canonical projects, ordered by portfolio quality and relevance:

1. Ekalliptus Digital — `ekalliptus/ekalliptus-web` — `https://ekalliptus.com/`
2. Tentaklik — `ekalliptus/tenta` — `https://tentaklik.com/`
3. Jagatrip — `ekalliptus/jagatrip` — `https://jagatrip.com/`
4. Niat Baik Donation Platform — `web-alf/niatbaik` — `https://donasi.niatbaik.org/`
5. Sedekah Air Minum — `ekalliptus/sedekahairminum` — `https://sedekahairminum.com/`
6. Linknyamana — `ekalliptus/linknyamana` — `https://linknyamana.web.id/`
7. Jagoan ZAI Dev — `ekalliptus/jagoanzaidev` — `https://jagoanzaidev.web.id/`
8. Media Pro — `ekalliptus/mediapro` — `https://mediapro.work/`
9. Penerbit Quran — `ekalliptus/penerbitquran` — `https://penerbitquran.com/`
10. Niat Baik Company Profile — `web-alf/niatbaik-home` — `https://niatbaik.org/`
11. Itsme — `ekalliptus/itsme` — `https://bio.ekalliptus.com/`

Important audit corrections:

- Media Pro is now an Astro site and is eligible; the previous WordPress classification is stale.
- Niat Baik Company Profile is eligible through `web-alf/niatbaik-home`, not the old WordPress implementation.
- Yayasan Al Hidayah remains excluded because the current repository directly integrates WordPress content.
- Tentaklik uses `ekalliptus/tenta` as its canonical repository; `tenta-web` and `tentaklik` are duplicate or obsolete implementations.
- Direct forks under `web-alf` are deduplicated to their original `ekalliptus` repositories.

## Project Data

Keep the existing minimal project shape unless a verified need appears:

- `icon`
- `name`
- `description`
- `tags`
- `liveUrl`
- `category`
- `previewImage`

Each entry must use:

- A concise factual Indonesian description.
- Two to four verified, representative technology tags.
- One declared category.
- A canonical HTTPS live URL.
- A local 1280×800 preview screenshot.

Order entries manually by portfolio quality and relevance, strongest first. Repository update time does not control display order.

All visible project counts and generated JSON-LD must derive from `PROJECTS.length`. Remove stale hardcoded claims such as `41 projects` from About and Skills.

## Project Cards

Keep the current browser-preview card concept and responsive 1–3 column grid.

Consistency requirements:

- Grid wrappers and cards fill available row height.
- Preview dimensions remain identical across cards and crop from the top.
- Title area has a stable minimum height.
- Description is clamped to three lines.
- Tags contain only the most relevant stack items.
- Tag styling is derived from technology identity, not array position.
- Footer CTA remains aligned to the bottom.
- Focus treatment and keyboard navigation remain visible and usable.

The preview and footer may both link to the canonical site, but accessible naming must avoid duplicate or hidden ambiguous actions.

## Filtering

The category controls are filters, not ARIA tabs. Use button-group semantics rather than `tablist`/`tab` without tab keyboard behavior.

Filtering behavior:

1. Update the selected filter state.
2. Fade and scale outgoing cards briefly.
3. Remove filtered cards from layout after the exit transition.
4. Reveal matching cards with a short fade and scale transition.
5. Respect reduced-motion preferences by switching immediately.
6. Show the existing empty state only when no project matches.

Animation must not compromise keyboard focus or leave hidden cards focusable.

## Screenshot Assets

Generate fresh screenshots for every included live URL at 1280×800 using the existing Playwright workflow. Preserve top-of-page framing for uniform previews.

Remove project screenshots no longer referenced after the catalog replacement. Keep unrelated assets and local user files untouched.

## Intro Text Motion

Preserve the sequence and timing concept:

`CRAFT → BUILD → SHIP → єкαℓℓιρтus`

Each transition uses overlapping outgoing and incoming states:

- Outgoing word fades from opaque to transparent while translating upward by 8–12px.
- Incoming word starts 8–12px below, fades in, and settles at its final position.
- The overlap prevents a blank or abrupt frame.
- Transition duration is approximately 420–500ms.
- Easing uses `cubic-bezier(0.22, 1, 0.36, 1)` or the nearest existing motion token.

Keep the split-panel exit. Ensure the hero handoff class remains active until all dependent hero animations finish, preventing late animation cancellation and snapping.

`prefers-reduced-motion: reduce` continues skipping the intro and avoids filter motion.

Use one consistent brand spelling across the preloader, navigation, and structured data.

## SEO, GEO, and AEO

The static catalog remains the source for the `/projects` schema.org `ItemList`.

Requirements:

- Item positions are contiguous and match visible project order.
- Item names and canonical URLs match card content.
- Project count copy derives from the same catalog.
- Only verified public products are claimed.
- Custom canonical domains are preferred.
- No anonymous, duplicate, stale, or unreachable projects enter structured data.

These rules prioritize entity consistency and factual provenance over catalog size.

## Error Handling

During audit and asset generation:

- Record failed or ambiguous repositories as excluded with a reason.
- Do not create fallback claims from repository names alone.
- Do not retain a project when its canonical website cannot be verified.
- A screenshot failure blocks that project from final publication unless an intentional accessible fallback is approved.

Production has no external data dependency beyond project links and images already shipped with the site.

## Testing

Replace random-sampling validation with deterministic validation of every project.

Tests must verify:

- Every project has the complete expected shape.
- Names and canonical live URLs are unique.
- Every live URL is valid HTTPS syntax.
- Every category is a real declared content category, excluding the `all` UI sentinel.
- Every tag is a non-empty string.
- Every referenced preview image exists.
- Permanent exclusions cannot reappear.
- The expected audited catalog count is exact.
- Generated JSON-LD `ItemList` length, order, names, URLs, and positions match `PROJECTS`.
- Stale hardcoded project counts are absent.

Verification sequence:

1. Run catalog tests.
2. Build the Astro site.
3. Run the complete test suite against generated output.
4. Inspect `/projects` at mobile and desktop widths.
5. Exercise category filters with mouse and keyboard.
6. Observe intro transitions under normal motion.
7. Verify reduced-motion behavior.

## Acceptance Criteria

- `/projects` contains only audited original projects from `ekalliptus` and `web-alf`.
- WordPress, Berdu, Ahzelan, `Badal Umroh - Landing Page`, Wuzz Express, third-party forks, exercises, and projects without reachable live websites are absent.
- Duplicate repositories across accounts produce one card.
- Cards have consistent height, aligned CTA, normalized content, and accessible filters.
- All included cards use current screenshots with no orphaned project previews.
- Intro words crossfade and move subtly without abrupt replacement or hero snap.
- Visible counts and JSON-LD match the final catalog.
- Build and complete tests pass.
