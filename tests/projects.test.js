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
