// scripts/screenshot-projects.mjs
// Captures each project's declared WebP preview image at 1280x800.
//
// Usage:
//   node scripts/screenshot-projects.mjs          # capture missing only
//   node scripts/screenshot-projects.mjs --force  # re-capture everything
//   node scripts/screenshot-projects.mjs --limit 5
//
// Exits 0 if at least one screenshot was captured (or all already existed);
// non-zero only if every site failed.

import { chromium } from 'playwright';
import { mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const { PROJECTS } = await import(join(ROOT, 'src/data/projects.js'));

// ── CLI flags ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) || Infinity : Infinity;

// Desktop capture size. Preview cards are letterboxed at ~400×180, so a wide
// 1280px source downsamples crisply and the top-of-page content (hero/nav)
// reads clearly inside the browser-chrome frame in ProjectCard.
const VIEWPORT = { width: 1280, height: 800 };
const NAV_TIMEOUT = 25_000;   // per-site hard cap
const SETTLE_MS = 1500;       // let above-the-fold assets/animations settle

/**
 * Derive a filesystem-safe slug from a URL's hostname.
 * e.g. https://donasi.wakafsumur.com -> donasi-wakafsumur-com
 */
function slugFromUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  } catch {
    // Fall back to a hash of the raw string if the URL is malformed.
    return 'site-' + Math.abs([...url].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0));
  }
}

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

function fmt(ms) {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

async function capture(browser, project) {
  const slug = slugFromUrl(project.liveUrl);
  const relativePath = project.previewImage.replace(/^\//, '');
  if (!relativePath.startsWith('img/projects/') || !relativePath.endsWith('.webp')) {
    throw new Error(`Invalid previewImage for ${project.name}: ${project.previewImage}`);
  }
  const outPath = join(ROOT, 'public', relativePath);

  if (!FORCE && await exists(outPath)) {
    return { status: 'skip', slug, outPath, ms: 0 };
  }

  const page = await browser.newPage({
    viewport: VIEWPORT,
    // Many of these sites are dark-themed; request dark color-scheme so the
    // screenshot matches the card's dark chrome.
    colorScheme: 'dark',
    deviceScaleFactor: 1,
  });

  const t0 = Date.now();
  try {
    await page.goto(project.liveUrl, {
      waitUntil: 'load',
      timeout: NAV_TIMEOUT,
    });
    // Let lazy images, fonts, and hero animations paint before capturing.
    await page.waitForTimeout(SETTLE_MS);
    await page.screenshot({
      path: outPath,
      fullPage: false,
      type: 'webp',
      quality: 82,
    });
    return { status: 'ok', slug, outPath, ms: Date.now() - t0 };
  } catch (err) {
    return { status: 'fail', slug, outPath, ms: Date.now() - t0, error: err.message };
  } finally {
    await page.close();
  }
}

async function main() {
  await mkdir(join(ROOT, 'public/img/projects'), { recursive: true });

  const targets = PROJECTS.slice(0, LIMIT);
  console.log(`\n  Capturing ${targets.length} project screenshots → public/img/projects/\n`);
  console.log(`  mode: ${FORCE ? 'force (re-capture all)' : 'incremental (skip existing)'}\n`);

  const browser = await chromium.launch({ headless: true });

  const results = [];
  try {
    for (const project of targets) {
      process.stdout.write(`  ${project.liveUrl.padEnd(42)} `);
      const res = await capture(browser, project);
      results.push(res);
      const tag =
        res.status === 'ok'   ? `\x1b[32m✓ captured\x1b[0m (${fmt(res.ms)})` :
        res.status === 'skip' ? `\x1b[90m· exists\x1b[0m` :
                                `\x1b[31m✗ failed\x1b[0m (${res.error?.slice(0, 60)})`;
      console.log(tag);
    }
  } finally {
    await browser.close();
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const ok    = results.filter(r => r.status === 'ok').length;
  const skip  = results.filter(r => r.status === 'skip').length;
  const fail  = results.filter(r => r.status === 'fail').length;

  console.log(`\n  Done. ${ok} captured · ${skip} skipped · ${fail} failed.\n`);

  if (results.length > 0 && ok === 0 && skip === 0) {
    // Every site failed - surface a non-zero exit so CI can catch it.
    console.error('  All captures failed. Check connectivity or timeouts.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Screenshot run crashed:', err);
  process.exit(1);
});
