# SEO, Entity, and Performance Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the personal portfolio’s canonical URLs, modification dates, entity graph, Cloudflare headers, and Three.js lifecycle reliable without adding commercial service intent or unsupported claims.

**Architecture:** Keep the five-page Astro static architecture. Add one pure modification-date utility consumed by Astro config and homepage schema, assemble one connected JSON-LD graph in the shared layout, enforce trailing slashes at source, and isolate delayed hero initialization behind a cancellable generation token. Validate generated output rather than duplicating SEO rules in application code.

**Tech Stack:** Astro 6, Bun, JavaScript, Astro components, Vitest, jsdom, Playwright, Three.js, Cloudflare static assets.

---

## File map

- Create `src/lib/content-dates.js`: safe ISO timestamp validation and non-throwing content-date resolution.
- Create `tests/content-dates.test.js`: date validation, future rejection, environment/Git/omission behavior.
- Modify `astro.config.mjs`: trailing-slash policy and trustworthy sitemap dates.
- Modify `src/layouts/BaseLayout.astro`: canonical normalization and single JSON-LD graph.
- Modify all `src/pages/*.astro`: graph node fragments, canonical URLs, direct-answer summary, canonical links.
- Modify `src/components/Nav.astro` and `src/components/Footer.astro`: trailing-slash links.
- Modify `src/scripts/hero-field.js` and the home page script: cancellable initialization and WebGL lifecycle.
- Create `tests/hero-field-lifecycle.test.js`: navigation race and error-state unit contract.
- Create `public/_headers`: Cloudflare security and cache policy.
- Create `tests/seo-output.test.js`: generated canonical/schema/sitemap/header assertions.
- Modify `public/.htaccess`: remove contradictory slash-removal behavior.
- Modify `README.md`: Cloudflare AI crawler dashboard instructions and verification.

### Task 1: Trustworthy modification-date resolver

**Files:**
- Create: `src/lib/content-dates.js`
- Create: `tests/content-dates.test.js`

- [ ] **Step 1: Write failing resolver tests**

Create tests for this public API:

```js
import { describe, expect, it, vi } from 'vitest';
import { normalizeTimestamp, resolveContentDate } from '../src/lib/content-dates.js';

describe('normalizeTimestamp', () => {
  it('returns canonical ISO datetime for valid input', () => {
    expect(normalizeTimestamp('2026-07-20T23:51:04+07:00', new Date('2026-07-21T00:00:00Z')))
      .toBe('2026-07-20T16:51:04.000Z');
  });

  it.each(['', 'not-a-date', '2026-07-21'])('rejects invalid datetime %s', value => {
    expect(normalizeTimestamp(value, new Date('2026-07-21T00:00:00Z'))).toBeUndefined();
  });

  it('rejects dates more than five minutes in the future', () => {
    expect(normalizeTimestamp('2026-07-21T00:06:00Z', new Date('2026-07-21T00:00:00Z')))
      .toBeUndefined();
  });
});

describe('resolveContentDate', () => {
  it('prefers a valid explicit timestamp', () => {
    expect(resolveContentDate(['src/pages/index.astro'], {
      env: { CONTENT_COMMIT_DATE: '2026-07-20T16:51:04Z' },
      now: new Date('2026-07-21T00:00:00Z'),
      git: vi.fn(),
    })).toBe('2026-07-20T16:51:04.000Z');
  });

  it('uses a non-throwing Git fallback', () => {
    expect(resolveContentDate(['src/pages/index.astro'], {
      env: {},
      now: new Date('2026-07-21T00:00:00Z'),
      git: () => ({ status: 0, stdout: '2026-07-20T23:51:04+07:00\n' }),
    })).toBe('2026-07-20T16:51:04.000Z');
  });

  it('omits the date when no trustworthy source exists', () => {
    expect(resolveContentDate(['src/pages/index.astro'], {
      env: {},
      git: () => ({ status: 128, stdout: '' }),
    })).toBeUndefined();
  });
});
```

- [ ] **Step 2: Verify tests fail**

Run: `bun test tests/content-dates.test.js`

Expected: FAIL because `src/lib/content-dates.js` does not exist.

- [ ] **Step 3: Implement the minimum resolver**

Implement:

```js
import { spawnSync } from 'node:child_process';

const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

export function normalizeTimestamp(value, now = new Date()) {
  if (typeof value !== 'string' || !value.includes('T')) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  if (date.getTime() > now.getTime() + MAX_FUTURE_SKEW_MS) return undefined;
  return date.toISOString();
}

export function resolveContentDate(paths, options = {}) {
  const env = options.env ?? process.env;
  const now = options.now ?? new Date();
  const explicit = normalizeTimestamp(env.CONTENT_COMMIT_DATE, now);
  if (explicit) return explicit;

  const git = options.git ?? ((args) => spawnSync('git', args, { encoding: 'utf8' }));
  const result = git(['log', '-1', '--format=%cI', '--', ...paths]);
  if (result.status !== 0) return undefined;
  return normalizeTimestamp(result.stdout.trim(), now);
}
```

- [ ] **Step 4: Verify tests pass**

Run: `bun test tests/content-dates.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/content-dates.js tests/content-dates.test.js
git commit -m "feat(seo): add trustworthy content date resolver"
```

### Task 2: Canonical sitemap dates and trailing-slash policy

**Files:**
- Modify: `astro.config.mjs`
- Modify: `src/pages/index.astro`
- Test: `tests/content-dates.test.js`

- [ ] **Step 1: Add page dependency-map test**

Export `PAGE_CONTENT_PATHS` from the date module and assert exact dependencies:

```js
expect(PAGE_CONTENT_PATHS['/']).toEqual(['src/pages/index.astro', 'src/data/projects.js']);
expect(PAGE_CONTENT_PATHS['/projects/']).toEqual(['src/pages/projects.astro', 'src/data/projects.js']);
expect(PAGE_CONTENT_PATHS['/skills/']).toEqual(['src/pages/skills.astro', 'src/data/skills.js']);
```

Include `/about/` and `/contact/` with their route files.

- [ ] **Step 2: Run test to verify failure**

Run: `bun test tests/content-dates.test.js`

Expected: FAIL because `PAGE_CONTENT_PATHS` is absent.

- [ ] **Step 3: Add the map and consume it from Astro config**

Add:

```js
export const PAGE_CONTENT_PATHS = {
  '/': ['src/pages/index.astro', 'src/data/projects.js'],
  '/about/': ['src/pages/about.astro'],
  '/contact/': ['src/pages/contact.astro'],
  '/projects/': ['src/pages/projects.astro', 'src/data/projects.js'],
  '/skills/': ['src/pages/skills.astro', 'src/data/skills.js'],
};
```

Replace `statSync` sitemap logic with `resolveContentDate(PAGE_CONTENT_PATHS[pathname] ?? [])`. Set `trailingSlash: 'always'`. Only assign `item.lastmod` when the resolver returns a value. Keep `changefreq` and `priority`.

- [ ] **Step 4: Remove page-level `execSync`**

In `src/pages/index.astro`, import `resolveContentDate` and use:

```js
const lastModified = resolveContentDate(PAGE_CONTENT_PATHS['/']);
```

Build the schema node conditionally:

```js
...(lastModified ? { dateModified: lastModified } : {}),
```

- [ ] **Step 5: Test normal build and no-Git build**

Run:

```bash
bun test tests/content-dates.test.js
bun run build
work=$(mktemp -d)
git archive HEAD | tar -x -C "$work"
cp src/lib/content-dates.js "$work/src/lib/content-dates.js"
cp astro.config.mjs "$work/astro.config.mjs"
cp src/pages/index.astro "$work/src/pages/index.astro"
(cd "$work" && bun install --frozen-lockfile && env -u CONTENT_COMMIT_DATE bun run build)
rm -rf "$work"
```

Expected: both builds pass. Archive build omits untrusted dates rather than failing.

- [ ] **Step 6: Commit**

```bash
git add astro.config.mjs src/pages/index.astro src/lib/content-dates.js tests/content-dates.test.js
git commit -m "fix(seo): make sitemap dates deterministic"
```

### Task 3: Canonical trailing slashes everywhere

**Files:**
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/components/Nav.astro`
- Modify: `src/components/Footer.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/pages/about.astro`
- Modify: `src/pages/skills.astro`
- Modify: `src/pages/projects.astro`
- Modify: `src/pages/contact.astro`
- Modify: `public/.htaccess`

- [ ] **Step 1: Normalize canonical URL construction**

Use:

```js
const path = Astro.url.pathname === '/'
  ? '/'
  : `${Astro.url.pathname.replace(/\/+$/, '')}/`;
const canonicalUrl = `${SITE}${path}`;
```

Use `path`, not raw `Astro.url.pathname`, for breadcrumb segments and IDs.

- [ ] **Step 2: Update all internal route hrefs**

Use `/about/`, `/skills/`, `/projects/`, `/contact/`; keep root `/`. Update homepage pillars/CTAs, Nav, Footer, and FormSubmit `_next` to `/contact/?sent=true`.

- [ ] **Step 3: Update page-schema URLs**

Use exact canonical forms ending in `/` for all non-root pages.

- [ ] **Step 4: Remove Apache slash-removal rule**

Delete the rewrite block that removes trailing slashes. Preserve canonical-host and security rules.

- [ ] **Step 5: Build and inspect links**

Run:

```bash
bun run build
node -e "const fs=require('node:fs'); for (const f of ['about','skills','projects','contact']) { const h=fs.readFileSync('dist/'+f+'/index.html','utf8'); console.assert(h.includes('https://bio.ekalliptus.com/'+f+'/')); }"
```

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/layouts/BaseLayout.astro src/components/Nav.astro src/components/Footer.astro src/pages public/.htaccess
git commit -m "fix(seo): enforce canonical trailing slashes"
```

### Task 4: Build one connected JSON-LD graph

**Files:**
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/pages/about.astro`
- Modify: `src/pages/skills.astro`
- Modify: `src/pages/projects.astro`
- Modify: `src/pages/contact.astro`

- [ ] **Step 1: Change page schema contract to graph node fragments**

Replace `pageSchema?: object` with `pageNodes?: object[]`. Each page supplies nodes without `@context`.

- [ ] **Step 2: Define stable shared IDs**

In layout:

```js
const PERSON_ID = `${SITE}/#person`;
const WEBSITE_ID = `${SITE}/#website`;
const PAGE_ID = `${canonicalUrl}#webpage`;
const BREADCRUMB_ID = `${canonicalUrl}#breadcrumb`;
```

Give Person and WebSite `@id`. Reference Person from Website author. Add `mainEntityOfPage` on Person. Add page base node only once.

- [ ] **Step 3: Emit one graph script**

Assemble:

```js
const graph = [personNode, websiteNode, pageNode, ...(breadcrumbNode ? [breadcrumbNode] : []), ...pageNodes];
```

Render one JSON-LD script:

```astro
<script is:inline type="application/ld+json" set:html={JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': graph,
})} />
```

Delete separate Person, Website, breadcrumb, and page-schema scripts.

- [ ] **Step 4: Convert page nodes**

- Home: `ProfilePage` node uses `@id: PAGE_ID`, `mainEntity: { '@id': PERSON_ID }`.
- About: `AboutPage`, no embedded Person, no `Offer` or `Service`.
- Skills: `WebPage` referencing Person and Website.
- Contact: `ContactPage` referencing Person; move ContactPoint onto Person or provide a `#contact` node referenced by Person. Use `contactType: 'professional inquiries'`, `availableLanguage: ['English']`, no `areaServed`.
- Projects: `CollectionPage` plus `ItemList` node. Each `ListItem` contains contiguous position and an item with name, description, URL, without authored-work type claims.

- [ ] **Step 5: Build and validate graph shape**

Run:

```bash
bun run build
node - <<'NODE'
const fs = require('node:fs');
const html = fs.readFileSync('dist/index.html', 'utf8');
const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m => JSON.parse(m[1]));
console.assert(blocks.length === 1);
console.assert(Array.isArray(blocks[0]['@graph']));
const types = JSON.stringify(blocks[0]);
for (const forbidden of ['LocalBusiness','ProfessionalService','Offer','Service']) console.assert(!types.includes(`\"@type\":\"${forbidden}\"`));
NODE
```

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/layouts/BaseLayout.astro src/pages
git commit -m "refactor(seo): connect structured data graph"
```

### Task 5: Add generated-output SEO regression tests

**Files:**
- Create: `tests/seo-output.test.js`
- Modify: `package.json`

- [ ] **Step 1: Add a build-before-test script**

Add:

```json
"test:seo": "astro build && vitest --run tests/seo-output.test.js"
```

- [ ] **Step 2: Write output assertions**

The test must read all five `dist` pages and assert:

```js
const routes = ['/', '/about/', '/skills/', '/projects/', '/contact/'];
```

For each route:

- canonical equals `https://bio.ekalliptus.com${route}`;
- `og:url` equals canonical;
- one JSON-LD block parses;
- graph has unique `@id` values;
- every internal `@id` reference resolves;
- no forbidden business/service types;
- same-origin links use `/` or end `/`;
- sitemap contains the same five canonical URLs;
- every present `lastmod` is valid and no more than five minutes in the future;
- project ItemList length equals `PROJECTS.length`, positions start at 1 and remain contiguous.

- [ ] **Step 3: Run tests**

Run: `bun run test:seo`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/seo-output.test.js package.json
git commit -m "test(seo): verify generated canonical graph"
```

### Task 6: Fix hero-field initialization races

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/scripts/hero-field.js`
- Create: `tests/hero-field-lifecycle.test.js`

- [ ] **Step 1: Extract a testable scheduler contract**

Create exported functions in `hero-field.js` only where needed; keep rendering internals private. Add tests with fake timers for:

- cancelled scheduled load never initializes;
- stale generation never initializes after navigation;
- rejected import clears loading state;
- captured disconnected canvas is ignored.

Use a tiny exported `createHeroFieldLoader({ importField, requestIdle, cancelIdle, setTimer, clearTimer })` returning `schedule(canvas)` and `dispose()`.

- [ ] **Step 2: Verify lifecycle tests fail**

Run: `bun test tests/hero-field-lifecycle.test.js`

Expected: FAIL because loader factory does not exist.

- [ ] **Step 3: Implement cancellable loader**

The loader must:

- increment `generation` on schedule/dispose;
- retain idle or timeout handle and cancellation function;
- capture the passed canvas;
- initialize only when generation matches and `canvas.isConnected`;
- catch import failures;
- clear `loading` in `finally`;
- dispose active field once.

Use it from the home Astro script. On `astro:page-load`, pass the current canvas. On `astro:before-swap`, call loader disposal.

- [ ] **Step 4: Remove production-canvas WebGL probe**

In `_initRenderer`, probe with `document.createElement('canvas')` or directly instantiate in `try/catch`. Set `powerPreference: 'default'`.

Add bound context-loss handler:

```js
_onContextLost(event) {
  event.preventDefault();
  this.pause();
}
```

Register after renderer setup; remove in `dispose()`.

- [ ] **Step 5: Run lifecycle and full tests**

Run: `bun test tests/hero-field-lifecycle.test.js && bun test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.astro src/scripts/hero-field.js tests/hero-field-lifecycle.test.js
git commit -m "fix(perf): prevent stale hero WebGL initialization"
```

### Task 7: Add Cloudflare security and cache headers

**Files:**
- Create: `public/_headers`
- Extend: `tests/seo-output.test.js`

- [ ] **Step 1: Add failing header assertions**

Assert `public/_headers` contains HSTS, nosniff, DENY/frame-ancestors, referrer policy, permissions policy, CSP, and `form-action 'self' https://formsubmit.co`. Assert `/_astro/*` is immutable and `/img/*` is not immutable.

- [ ] **Step 2: Verify failure**

Run: `bun test tests/seo-output.test.js`

Expected: FAIL because `_headers` does not exist.

- [ ] **Step 3: Create compatible `_headers`**

Use:

```text
/*
  Strict-Transport-Security: max-age=31536000
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self' https://formsubmit.co; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; manifest-src 'self'
  Cache-Control: public, max-age=0, must-revalidate

/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/img/*
  Cache-Control: public, max-age=86400, must-revalidate

/sitemap-*.xml
  Cache-Control: public, max-age=0, must-revalidate

/robots.txt
  Cache-Control: public, max-age=0, must-revalidate
```

- [ ] **Step 4: Build and verify copied file**

Run: `bun run build && cmp public/_headers dist/_headers && bun run test:seo`

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add public/_headers tests/seo-output.test.js
git commit -m "feat(security): add Cloudflare response headers"
```

### Task 8: Improve direct-answer professional summary

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Replace only the hero description**

Use factual portfolio copy:

```astro
<p class="hero-desc reveal">
  Haikal Akhalul Azhar is a software engineer based in Tegal, Indonesia,
  building cross-platform mobile apps and full-stack web products with Flutter,
  React, Next.js, and Laravel. Available for freelance, full-time, and consulting work.
</p>
```

Keep visual headline, roles, CTAs, and agency footer CTA unchanged.

- [ ] **Step 2: Build and inspect rendered text**

Run:

```bash
bun run build
grep -F "Haikal Akhalul Azhar is a software engineer based in Tegal, Indonesia" dist/index.html
```

Expected: one match.

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "fix(aeo): clarify professional profile summary"
```

### Task 9: Document AI crawler dashboard action

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add Cloudflare operations section**

Document:

```md
### AI crawler policy

Cloudflare may prepend managed crawler directives to the deployed `robots.txt`. The approved policy allows retrieval crawlers while keeping ordinary Google and Bing Search crawling enabled.

After deployment:

1. Open Cloudflare Dashboard → Security → Bots → AI Crawl Control.
2. Disable the blanket managed block or allow the approved retrieval crawlers.
3. Fetch `https://bio.ekalliptus.com/robots.txt`.
4. Confirm `Googlebot` and `Bingbot` are allowed.
5. Confirm approved retrieval crawlers are not disallowed by a managed section.

This dashboard setting is external to the repository. Allowing a crawler does not guarantee search rankings, citations, or AI Overview inclusion.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: document Cloudflare crawler policy"
```

### Task 10: Final browser, schema, and Lighthouse verification

**Files:**
- Modify only files implicated by a failing check.

- [ ] **Step 1: Run complete local checks**

```bash
bun install --frozen-lockfile
bun test
bun run test:seo
bun run build
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 2: Test Astro transition lifecycle**

Start preview, then run Playwright against it. Navigate `/` → `/about/` → `/` ten times. Collect console errors and assert none contain `WebGL`, `existing context`, or `THREE.WebGLRenderer`. Assert exactly one `#hero-field` on Home and none on About. Repeat with reduced motion.

- [ ] **Step 3: Run Lighthouse**

```bash
npx --yes lighthouse http://127.0.0.1:4321/ --output=json --output-path=/tmp/lh-mobile.json --chrome-flags='--headless --no-sandbox' --only-categories=performance,accessibility,best-practices,seo --quiet
npx --yes lighthouse http://127.0.0.1:4321/ --preset=desktop --output=json --output-path=/tmp/lh-desktop.json --chrome-flags='--headless --no-sandbox' --only-categories=performance,accessibility,best-practices,seo --quiet
```

Expected: SEO and Accessibility 1.0; no application WebGL console-error finding. Performance is recorded, not falsely guaranteed.

- [ ] **Step 4: Validate schema graph locally**

Parse every JSON-LD block; run `bun run test:seo`. After deployment, submit the live URL to Schema.org validator. Profile types may not qualify for a Google rich-result feature; zero schema errors is the success criterion.

- [ ] **Step 5: Verify live deployment headers and robots after push/deploy**

```bash
curl -sSI https://bio.ekalliptus.com/
curl -sS https://bio.ekalliptus.com/robots.txt
curl -sS https://bio.ekalliptus.com/sitemap-0.xml
```

Expected: approved headers present, Google/Bing allowed, approved AI retrieval policy reflected after dashboard change, canonical sitemap URLs and trustworthy/omitted dates.

- [ ] **Step 6: Commit only verification fixes**

```bash
git add <only-files-fixed-during-verification>
git commit -m "fix: address SEO hardening verification"
```

Skip when clean.

- [ ] **Step 7: Report branch without pushing unless requested**

```bash
git status --short --branch
git log --oneline main..HEAD
```

Expected: clean feature branch with atomic commits.
