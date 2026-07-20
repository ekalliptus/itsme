# Portfolio Data Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the portfolio identity, project data, metadata, deployment configuration, profile photo, and repository documentation match the approved verified data.

**Architecture:** Keep the existing Astro static-site structure and UI. Update source-owned content in place, use `PROJECTS` as the single project-count source, keep `BaseLayout.astro` as the sitewide metadata source, and leave unavailable project URLs out of the exported dataset until restored.

**Tech Stack:** Astro 6, JavaScript, Astro components, Vitest, Bun, ImageMagick or cwebp, Apache `.htaccess`, Cloudflare static assets.

---

## File map

- `src/data/projects.js`: visible project catalog and observable descriptions.
- `tests/projects.test.js`: project count, exclusions, uniqueness, categories, URL shape, and preview integrity.
- `src/layouts/BaseLayout.astro`: canonical URL, global identity, social graph, hreflang, OG, and JSON-LD.
- `src/pages/{index,about,skills,projects,contact}.astro`: page schemas and page-specific approved copy.
- `src/components/{Nav,Footer}.astro`: visible brand, social links, and location.
- `src/data/skills.js`: remove stale GitHub/count provenance.
- `public/img/ekal.webp`: optimized approved profile photo.
- `astro.config.mjs`, `public/robots.txt`, `public/.htaccess`: production-domain configuration.
- `.htaccess`: delete contradictory non-deployed configuration.
- `package.json`, `bun.lock`: remove unused Lighthouse dependency.
- `README.md`: Astro/Bun operating instructions.

### Task 1: Lock project catalog behavior with tests

**Files:**
- Modify: `tests/projects.test.js`

- [ ] **Step 1: Add failing catalog assertions**

Add tests alongside the existing project tests:

```js
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PROJECT_CATEGORIES, PROJECTS } from '../src/data/projects.js';

const EXCLUDED_PROJECTS = [
  'Donasi Wakaf Sumur',
  'Rumah Quran Al Fatihah',
  'Al Fatihah Homeschooling',
];

describe('published project catalog', () => {
  it('publishes exactly 41 verified projects', () => {
    expect(PROJECTS).toHaveLength(41);
  });

  it('excludes duplicate and unavailable projects', () => {
    expect(PROJECTS.map(({ name }) => name)).not.toEqual(
      expect.arrayContaining(EXCLUDED_PROJECTS),
    );
  });

  it('has unique names and live URLs', () => {
    expect(new Set(PROJECTS.map(({ name }) => name)).size).toBe(PROJECTS.length);
    expect(new Set(PROJECTS.map(({ liveUrl }) => liveUrl)).size).toBe(PROJECTS.length);
  });

  it('uses declared categories', () => {
    const categoryIds = new Set(PROJECT_CATEGORIES.map(({ id }) => id));
    for (const project of PROJECTS) expect(categoryIds.has(project.category)).toBe(true);
  });

  it('references only existing preview assets', () => {
    for (const project of PROJECTS) {
      if (project.previewImage) expect(existsSync(`public${project.previewImage}`)).toBe(true);
    }
  });
});
```

Merge imports with existing imports rather than duplicating them.

- [ ] **Step 2: Verify the new tests fail for the current 44-item catalog**

Run: `bun test tests/projects.test.js`

Expected: FAIL on length, excluded projects, and missing Bayar Zakat preview.

- [ ] **Step 3: Commit the failing contract**

```bash
git add tests/projects.test.js
git commit -m "test: define verified project catalog"
```

### Task 2: Publish the verified 41-project catalog

**Files:**
- Modify: `src/data/projects.js`
- Delete: `public/img/projects/donasi-wakafsumur-com.png`
- Delete: `public/img/projects/rumahquranalfatihah-com.png`
- Delete: `public/img/projects/alfatihahhomeschooling-com.png`

- [ ] **Step 1: Remove three non-published entries**

Delete the complete objects named `Donasi Wakaf Sumur`, `Rumah Quran Al Fatihah`, and `Al Fatihah Homeschooling`. Delete their now-orphaned preview files after confirming each filename matches its removed object.

- [ ] **Step 2: Make Bayar Zakat use the existing fallback**

Change only its preview field:

```js
previewImage: null,
```

- [ ] **Step 3: Replace unsupported descriptions with observable copy**

Use these exact descriptions:

```js
// Media Pro
description: 'Digital marketing agency website presenting web development, Google Ads, Meta Ads, SEO, and consulting services.',

// Al Hidayah Islamic School
description: 'Official Al Hidayah Boarding School website presenting admissions, school programs, facilities, news, and contact information.',

// Jagoanzaidev
description: 'Indonesian learning platform for practical server administration guides, infrastructure fundamentals, and developer resources.',

// Miemie Brownie
description: 'Online storefront for Miemie Brownie, presenting its brownie products, brand information, and ordering channels in Tegal.',
```

For remaining entries, remove private-feature assertions such as admin dashboards, tracking, monitoring, verified distribution, escrow, or guaranteed availability unless directly visible on the linked public page. Preserve project name, URL, category, tags, and layout data.

- [ ] **Step 4: Run project tests**

Run: `bun test tests/projects.test.js`

Expected: PASS; output reports the project suite passing with 41 entries.

- [ ] **Step 5: Commit catalog cleanup**

```bash
git add src/data/projects.js public/img/projects
git commit -m "fix: publish verified project catalog"
```

### Task 3: Normalize global identity and metadata

**Files:**
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/components/Nav.astro`
- Modify: `src/components/Footer.astro`

- [ ] **Step 1: Update the metadata constants and Person schema**

In `BaseLayout.astro`, set:

```js
const SITE = 'https://bio.ekalliptus.com';
```

Use `8+ years`, `knowsLanguage: ['en']`, these social URLs, and the official institution name:

```js
sameAs: [
  'https://github.com/ekalliptus',
  'https://www.linkedin.com/in/ekalliptus/',
],
alumniOf: {
  '@type': 'EducationalOrganization',
  name: 'Universitas Bina Sarana Informatika',
},
```

Delete `websiteSchema.potentialAction`. Delete `hreflang="id"`, `geo.position`, and `ICBM`. Retain broad region/place metadata. Delete every Twitter/X meta element, including card, site, creator, title, description, image, image alt, and domain.

- [ ] **Step 2: Normalize visible brand and footer identity**

Replace every `єкαℓℓιρтuѕ` spelling in `Nav.astro` and `Footer.astro` with exact `єкαℓℓιρтus`. Set footer links to GitHub and LinkedIn above; remove Twitter. Display `Tegal, Jawa Tengah, Indonesia`.

- [ ] **Step 3: Build and inspect generated metadata**

Run: `bun run build`

Expected: exit 0.

Run:

```bash
grep -RInE 'SearchAction|twitter:|hreflang="id"|geo\.position|ICBM|github\.com/anrdart|linkedin\.com/in/alulanr' dist
```

Expected: no output.

- [ ] **Step 4: Commit global identity changes**

```bash
git add src/layouts/BaseLayout.astro src/components/Nav.astro src/components/Footer.astro
git commit -m "fix: normalize portfolio identity metadata"
```

### Task 4: Update page schemas and approved copy

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/pages/about.astro`
- Modify: `src/pages/skills.astro`
- Modify: `src/pages/projects.astro`
- Modify: `src/pages/contact.astro`
- Modify: `src/data/skills.js`

- [ ] **Step 1: Replace page-schema origins**

Change every hard-coded page URL from `https://ekalliptus.id` to `https://bio.ekalliptus.com` in the five page files.

- [ ] **Step 2: Update home counts and experience**

Keep `const projectCount = PROJECTS.length`. Change `Five years` and `5+` to `Eight years` and `8+`. Remove the extra plus from project rendering:

```astro
<span class="hero-stat-num">{projectCount}</span>
```

Keep the pillar title derived from `projectCount`, rendered as `41 products delivered for clients across Indonesia.`

- [ ] **Step 3: Update About content and CV action**

Replace all `5+` claims with `8+`; replace `59-plus repositories` with `41 projects`; replace `clients worldwide` with `clients across Indonesia`. Keep the SharePoint URL. Use:

```astro
<h3 class="cv-title">View My Resume</h3>
<p class="cv-desc">8+ years of experience delivering React, Next.js, Laravel, and Flutter projects for clients across Indonesia.</p>
...
View CV ↗
```

Keep all three roles; spell `IT Support Specialist` consistently.

- [ ] **Step 4: Update Skills and Projects copy**

In `skills.astro`, replace `59-plus repositories` with `41 projects` and avoid “mastered” where the page only demonstrates familiarity. In `projects.astro`, rely on `PROJECTS.length` and use the canonical schema URL. In `skills.js`, replace the stale `github.com/anrdart - 59 repos` comment with:

```js
// Skills represented across published work and public repositories.
```

- [ ] **Step 5: Update Contact schema, socials, and form destination**

Use English as the only `availableLanguage`. Use only:

```js
const socials = [
  { label: 'GitHub', href: 'https://github.com/ekalliptus', icon: '⌥' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/ekalliptus/', icon: '◈' },
];
```

Set:

```astro
action="https://formsubmit.co/support@ekalliptus.com"
<input type="hidden" name="_next" value="https://bio.ekalliptus.com/contact?sent=true" />
```

- [ ] **Step 6: Run tests and build**

Run: `bun test && bun run build`

Expected: both commands exit 0.

- [ ] **Step 7: Commit page content changes**

```bash
git add src/pages src/data/skills.js
git commit -m "fix: align portfolio copy with verified data"
```

### Task 5: Convert and install the approved profile photo

**Files:**
- Source: `/home/ekalliptus/Unduhan/Telegram Desktop/photo_2026-07-11_13-55-47.jpg`
- Modify: `public/img/ekal.webp`
- Verify: `src/pages/about.astro`

- [ ] **Step 1: Inspect available native converter**

Run:

```bash
command -v magick || command -v cwebp
```

Expected: one executable path. If neither exists, stop and report the missing converter; do not add a project dependency for one conversion.

- [ ] **Step 2: Convert, resize, orient, and strip metadata**

With ImageMagick:

```bash
magick '/home/ekalliptus/Unduhan/Telegram Desktop/photo_2026-07-11_13-55-47.jpg' -auto-orient -resize '800x800^' -gravity center -extent 800x800 -strip -quality 82 public/img/ekal.webp
```

If only `cwebp` exists, first crop/resize with an installed image utility; do not distort the source. The result must be square, 800×800, WebP, and stripped of EXIF metadata.

- [ ] **Step 3: Verify output**

Run:

```bash
file public/img/ekal.webp
identify public/img/ekal.webp 2>/dev/null || true
```

Expected: WebP, 800×800. Confirm `about.astro` still supplies `alt="Haikal Akhalul Azhar"`, explicit width/height, eager loading, and high fetch priority.

- [ ] **Step 4: Build**

Run: `bun run build`

Expected: exit 0.

- [ ] **Step 5: Commit profile asset**

```bash
git add public/img/ekal.webp src/pages/about.astro
git commit -m "feat: update profile photo"
```

If `about.astro` required no edit, stage only the image.

### Task 6: Align production-domain configuration

**Files:**
- Modify: `astro.config.mjs`
- Modify: `public/robots.txt`
- Modify: `public/.htaccess`
- Delete: `.htaccess`

- [ ] **Step 1: Set Astro and robots canonical domain**

Use:

```js
site: 'https://bio.ekalliptus.com',
```

Set the robots sitemap URL to:

```text
Sitemap: https://bio.ekalliptus.com/sitemap-index.xml
```

Replace other old absolute origins in `public/robots.txt` with the same host.

- [ ] **Step 2: Update deployed Apache redirect**

Preserve security and cache headers. Replace the canonical redirect target in `public/.htaccess` with:

```apache
RewriteCond %{HTTP_HOST} !^bio\.ekalliptus\.com$ [NC]
RewriteRule ^ https://bio.ekalliptus.com%{REQUEST_URI} [R=301,L]
```

Delete root `.htaccess` so `public/.htaccess` remains the sole deployed source.

- [ ] **Step 3: Build and verify generated URLs**

Run: `bun run build`

Expected: exit 0; `dist/.htaccess` exists.

Run:

```bash
git grep -nE 'https://(www\.)?ekalliptus\.id|itsme\.ekalliptus\.id' -- ':!docs/**'
```

Expected: no output.

- [ ] **Step 4: Commit deployment alignment**

```bash
git add astro.config.mjs public/robots.txt public/.htaccess .htaccess
git commit -m "fix: align production domain configuration"
```

### Task 7: Remove unused Lighthouse dependency and document operation

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Modify: `README.md`

- [ ] **Step 1: Remove Lighthouse because the repository has no script or maintained audit configuration**

Run: `bun remove --dev lighthouse`

Expected: `package.json` and `bun.lock` no longer include Lighthouse as a direct dependency.

- [ ] **Step 2: Replace stale README**

Write concise documentation containing:

```md
# Haikal Akhalul Azhar — Portfolio

Astro portfolio deployed at <https://bio.ekalliptus.com>.

## Requirements

- Bun 1.3.10+

## Development

```bash
bun install
bun run dev
```

## Checks

```bash
bun test
bun run build
```

## Preview

```bash
bun run preview
```

## Content

- Projects: `src/data/projects.js`
- Skills: `src/data/skills.js`
- Profile and SEO metadata: `src/layouts/BaseLayout.astro`
- Static images: `public/img/`

Project preview paths must reference existing files under `public/img/projects/` or use `previewImage: null` for the built-in fallback.

## Project screenshots

```bash
bun run screenshots
bun run screenshots -- --force
```

The screenshot script opens public project URLs with Playwright and stores PNG files in `public/img/projects/`.

## Deployment

`bun run build` produces `dist/`. Cloudflare serves that directory via `wrangler.jsonc`; Apache deployments use `public/.htaccess`, copied into `dist/` by Astro.
```

Use nested fences correctly in the actual README by closing each shell block before continuing.

- [ ] **Step 3: Run clean install checks**

Run: `bun install --frozen-lockfile && bun test && bun run build`

Expected: all commands exit 0.

- [ ] **Step 4: Commit maintenance changes**

```bash
git add package.json bun.lock README.md
git commit -m "docs: document Astro portfolio workflow"
```

### Task 8: Final stale-data and visual verification

**Files:**
- Modify only files implicated by a failing check.

- [ ] **Step 1: Run complete automated verification**

```bash
bun test
bun run build
git diff --check
node -e "import('./src/data/projects.js').then(({PROJECTS}) => { console.assert(PROJECTS.length === 41); console.log(PROJECTS.length) })"
```

Expected: tests/build pass, no whitespace errors, final command prints `41`.

- [ ] **Step 2: Verify preview integrity**

```bash
node -e "import('./src/data/projects.js').then(async ({PROJECTS}) => { const {existsSync}=await import('node:fs'); const missing=PROJECTS.filter(p => p.previewImage && !existsSync('public'+p.previewImage)); console.assert(missing.length === 0, JSON.stringify(missing)); })"
```

Expected: exit 0, no output.

- [ ] **Step 3: Search for stale approved-to-remove data**

```bash
git grep -nEi 'anrdart|alulanr|twitter\.com|x\.com|itsme\.ekalliptus\.id|59(\+|-plus| repositories)|5\+|five years|25,000|40-plus|clients worldwide|hreflang="id"|geo\.position|ICBM|haikalalul@gmail\.com' -- ':!docs/**'
```

Expected: no output. Review any match rather than blindly replacing it.

- [ ] **Step 4: Inspect generated metadata**

```bash
grep -RInE 'SearchAction|twitter:|hreflang="id"|geo\.position|ICBM|ekalliptus\.id' dist
```

Expected: no output except strings containing the approved `bio.ekalliptus.com` host; tighten the expression if needed to distinguish that host.

- [ ] **Step 5: Perform desktop and mobile browser checks**

Run `bun run dev`, then inspect `/`, `/about`, `/skills`, `/projects`, and `/contact` at approximately 1440×900 and 390×844. Confirm:

- new profile photo is centered, undistorted, and has accessible alt text;
- 41 project cards filter correctly;
- Bayar Zakat renders `Preview coming soon`, not a broken image;
- GitHub and LinkedIn point to `ekalliptus`; X is absent;
- canonical, OG, and JSON-LD URLs use `bio.ekalliptus.com`;
- visible brand is exactly `єкαℓℓιρтus`;
- form action and `_next` use approved addresses.

- [ ] **Step 6: Commit only if verification required fixes**

```bash
git add <only-files-fixed-during-verification>
git commit -m "fix: address portfolio audit findings"
```

Skip this commit when no files changed.

- [ ] **Step 7: Report final state without pushing**

Run:

```bash
git status --short --branch
git log --oneline origin/main..HEAD
```

Expected: clean working tree; atomic local commits listed. Do not push until explicitly requested.
