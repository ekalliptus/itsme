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
