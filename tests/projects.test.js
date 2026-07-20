/**
 * Tests for Projects Data
 * Validates PROJECTS data structure and required fields
 */
import { existsSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { PROJECT_CATEGORIES, PROJECTS } from '../src/data/projects.js';

const EXCLUDED_PROJECTS = [
  'Donasi Wakaf Sumur',
  'Rumah Quran Al Fatihah',
  'Al Fatihah Homeschooling',
];

describe('Projects Data', () => {
  it('PROJECTS has at least one entry', () => {
    expect(PROJECTS.length).toBeGreaterThan(0);
  });

  it('every project has required fields: icon, name, description, tags, liveUrl', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: PROJECTS.length - 1 }),
        (index) => {
          const p = PROJECTS[index];
          expect(typeof p.icon).toBe('string');
          expect(typeof p.name).toBe('string');
          expect(p.name.length).toBeGreaterThan(0);
          expect(typeof p.description).toBe('string');
          expect(Array.isArray(p.tags)).toBe(true);
          expect(p.tags.length).toBeGreaterThan(0);
          expect(typeof p.liveUrl).toBe('string');
          expect(p.liveUrl).toMatch(/^https?:\/\//);
        }
      ),
      { numRuns: PROJECTS.length }
    );
  });

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
