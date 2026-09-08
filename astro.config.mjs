// astro.config.mjs
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { PAGE_CONTENT_PATHS, resolveContentDate } from './src/lib/content-dates.js';

export default defineConfig({
  site: 'https://bio.ekalliptus.com',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      serialize(item) {
        const path = new URL(item.url).pathname;
        const lastmod = resolveContentDate(PAGE_CONTENT_PATHS[path] ?? []);
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
