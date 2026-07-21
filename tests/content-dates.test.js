import { describe, expect, it, vi } from 'vitest';
import { normalizeTimestamp, PAGE_CONTENT_PATHS, resolveContentDate } from '../src/lib/content-dates.js';

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
    const git = vi.fn();
    expect(resolveContentDate(['src/pages/index.astro'], {
      env: { CONTENT_COMMIT_DATE: '2026-07-20T16:51:04Z' },
      now: new Date('2026-07-21T00:00:00Z'),
      git,
    })).toBe('2026-07-20T16:51:04.000Z');
    expect(git).not.toHaveBeenCalled();
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

describe('PAGE_CONTENT_PATHS', () => {
  it('maps every canonical route to its content sources', () => {
    expect(PAGE_CONTENT_PATHS).toEqual({
      '/': ['src/pages/index.astro', 'src/data/projects.js'],
      '/about/': ['src/pages/about.astro'],
      '/contact/': ['src/pages/contact.astro'],
      '/projects/': ['src/pages/projects.astro', 'src/data/projects.js'],
      '/skills/': ['src/pages/skills.astro', 'src/data/skills.js'],
    });
  });
});
