# SEO, Entity, and Performance Hardening Design

**Date:** 2026-07-21
**Status:** Approved

## Goal

Harden `bio.ekalliptus.com` as a personal professional portfolio for reliable crawling, coherent entity understanding, stable structured data, safer Cloudflare delivery, and consistent mobile performance. Commercial and local-service search intent remains the responsibility of `ekalliptus.com`.

## Scope boundaries

This work will not add local service pages, pricing, city landing pages, `LocalBusiness`, `ProfessionalService`, or commercial offers. It will not create case-study claims until project role, dates, contribution, outcome, and attribution are supplied and verified. Existing project entries remain portfolio references, not proof of ownership or complete authorship.

## Canonical URL policy

- Use trailing slashes for all non-root routes.
- Configure Astro with `trailingSlash: 'always'`.
- Normalize canonical URLs in the shared layout.
- Align internal navigation, footer links, homepage links, page-schema URLs, breadcrumbs, Open Graph URLs, form redirect URLs, and sitemap locations.
- Remove Apache rules that contradict the trailing-slash policy.
- Verify slashless live requests redirect once to the matching canonical URL.

## Trustworthy modification dates

- Stop using filesystem modification times because checkout and deployment rewrite them.
- Remove unguarded synchronous Git execution from page frontmatter.
- Resolve content timestamps through one non-throwing build utility.
- Prefer a validated CI-provided ISO timestamp or Unix epoch when available.
- Otherwise query the Git committer date without throwing.
- Omit `lastmod` and `dateModified` when no trustworthy timestamp exists.
- Never publish future dates; reject timestamps beyond a small clock-skew tolerance.
- Use consistent dependency paths for each page. Projects depend on project data; Skills depends on skill data; Home depends on profile and visible summary data.
- The site must still build from a source archive without `.git` and without timestamp environment variables.

## Connected JSON-LD graph

Emit one JSON-LD object containing `@context` and `@graph` from `BaseLayout.astro`.

Stable nodes:

- Person: `https://bio.ekalliptus.com/#person`
- Website: `https://bio.ekalliptus.com/#website`
- Page: `<canonical>#webpage`
- Breadcrumb: `<canonical>#breadcrumb`
- Project list: `https://bio.ekalliptus.com/projects/#project-list`
- Contact point: `https://bio.ekalliptus.com/#contact`

Relationships:

- Website author references Person.
- Every page references Website through `isPartOf`.
- Profile and About pages reference Person as `mainEntity`.
- ContactPage references Person; Person owns the ContactPoint.
- Person references the homepage through `mainEntityOfPage`.
- Page references its Breadcrumb node.
- Projects page references its ItemList.

Remove anonymous duplicate Person objects. Remove About-page `Offer` and `Service`. Do not add business schema.

## Contact semantics

- Use `professional inquiries`, not `customer support`.
- Keep `support@ekalliptus.com` as the approved contact address.
- Advertise English as the professional contact language.
- Keep geography off the ContactPoint unless a service area is explicitly approved later.

## Project schema

Represent projects as a `CollectionPage` whose `mainEntity` is an `ItemList`. Each `ListItem` contains position, name, description, and external live URL. Do not type every entry as an authored `WebSite`, product, service, or software application. Schema must not imply ownership beyond visible portfolio listing.

## Direct-answer portfolio summary

Keep the existing visual hero and personal portfolio intent. Rewrite the first descriptive paragraph to state directly:

- Haikal Akhalul Azhar;
- software engineer;
- based in Tegal, Indonesia;
- cross-platform mobile and full-stack web focus;
- core stack;
- current professional availability.

Do not add agency sales copy, local-service keywords, pricing, or city-targeted landing pages. Commercial CTA continues to `ekalliptus.com`.

## Hero WebGL lifecycle

Retain the Three.js hero visual while preventing duplicate contexts and stale initialization across Astro transitions.

- Retain and cancel idle callback or timeout handles during navigation.
- Use an initialization generation token.
- Capture the intended canvas before dynamic import.
- Initialize only when the token remains current and the captured canvas is connected.
- Add import error handling and always clear loading state.
- Probe WebGL on a temporary canvas or rely on guarded renderer construction; never acquire and lose a context on the production canvas immediately before renderer creation.
- Handle `webglcontextlost`, prevent default recovery behavior, and pause rendering.
- Remove context listeners during disposal.
- Preserve dynamic import, DPR cap, reduced-motion static frame, IntersectionObserver pausing, mobile point reduction, and explicit GPU cleanup.

## Cloudflare response headers

Add `public/_headers`; Astro copies it to `dist/_headers` for Cloudflare static serving.

Required headers for all routes:

- `Strict-Transport-Security: max-age=31536000`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- A CSP compatible with Astro inline bootstrap/style output, local fonts/images, JSON-LD, WebGL, and `https://formsubmit.co` form submission.

CSP minimum:

- `default-src 'self'`
- `script-src 'self' 'unsafe-inline'`
- `style-src 'self' 'unsafe-inline'`
- `img-src 'self' data:`
- `font-src 'self'`
- `connect-src 'self'`
- `form-action 'self' https://formsubmit.co`
- `base-uri 'self'`
- `object-src 'none'`
- `frame-ancestors 'none'`
- `manifest-src 'self'`

Caching:

- Long immutable caching only for `/_astro/*`.
- Public images use shorter caching with revalidation because filenames are not content-hashed.
- HTML, sitemap, robots, and manifest remain revalidatable.

Apache `.htaccess` remains an Apache fallback but is not treated as the Cloudflare source of truth.

## AI crawler policy

The owner approved allowing AI retrieval crawlers. Cloudflare currently prepends managed rules that block GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, and others. This cannot be reliably fixed by repository `robots.txt` while managed rules remain enabled.

Implementation documentation must identify the required Cloudflare dashboard action: disable or customize managed AI crawler blocking, then verify the live merged `robots.txt`. Ordinary Google Search crawling must remain allowed. Allowing retrieval does not guarantee citations, rankings, or AI Overview inclusion.

## Testing

### Static output tests

After build, verify:

- canonical URLs are absolute and follow the trailing-slash policy;
- Open Graph, hreflang, page-schema URLs, internal links, and sitemap locations match canonical URLs;
- JSON-LD parses as one graph;
- every referenced internal `@id` resolves;
- graph contains one Person and one Website;
- no `LocalBusiness`, `ProfessionalService`, `Service`, or `Offer` node exists;
- ContactPoint uses professional-inquiry semantics and English;
- project ItemList positions and URLs match `PROJECTS`;
- modification dates, when present, are valid ISO datetimes and not future-dated;
- `_headers` contains required headers and FormSubmit-compatible CSP.

### Build resilience

- Build normally with Git available.
- Build from a copied source tree without `.git` and without timestamp variables; dates must be omitted and build must pass.
- Build with a valid explicit timestamp; output must be deterministic.
- Reject malformed or future timestamp inputs without failing the build.

### Browser lifecycle tests

Use existing Playwright dependency:

- navigate Home → About → Home repeatedly;
- navigate away before delayed import resolves;
- assert one hero canvas and no WebGL/context console errors;
- test reduced-motion rendering;
- test unavailable WebGL fallback;
- verify no stale renderer initializes after route swap.

### Release verification

- `bun test`
- `bun run build`
- Lighthouse mobile and desktop
- Schema.org validation
- Googlebot fetch
- live canonical and redirect checks
- live response-header checks
- live `robots.txt` check after Cloudflare policy change

## Success criteria

- Tests and production build pass.
- Source-archive build without Git passes.
- Structured data validates with no errors or warnings.
- Canonical and schema URL mismatches are eliminated.
- Lighthouse records no application-originated WebGL console errors.
- Cloudflare responses expose approved security headers.
- Search crawlers remain allowed.
- Approved AI retrieval policy is reflected in live Cloudflare-managed robots output.
- No new commercial-service intent or unsupported portfolio claim is introduced.
