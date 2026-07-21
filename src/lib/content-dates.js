import { spawnSync } from 'node:child_process';

const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

export const PAGE_CONTENT_PATHS = {
  '/': ['src/pages/index.astro', 'src/data/projects.js'],
  '/about/': ['src/pages/about.astro'],
  '/contact/': ['src/pages/contact.astro'],
  '/projects/': ['src/pages/projects.astro', 'src/data/projects.js'],
  '/skills/': ['src/pages/skills.astro', 'src/data/skills.js'],
};

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
