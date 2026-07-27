# Project Catalog, Card, and Intro Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/projects` with the 11 audited projects from `ekalliptus` and `web-alf`, make every project card visually consistent, and smooth the intro word transitions.

**Architecture:** `src/data/projects.js` stays a static curated module and remains the single source for page copy, filters, and JSON-LD. `ProjectCard.astro` gains equal-height layout and technology-based tag styling. `projects.astro` switches from fake ARIA tabs to a filter button group with a real exit transition. `Preloader.astro` keeps its split-panel exit but overlaps outgoing and incoming words and stops cancelling hero animations early.

**Tech Stack:** Astro 6, vanilla TypeScript in Astro islands, plain CSS, Vitest, jsdom, Playwright, Bun.

**Spec:** `docs/superpowers/specs/2026-07-26-project-catalog-card-intro-design.md`

**Branch:** `feat/project-catalog-intro` (already checked out; the spec commit `cadb43a` is its tip).

---

## Working Agreements

- Run every command from the repository root `/Users/ekalliptus/Documents/dev/itsme`.
- Use `bun` for installs and scripts, `bunx vitest` for tests.
- `docs/**` is covered by a `*.md` ignore rule, so documentation commits need `git add -f`.
- Never stage `.claude/` or `Resume.zip`; they are pre-existing local files.
- Tests live in `tests/*.test.js` and run in jsdom via `vitest.config.js`.
- `tests/seo-output.test.js` reads `dist/`, so run `bun run build` before the full suite.

## File Structure

**Modified**

- `src/data/projects.js` — curated catalog and category list. Sole owner of project facts.
- `src/components/ProjectCard.astro` — card markup and card-scoped CSS.
- `src/pages/projects.astro` — page copy, filter UI, filter behaviour, ItemList schema.
- `src/pages/about.astro` — replaces the hardcoded `41 projects` claim.
- `src/pages/skills.astro` — replaces the hardcoded `41 projects` claim.
- `src/components/Preloader.astro` — word ticker timing and hero handoff.
- `scripts/screenshot-projects.mjs` — corrects the stale full-page comment.
- `tests/projects.test.js` — deterministic catalog validation.
- `tests/seo-output.test.js` — ItemList name coverage and count-copy guard.
- `README.md` — documents the curated catalog rule.

**Created**

- `public/img/projects/*.png` — new screenshots for the audited live URLs.

**Deleted**

- `public/img/projects/*.png` — screenshots for removed projects.

---

## Task 1: Deterministic catalog tests

Replace random sampling with per-project validation, and encode the audited catalog contract. The catalog still holds 40 legacy entries at this point, so the count and exclusion assertions are expected to fail until Task 2.

**Files:**
- Modify: `tests/projects.test.js:1-67`

- [ ] **Step 1: Rewrite the catalog test file**

Replace the entire contents of `tests/projects.test.js` with:

```js
/**
 * Tests for Projects Data
 * Validates the curated catalog contract for /projects.
 */
import { existsSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { PROJECT_CATEGORIES, PROJECTS } from '../src/data/projects.js';

const EXPECTED_COUNT = 11;

const EXCLUDED_PROJECTS = [
  'Donasi Wakaf Sumur',
  'Rumah Quran Al Fatihah',
  'Al Fatihah Homeschooling',
  'Wuzz Express',
  'Ahzelan',
  'Badal Umroh - Landing Page',
];

const EXCLUDED_HOSTS = ['ahzelan.com', 'lp.badalumroh.com', 'wuzz-express.vercel.app'];

const CONTENT_CATEGORIES = PROJECT_CATEGORIES
  .filter(({ id }) => id !== 'all')
  .map(({ id }) => id);

describe('Projects Data', () => {
  it(`publishes exactly ${EXPECTED_COUNT} audited projects`, () => {
    expect(PROJECTS).toHaveLength(EXPECTED_COUNT);
  });

  it.each(PROJECTS.map(project => [project.name, project]))(
    'validates the shape of %s',
    (_name, project) => {
      expect(typeof project.icon).toBe('string');
      expect(project.icon.length).toBeGreaterThan(0);
      expect(typeof project.name).toBe('string');
      expect(project.name.length).toBeGreaterThan(0);
      expect(typeof project.description).toBe('string');
      expect(project.description.length).toBeGreaterThan(0);
      expect(Array.isArray(project.tags)).toBe(true);
      expect(project.tags.length).toBeGreaterThanOrEqual(2);
      expect(project.tags.length).toBeLessThanOrEqual(4);
      for (const tag of project.tags) {
        expect(typeof tag).toBe('string');
        expect(tag.trim()).toBe(tag);
        expect(tag.length).toBeGreaterThan(0);
      }
      expect(typeof project.liveUrl).toBe('string');
      expect(() => new URL(project.liveUrl)).not.toThrow();
      expect(new URL(project.liveUrl).protocol).toBe('https:');
      expect(CONTENT_CATEGORIES).toContain(project.category);
      expect(typeof project.previewImage).toBe('string');
      expect(project.previewImage.startsWith('/img/projects/')).toBe(true);
      expect(existsSync(`public${project.previewImage}`)).toBe(true);
    },
  );

  it('has unique names, live URLs, and preview images', () => {
    expect(new Set(PROJECTS.map(({ name }) => name)).size).toBe(PROJECTS.length);
    expect(new Set(PROJECTS.map(({ liveUrl }) => liveUrl)).size).toBe(PROJECTS.length);
    expect(new Set(PROJECTS.map(({ previewImage }) => previewImage)).size).toBe(PROJECTS.length);
  });

  it('excludes projects rejected by the audit', () => {
    expect(PROJECTS.map(({ name }) => name)).not.toEqual(
      expect.arrayContaining(EXCLUDED_PROJECTS),
    );
    const hosts = PROJECTS.map(({ liveUrl }) => new URL(liveUrl).hostname);
    for (const host of EXCLUDED_HOSTS) expect(hosts).not.toContain(host);
  });

  it('excludes WordPress from the published stack', () => {
    for (const project of PROJECTS) {
      for (const tag of project.tags) {
        expect(tag.toLowerCase()).not.toContain('wordpress');
        expect(tag.toLowerCase()).not.toContain('woocommerce');
      }
    }
  });

  it('declares every category used by at least one project', () => {
    const used = new Set(PROJECTS.map(({ category }) => category));
    for (const id of CONTENT_CATEGORIES) expect(used.has(id)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the catalog tests to verify they fail**

Run: `bunx vitest run tests/projects.test.js`
Expected: FAIL. `publishes exactly 11 audited projects` reports `expected length 11, received 40`, and the exclusion and WordPress tests fail on legacy entries.

- [ ] **Step 3: Commit the failing contract**

```bash
git add tests/projects.test.js
git commit -m "test: assert audited project catalog contract"
```

---

## Task 2: Replace the catalog with the audited projects

Write the 11 approved projects in the approved order, remove obsolete categories, and drop the `previewImage: null` fallback path from the data.

**Files:**
- Modify: `src/data/projects.js:1-395`

- [ ] **Step 1: Replace the whole data module**

Replace the entire contents of `src/data/projects.js` with:

```js
// src/data/projects.js
// Curated catalog. Every entry is original work published from the public
// GitHub accounts `ekalliptus` or `web-alf`, has a verified live website, and
// is ordered by portfolio relevance. See
// docs/superpowers/specs/2026-07-26-project-catalog-card-intro-design.md

export const PROJECT_CATEGORIES = [
  { id: 'all',       label: 'All'       },
  { id: 'agency',    label: 'Agency'    },
  { id: 'platform',  label: 'Platform'  },
  { id: 'community', label: 'Community' },
  { id: 'tools',     label: 'Tools'     },
];

export const PROJECTS = [
  {
    icon: '🏢',
    name: 'Ekalliptus Digital',
    description: 'Situs agensi digital Ekalliptus - layanan pengembangan web dan aplikasi mobile dengan halaman layanan, portofolio, dan alur kontak. Dibangun dengan Astro dan Supabase di Cloudflare.',
    tags: ['Astro', 'TypeScript', 'Supabase', 'Cloudflare'],
    liveUrl: 'https://ekalliptus.com',
    category: 'agency',
    previewImage: '/img/projects/ekalliptus-com.png',
  },
  {
    icon: '💬',
    name: 'Tentaklik',
    description: 'Situs produk Tentaklik - platform layanan pelanggan omnichannel dengan halaman layanan, studi kasus, dan konten multibahasa. Dibangun dengan Astro dan Tailwind di Cloudflare.',
    tags: ['Astro', 'TypeScript', 'TailwindCSS', 'Cloudflare'],
    liveUrl: 'https://tentaklik.com',
    category: 'platform',
    previewImage: '/img/projects/tentaklik-com.png',
  },
  {
    icon: '✈️',
    name: 'Jagatrip',
    description: 'Situs layanan perjalanan Jagatrip - katalog paket wisata, formulir pemesanan, dan pelacakan prospek yang terhubung ke Google Apps Script. Dibangun dengan Astro di Cloudflare.',
    tags: ['Astro', 'TypeScript', 'Cloudflare'],
    liveUrl: 'https://jagatrip.com',
    category: 'platform',
    previewImage: '/img/projects/jagatrip-com.png',
  },
  {
    icon: '💚',
    name: 'Donasi Niat Baik',
    description: 'Platform donasi Yayasan Niat Baik - katalog program, alur donasi, dan panel admin dengan API Go serta basis data PostgreSQL yang dijalankan melalui Docker dan Nginx.',
    tags: ['React', 'TypeScript', 'Go', 'PostgreSQL'],
    liveUrl: 'https://donasi.niatbaik.org',
    category: 'platform',
    previewImage: '/img/projects/donasi-niatbaik-org.png',
  },
  {
    icon: '💧',
    name: 'Sedekah Air Minum',
    description: 'Platform donasi air bersih untuk masjid dan pesantren - halaman program, alur donasi, dan panel konten berbasis Supabase. Dibangun dengan Astro dan React di Cloudflare.',
    tags: ['Astro', 'React', 'Supabase', 'Cloudflare'],
    liveUrl: 'https://sedekahairminum.com',
    category: 'platform',
    previewImage: '/img/projects/sedekahairminum-com.png',
  },
  {
    icon: '🔗',
    name: 'Linknyamana',
    description: 'Layanan link-in-bio untuk kreator dan pelaku usaha - satu halaman tautan dengan kustomisasi tampilan, statistik klik, dan basis data Neon PostgreSQL.',
    tags: ['Astro', 'React', 'PostgreSQL', 'Cloudflare'],
    liveUrl: 'https://linknyamana.web.id',
    category: 'tools',
    previewImage: '/img/projects/linknyamana-web-id.png',
  },
  {
    icon: '👨‍💻',
    name: 'Jagoan ZAI Dev',
    description: 'Platform belajar berbahasa Indonesia untuk administrasi server dan dasar infrastruktur - materi terstruktur, panduan praktis, dan navigasi topik.',
    tags: ['Astro', 'React', 'TailwindCSS', 'Cloudflare'],
    liveUrl: 'https://jagoanzaidev.web.id',
    category: 'tools',
    previewImage: '/img/projects/jagoanzaidev-web-id.png',
  },
  {
    icon: '🌐',
    name: 'Media Pro',
    description: 'Situs agensi pemasaran digital Media Pro - profil layanan web, Google Ads, Meta Ads, dan SEO dengan struktur konten yang dioptimalkan mesin telusur.',
    tags: ['Astro', 'TypeScript', 'TailwindCSS', 'Cloudflare'],
    liveUrl: 'https://mediapro.work',
    category: 'agency',
    previewImage: '/img/projects/mediapro-work.png',
  },
  {
    icon: '📖',
    name: 'Penerbit Quran',
    description: 'Situs penerbit mushaf Quran - katalog produk cetak, informasi layanan penerbitan, dan formulir pemesanan yang terhubung ke Google Apps Script.',
    tags: ['Astro', 'TailwindCSS', 'Cloudflare'],
    liveUrl: 'https://penerbitquran.com',
    category: 'platform',
    previewImage: '/img/projects/penerbitquran-com.png',
  },
  {
    icon: '🤝',
    name: 'Yayasan Niat Baik',
    description: 'Profil resmi Yayasan Niat Baik - program pendidikan, sosial, Quran, dan kemanusiaan yang dibangun ulang menjadi situs statis Astro di Cloudflare.',
    tags: ['Astro', 'TailwindCSS', 'Cloudflare'],
    liveUrl: 'https://niatbaik.org',
    category: 'community',
    previewImage: '/img/projects/niatbaik-org.png',
  },
  {
    icon: '🛰️',
    name: 'Portfolio Ekalliptus',
    description: 'Situs portofolio ini - katalog proyek terkurasi, sphere skill Three.js, dan data terstruktur yang diuji otomatis. Dibangun dengan Astro dan Vitest di Cloudflare.',
    tags: ['Astro', 'Three.js', 'Vitest', 'Cloudflare'],
    liveUrl: 'https://bio.ekalliptus.com',
    category: 'tools',
    previewImage: '/img/projects/bio-ekalliptus-com.png',
  },
];
```

- [ ] **Step 2: Run the catalog tests to confirm the remaining failure is only missing screenshots**

Run: `bunx vitest run tests/projects.test.js`
Expected: FAIL. `publishes exactly 11 audited projects` now passes; `validates the shape of Tentaklik`, `Jagatrip`, `Donasi Niat Baik`, `Penerbit Quran`, and `Portfolio Ekalliptus` fail on `existsSync` because their screenshots do not exist yet.

- [ ] **Step 3: Commit the catalog replacement**

```bash
git add src/data/projects.js
git commit -m "feat: replace project catalog with audited GitHub projects"
```

---

## Task 3: Refresh screenshots and remove orphans

Capture previews for the five new URLs, refresh the six reused ones, and delete the screenshots that no longer belong to any project.

**Files:**
- Create: `public/img/projects/tentaklik-com.png`, `public/img/projects/jagatrip-com.png`, `public/img/projects/donasi-niatbaik-org.png`, `public/img/projects/penerbitquran-com.png`, `public/img/projects/bio-ekalliptus-com.png`
- Delete: obsolete files under `public/img/projects/`
- Modify: `scripts/screenshot-projects.mjs:4-7`

- [ ] **Step 1: Fix the stale script comment**

In `scripts/screenshot-projects.mjs`, replace:

```js
// Reads every project's liveUrl from src/data/projects.js, opens each live site
// in a headless Chromium, captures a full-page-height PNG at desktop width, and
// writes it to public/img/projects/<slug>.png. The ProjectCard then renders the
// real screenshot instead of the "Preview coming soon" placeholder.
```

with:

```js
// Reads every project's liveUrl from src/data/projects.js, opens each live site
// in a headless Chromium, captures an above-the-fold PNG at 1280x800, and writes
// it to public/img/projects/<slug>.png. ProjectCard renders that screenshot
// inside its browser-chrome frame.
```

- [ ] **Step 2: Install the Playwright browser if it is missing**

Run: `bunx playwright install chromium`
Expected: Chromium is present. The command is safe to re-run.

- [ ] **Step 3: Capture fresh screenshots for all 11 projects**

Run: `bun run screenshots -- --force`
Expected: `Done. 11 captured · 0 skipped · 0 failed.`

If any capture fails, retry that run once. If a URL still fails, stop and report it; the spec forbids shipping a project without a verified preview.

- [ ] **Step 4: Delete screenshots no longer referenced by the catalog**

```bash
node --input-type=module -e "
import { readdirSync, unlinkSync } from 'node:fs';
const { PROJECTS } = await import('./src/data/projects.js');
const keep = new Set(PROJECTS.map(p => p.previewImage.replace('/img/projects/', '')));
for (const file of readdirSync('public/img/projects')) {
  if (!keep.has(file)) { unlinkSync(\`public/img/projects/\${file}\`); console.log('removed', file); }
}
"
```

Expected: 33 `removed …` lines covering every legacy preview, including `ahzelan-com.png`, `lp-badalumroh-com.png`, and `tenta-id.png`.

- [ ] **Step 5: Run the catalog tests to verify they pass**

Run: `bunx vitest run tests/projects.test.js`
Expected: PASS, all tests green.

- [ ] **Step 6: Commit the assets**

```bash
git add public/img/projects scripts/screenshot-projects.mjs
git commit -m "chore: refresh project screenshots for audited catalog"
```

---

## Task 4: Equal-height, technology-tagged project cards

Give every card the same height, clamp the description, and derive tag styling from the technology name instead of the array index.

**Files:**
- Modify: `src/components/ProjectCard.astro:39-61`, `src/components/ProjectCard.astro:64-185`
- Test: `tests/seo-output.test.js`

- [ ] **Step 1: Replace the tag markup with technology-based styling**

In `src/components/ProjectCard.astro`, add the accent lookup to the frontmatter, directly under the existing destructuring:

```astro
const { icon, name, description, tags, liveUrl, previewImage } = Astro.props;

// Accent the tags that identify the primary runtime or framework, so the same
// technology always looks the same regardless of its position in the array.
const ACCENT_TAGS = new Set([
  'astro', 'react', 'vue', 'next.js', 'nuxt', 'flutter', 'three.js',
  'typescript', 'go', 'laravel', 'node.js',
]);
```

Then replace:

```astro
  <div class="proj-tags">
    {tags.map((tag, i) =>
      <span class:list={['tag', { 'tag-cyan': i % 2 === 0 }]}>{tag}</span>
    )}
  </div>
```

with:

```astro
  <div class="proj-tags">
    {tags.map(tag =>
      <span class:list={['tag', { 'tag-cyan': ACCENT_TAGS.has(tag.toLowerCase()) }]}>{tag}</span>
    )}
  </div>
```

- [ ] **Step 2: Make the card fill its grid row and clamp the description**

In the same file's `<style>` block, replace the `.project-card` rule:

```css
.project-card {
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}
```

with:

```css
.project-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0;
  overflow: hidden;
}
```

Replace the `.proj-name` rule with a version that reserves two lines:

```css
.proj-name {
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.3;
  min-height: 2.6em;
  display: flex;
  align-items: center;
}
```

Replace the `.proj-desc` rule so long copy cannot stretch a card:

```css
.proj-desc {
  font-size: 13px;
  color: var(--text-sec);
  line-height: 1.7;
  flex: 1;
  padding: 0 20px;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
}
```

Replace the `.proj-tags` rule so the tag row height is stable:

```css
.proj-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 12px 20px 0;
  min-height: 34px;
  align-content: flex-start;
}
```

- [ ] **Step 3: Build and inspect the rendered card**

Run: `bun run build`
Expected: `[build] Complete!` with 5 pages built.

Run: `grep -c 'class="project-card card reveal"' dist/projects/index.html`
Expected: `11`

- [ ] **Step 4: Commit the card changes**

```bash
git add src/components/ProjectCard.astro
git commit -m "fix: give project cards consistent height and tag styling"
```

---

## Task 5: Accessible filter group with a real transition

Replace the fake `tablist` with a labelled button group, and animate cards out before removing them from layout.

**Files:**
- Modify: `src/pages/projects.astro:35-50`, `src/pages/projects.astro:119-143`, `src/pages/projects.astro:145-175`

- [ ] **Step 1: Replace the filter markup**

In `src/pages/projects.astro`, replace:

```astro
    <!-- Category filter tabs -->
    <div class="filter-tabs reveal" role="tablist" aria-label="Filter projects by category">
      {PROJECT_CATEGORIES.map(cat => (
        <button
          class:list={['filter-btn', { active: cat.id === 'all' }]}
          data-filter={cat.id}
          role="tab"
          aria-selected={cat.id === 'all' ? 'true' : 'false'}
        >
          {cat.label}
          <span class="filter-count" data-count={cat.id}>
            {cat.id === 'all' ? PROJECTS.length : PROJECTS.filter(p => p.category === cat.id).length}
          </span>
        </button>
      ))}
    </div>
```

with:

```astro
    <!-- Category filters. These are toggle buttons, not ARIA tabs: they filter a
         single grid in place rather than swapping tab panels. -->
    <div class="filter-tabs reveal" role="group" aria-label="Filter projects by category">
      {PROJECT_CATEGORIES.map(cat => (
        <button
          type="button"
          class:list={['filter-btn', { active: cat.id === 'all' }]}
          data-filter={cat.id}
          aria-pressed={cat.id === 'all' ? 'true' : 'false'}
          aria-controls="projects-grid"
        >
          {cat.label}
          <span class="filter-count" data-count={cat.id}>
            {cat.id === 'all' ? PROJECTS.length : PROJECTS.filter(p => p.category === cat.id).length}
          </span>
        </button>
      ))}
    </div>
```

- [ ] **Step 2: Replace the wrapper CSS with a working exit state**

Replace:

```css
.project-wrap {
  transition: opacity 250ms ease, transform 250ms ease;
  content-visibility: auto;
  contain-intrinsic-size: auto 360px;
}

.project-wrap.hidden {
  display: none;
}
```

with:

```css
.project-wrap {
  transition: opacity 220ms var(--ease), transform 220ms var(--ease);
  content-visibility: auto;
  contain-intrinsic-size: auto 360px;
}

/* Exiting: still in layout, so the fade is visible. */
.project-wrap.leaving {
  opacity: 0;
  transform: scale(0.97);
  pointer-events: none;
}

/* Exited: removed from layout and from the focus order. */
.project-wrap.hidden {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .project-wrap { transition: none; }
  .project-wrap.leaving { opacity: 1; transform: none; }
}
```

- [ ] **Step 3: Replace the filter script**

Replace the whole `<script>` block at the end of the file with:

```astro
<script>
  const EXIT_MS = 220;

  function initFilter() {
    const btns = document.querySelectorAll<HTMLButtonElement>('.filter-btn');
    const cards = document.querySelectorAll<HTMLElement>('.project-wrap');
    const noResults = document.getElementById('no-results');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let token = 0;

    function apply(filter: string) {
      const run = ++token;
      let visible = 0;
      const leaving: HTMLElement[] = [];

      cards.forEach(card => {
        const show = filter === 'all' || card.dataset.category === filter;
        if (show) {
          visible++;
          card.classList.remove('hidden', 'leaving');
        } else if (!card.classList.contains('hidden')) {
          card.classList.add('leaving');
          leaving.push(card);
        }
      });

      const hide = () => {
        if (run !== token) return;   // a newer filter click already took over
        leaving.forEach(card => card.classList.add('hidden'));
      };

      if (reduceMotion) hide();
      else setTimeout(hide, EXIT_MS);

      if (noResults) noResults.style.display = visible === 0 ? 'block' : 'none';
    }

    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => {
          const active = b === btn;
          b.classList.toggle('active', active);
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        apply(btn.dataset.filter ?? 'all');
      });
    });
  }

  document.addEventListener('astro:page-load', initFilter);
</script>
```

- [ ] **Step 4: Build and verify the filter semantics**

Run: `bun run build`
Expected: `[build] Complete!`

Run: `grep -o 'role="group"' dist/projects/index.html && grep -c 'aria-pressed' dist/projects/index.html`
Expected: `role="group"` and `5`

Run: `grep -c 'role="tab"' dist/projects/index.html || true`
Expected: `0`

- [ ] **Step 5: Commit the filter changes**

```bash
git add src/pages/projects.astro
git commit -m "fix: make project filters accessible and animated"
```

---

## Task 6: Align project counts and page copy

Point every visible count at the catalog and remove the stale `41 projects` claims.

**Files:**
- Modify: `src/pages/about.astro:1-12`, `src/pages/about.astro:77`
- Modify: `src/pages/skills.astro:1-13`, `src/pages/skills.astro:27-32`
- Modify: `src/pages/projects.astro:22-33`
- Test: `tests/seo-output.test.js:56-73`

- [ ] **Step 1: Add the count guard to the SEO test**

In `tests/seo-output.test.js`, insert this test immediately after the existing `represents projects as a contiguous ItemList` test:

```js
  it('derives every visible project count from the catalog', () => {
    const names = PROJECTS.map(project => project.name);
    const { graph } = graphFor('/projects/');
    const list = graph.find(node => node['@type'] === 'ItemList');
    expect(list.itemListElement.map(item => item.item.name)).toEqual(names);

    for (const route of ['/', '/about/', '/skills/', '/projects/']) {
      const text = readFileSync(fileFor(route), 'utf8');
      expect(text).not.toMatch(/\b(40|41) projects\b/);
    }
  });
```

- [ ] **Step 2: Run the SEO test to verify it fails**

Run: `bun run build && bunx vitest run tests/seo-output.test.js -t 'derives every visible project count'`
Expected: FAIL on the `/about/` assertion, because the About page still renders `41 projects`.

- [ ] **Step 3: Replace the About page claim**

In `src/pages/about.astro`, add the import and count to the frontmatter, after the existing imports:

```astro
import LazyImage from '../components/LazyImage.astro';
import { PROJECTS } from '../data/projects.js';

const projectCount = PROJECTS.length;
```

Then replace:

```astro
            Across <strong>41 projects</strong> I've shipped everything from Islamic donation platforms and school systems to social-media tooling and interactive 3D sites. I reach for <strong>Vue, Next.js, Laravel, Go, and Python</strong> depending on what the problem actually needs, not what's trending that week.
```

with:

```astro
            Across <strong>{projectCount} published products</strong> I've shipped everything from donation platforms and travel booking sites to link-in-bio tooling and interactive 3D interfaces. I reach for <strong>Astro, React, Go, and Flutter</strong> depending on what the problem actually needs, not what's trending that week.
```

- [ ] **Step 4: Replace the Skills page claim**

In `src/pages/skills.astro`, add the import and count to the frontmatter, after the existing imports:

```astro
import { SKILLS_DATA } from '../data/skills.js';
import { PROJECTS } from '../data/projects.js';

const projectCount = PROJECTS.length;
```

Then replace:

```astro
      Drag the sphere to explore. Every node is something I've shipped with across
      41 projects - from Flutter apps and Astro sites to Python tooling
      and Three.js scenes. I pick the tool that fits the problem, not the trend,
      and go deep enough to make what I build fast and reliable.
```

with:

```astro
      Drag the sphere to explore. Every node is something I've shipped with across
      {projectCount} published products - from Flutter apps and Astro sites to Python
      tooling and Three.js scenes. I pick the tool that fits the problem, not the trend,
      and go deep enough to make what I build fast and reliable.
```

- [ ] **Step 5: Update the Projects page copy for a curated catalog**

In `src/pages/projects.astro`, replace:

```astro
  description={`Portfolio of ${PROJECTS.length} professional software engineering projects: web development, Islamic platforms, e-commerce, and more.`}
```

with:

```astro
  description={`Portfolio of ${PROJECTS.length} shipped software engineering products: web platforms, donation systems, and developer tools.`}
```

and replace:

```astro
    <p class="section-desc reveal">
      {PROJECTS.length} products shipped to production - web platforms, Islamic digital
      services, e-commerce, and public-facing tools for clients across Indonesia.
    </p>
```

with:

```astro
    <p class="section-desc reveal">
      {PROJECTS.length} products shipped to production - digital agency sites, donation
      platforms, travel booking, and developer tools, each running on its own domain.
    </p>
```

- [ ] **Step 6: Run the SEO test to verify it passes**

Run: `bun run build && bunx vitest run tests/seo-output.test.js`
Expected: PASS, 9 tests green.

- [ ] **Step 7: Commit the copy alignment**

```bash
git add src/pages/about.astro src/pages/skills.astro src/pages/projects.astro tests/seo-output.test.js
git commit -m "fix: derive project counts from the catalog"
```

---

## Task 7: Smooth the intro word transitions

Overlap the outgoing and incoming words, soften the easing, and stop cancelling hero animations before they finish.

**Files:**
- Modify: `src/components/Preloader.astro:114-148`, `src/components/Preloader.astro:196-235`

- [ ] **Step 1: Soften the word transition CSS**

In `src/components/Preloader.astro`, replace:

```css
  .pl-word {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    color: var(--text);
    opacity: 0;
    transform: translateY(26px);
    will-change: opacity, transform;
  }
  /* current word visible + centered; outgoing word fades up and out */
  .pl-word.is-in  { opacity: 1; transform: translateY(0); }
  .pl-word.is-out { opacity: 0; transform: translateY(-26px); }
  .pl-words.animate .pl-word {
    transition: opacity 420ms var(--ease), transform 520ms cubic-bezier(0.76, 0, 0.24, 1);
  }
```

with:

```css
  .pl-word {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    color: var(--text);
    opacity: 0;
    transform: translateY(10px);
    will-change: opacity, transform;
  }
  /* Current word centered; outgoing word drifts up while the next fades in.
     The travel is short and the curves match, so the two states cross over
     instead of one snapping out before the other arrives. */
  .pl-word.is-in  { opacity: 1; transform: translateY(0); }
  .pl-word.is-out { opacity: 0; transform: translateY(-10px); }
  .pl-words.animate .pl-word {
    transition:
      opacity 460ms cubic-bezier(0.22, 1, 0.36, 1),
      transform 460ms cubic-bezier(0.22, 1, 0.36, 1);
  }
```

- [ ] **Step 2: Keep the hero handoff alive until the hero finishes**

Replace:

```js
    const STEP = 760;                         // ms per word (480ms slide + ~280ms hold)
```

with:

```js
    const STEP = 820;                         // ms per word (460ms crossfade + ~360ms hold)
```

Then replace the `reveal` function:

```js
    function reveal() {
      pl.dataset.state = 'reveal';     // panels split + stage fades
      html.classList.remove('pl-lock');
      // Hand off to the hero opening as the panels lift.
      html.classList.remove('pl-intro');
      html.classList.add('pl-opening');
      // panels: 180ms delay + 1100ms travel ≈ 1280ms
      timers.push(setTimeout(() => {
        pl.dataset.state = 'done';
        html.classList.remove('pl-first', 'pl-opening');
      }, 1500));
    }
```

with:

```js
    function reveal() {
      pl.dataset.state = 'reveal';     // panels split + stage fades
      html.classList.remove('pl-lock');
      // Hand off to the hero opening as the panels lift.
      html.classList.remove('pl-intro');
      html.classList.add('pl-opening');

      // Panels finish at 180ms delay + 1100ms travel = 1280ms, so the overlay
      // can go away then.
      timers.push(setTimeout(() => { pl.dataset.state = 'done'; }, 1280));

      // The hero choreography runs 1300ms with delays up to 1100ms. Dropping
      // `pl-opening` earlier cancels those animations mid-flight and snaps the
      // hero into place, so hold the class until the last one has landed.
      timers.push(setTimeout(() => {
        html.classList.remove('pl-first', 'pl-opening');
      }, 2500));
    }
```

- [ ] **Step 3: Build and confirm the new timing shipped**

Run: `bun run build`
Expected: `[build] Complete!`

Run: `grep -rc 'cubic-bezier(0.22, 1, 0.36, 1)' dist/index.html`
Expected: at least `1`

- [ ] **Step 4: Verify the intro by eye**

Run: `bun run dev`
Open `http://localhost:4321/` in a fresh browser tab or private window (the intro is gated by `sessionStorage`).
Expected: `CRAFT`, `BUILD`, `SHIP`, and the brand overlap as they change, with no blank frame and no hero snap after the panels part. Stop the server with `Ctrl+C`.

- [ ] **Step 5: Commit the intro changes**

```bash
git add src/components/Preloader.astro
git commit -m "fix: smooth intro word crossfade and hero handoff"
```

---

## Task 8: Document the catalog rule and verify everything

**Files:**
- Modify: `README.md:30-46`

- [ ] **Step 1: Document the curated catalog**

In `README.md`, replace:

```md
Project preview paths must reference existing files under `public/img/projects/` or use `previewImage: null` for the built-in fallback.
```

with:

```md
`src/data/projects.js` is a curated catalog: every entry is original work published from the public GitHub accounts `ekalliptus` or `web-alf`, has a verified live website, and carries a screenshot under `public/img/projects/`. WordPress sites, third-party forks, coursework, and projects without a reachable domain stay out. Adding an entry means adding its screenshot and updating `EXPECTED_COUNT` in `tests/projects.test.js`.
```

- [ ] **Step 2: Run the full verification sequence**

Run: `bun run build && bunx vitest run`
Expected: `[build] Complete!` then `Test Files 5 passed (5)` with every test green.

- [ ] **Step 3: Confirm no excluded project survived anywhere**

Run: `grep -RIn --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=docs -iE 'wordpress|woocommerce|ahzelan|lp\.badalumroh|wuzz' src public/img README.md || echo CLEAN`
Expected: `CLEAN`

- [ ] **Step 4: Confirm the working tree holds only intended changes**

Run: `git status --short`
Expected: only `?? .claude/` and `?? Resume.zip`.

- [ ] **Step 5: Commit the documentation**

```bash
git add README.md
git commit -m "docs: describe the curated project catalog rule"
```

- [ ] **Step 6: Check the pages by eye**

Run: `bun run dev`
Open `http://localhost:4321/projects/`.
Expected: 11 cards, identical heights within each row, aligned CTA buttons, working filters at desktop and mobile widths, and keyboard focus that never lands on a hidden card. Stop the server with `Ctrl+C`.

---

## Definition of Done

- `/projects` lists exactly the 11 audited projects in the approved order.
- No WordPress, Berdu, Ahzelan, `Badal Umroh - Landing Page`, Wuzz Express, fork, or coursework entry remains.
- Every card has a current screenshot; `public/img/projects/` contains no orphans.
- Cards are equal height with clamped descriptions and aligned CTAs.
- Filters use button semantics, animate out, and respect reduced motion.
- Intro words crossfade with no blank frame and no hero snap.
- All visible counts and JSON-LD derive from `PROJECTS`.
- `bun run build` succeeds and `bunx vitest run` is fully green.
