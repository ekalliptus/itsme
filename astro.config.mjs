// astro.config.mjs
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pagesDir = fileURLToPath(new URL('./src/pages', import.meta.url));

// Map each sitemap URL to the last-modified time of its source .astro file.
// Gives Google a real lastmod instead of leaving crawl/index fields blank in
// Search Console and signals when a page is worth re-fetching.
function sourceLastmod(itemUrl) {
  let pathname = new URL(itemUrl).pathname.replace(/\/+$/, '');
  if (pathname === '') pathname = '/index';
  const file = `${pagesDir}${pathname}.astro`;
  try {
    return statSync(file).mtime.toISOString();
  } catch {
    return undefined;
  }
}

export default defineConfig({
  site: 'https://bio.ekalliptus.com',
  integrations: [
    sitemap({
      serialize(item) {
        const lastmod = sourceLastmod(item.url);
        if (lastmod) item.lastmod = lastmod;
        return item;
      },
      changefreq: 'monthly',
      priority: 0.7,
    }),
  ],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  build: {
    inlineStylesheets: 'auto',
  },
});
