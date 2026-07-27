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

`src/data/projects.js` is a curated catalog: every entry is original work published from the public GitHub accounts `ekalliptus` or `web-alf`, has a verified live website, and carries a screenshot under `public/img/projects/`. WordPress sites, third-party forks, coursework, and projects without a reachable domain stay out. Adding an entry means adding its screenshot and updating `EXPECTED_COUNT` in `tests/projects.test.js`.

## Project screenshots

```bash
bun run screenshots
bun run screenshots -- --force
```

The screenshot script opens public project URLs with Playwright and stores PNG files in `public/img/projects/`.

## Deployment

`bun run build` produces `dist/`. Cloudflare serves that directory via `wrangler.jsonc`; Apache deployments use `public/.htaccess`, copied into `dist/` by Astro.

### AI crawler policy

Cloudflare may prepend managed crawler directives to the deployed `robots.txt`. The approved policy allows retrieval crawlers while keeping ordinary Google and Bing Search crawling enabled.

After deployment:

1. Open Cloudflare Dashboard → Security → Bots → AI Crawl Control.
2. Disable the blanket managed block or allow the approved retrieval crawlers.
3. Fetch `https://bio.ekalliptus.com/robots.txt`.
4. Confirm `Googlebot` and `Bingbot` are allowed.
5. Confirm approved retrieval crawlers are not disallowed by a managed section.

This dashboard setting is external to the repository. Allowing a crawler does not guarantee search rankings, citations, or AI Overview inclusion.
