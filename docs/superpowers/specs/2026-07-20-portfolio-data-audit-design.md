# Portfolio Data Audit Design

**Date:** 2026-07-20
**Status:** Approved

## Goal

Make the portfolio accurate, consistent, privacy-conscious, and production-ready without redesigning its interface.

## Identity and content

- Use `https://bio.ekalliptus.com` as the single canonical production URL.
- Use `єкαℓℓιρтus` consistently as the stylized brand.
- Link GitHub to `https://github.com/ekalliptus`.
- Link LinkedIn to `https://www.linkedin.com/in/ekalliptus/`.
- Remove X/Twitter links and metadata.
- Use `support@ekalliptus.com` publicly and as the FormSubmit destination.
- Keep the roles Software Engineer, IT Support Specialist, and Editor.
- State `8+ years` of professional experience.
- Keep the available-for-work status.
- Publish `Tegal, Jawa Tengah, Indonesia`; remove precise coordinates.
- Keep Media Pro as the current employer.
- Use the official institution name `Universitas Bina Sarana Informatika`.
- Keep the site English-only and remove unsupported Indonesian hreflang metadata.
- Convert `/home/ekalliptus/Unduhan/Telegram Desktop/photo_2026-07-11_13-55-47.jpg` to an optimized local WebP profile asset. Preserve accessible alternative text and explicit dimensions.
- Keep the existing SharePoint CV URL; rename the action to `View CV`.
- Describe client reach as `across Indonesia`.

## Projects and claims

- Show 41 projects.
- Remove Donasi Wakaf Sumur because its URL redirects to the existing Wakaf Sumur listing.
- Hide Rumah Quran Al Fatihah while its site returns HTTP 503.
- Hide Al Fatihah Homeschooling while its site returns Cloudflare HTTP 526.
- Add a valid Bayar Zakat screenshot or use the card's safe fallback.
- Replace `59+ repositories` and similar counts with `41 projects`.
- Remove Media Pro claims for `25,000+ brands`, `40+ countries`, and `10+ years` because no source is present in the project.
- Update Jagoanzaidev, Al Hidayah Islamic School, and Miemie Brownie descriptions to match their public products.
- Rewrite unsupported internal-feature claims as observable descriptions. Public URL availability does not prove ownership, client authorization, individual contribution size, or private product features.
- Keep existing project card layout and filtering behavior.

## SEO and deployment

- Align Astro site configuration, canonical URLs, Open Graph URLs, JSON-LD, robots, sitemap behavior, and deployment redirects with `https://bio.ekalliptus.com`.
- Remove the JSON-LD `SearchAction` because no project search endpoint exists.
- Remove precise geo metadata.
- Make `public/.htaccess` the deployed Apache configuration source and eliminate contradictory root configuration.
- Preserve existing security headers unless the source audit proves an allowance is obsolete.

## Repository maintenance

- Replace the stale Vue template README with concise Astro/Bun setup, test, build, deployment, data-editing, and screenshot instructions.
- Audit the Lighthouse dependency: retain it with a runnable script when used by the repository; otherwise remove it.
- Keep the already-updated local Git remote at `https://github.com/ekalliptus/itsme.git`.
- Do not redesign UI, add localization, add a CMS, or add new abstractions.

## Validation

- Run the existing test suite and production build.
- Search tracked source for stale `anrdart`, `alulanr`, X/Twitter, old domains, old experience/count claims, unsupported hreflang, coordinates, and old FormSubmit destination.
- Verify all displayed project URLs and local preview assets.
- Check the profile image and primary pages at desktop and mobile widths.
- Confirm metadata and structured data resolve to the canonical domain.
- Keep commits atomic by concern. Do not push without a separate request.

## Error handling

- Project cards with missing previews must render the existing fallback rather than a broken image.
- External links remain external and must not block page rendering when unavailable.
- Build or test failures must be reported with their exact failing command and relevant output.

## Out of scope

- Visual redesign.
- Indonesian localization.
- CMS or admin tooling.
- Proving private contracts, client authorization, or individual contribution percentages.
- Repairing third-party project hosting or TLS configuration.
