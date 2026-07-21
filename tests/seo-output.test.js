import { existsSync, readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { PROJECTS } from '../src/data/projects.js';

const SITE = 'https://bio.ekalliptus.com';
const routes = ['/', '/about/', '/skills/', '/projects/', '/contact/'];
const fileFor = route => route === '/' ? 'dist/index.html' : `dist${route}index.html`;
const graphFor = route => {
  const dom = new JSDOM(readFileSync(fileFor(route), 'utf8'));
  const scripts = [...dom.window.document.querySelectorAll('script[type="application/ld+json"]')];
  expect(scripts).toHaveLength(1);
  return { dom, graph: JSON.parse(scripts[0].textContent)['@graph'] };
};

const collectIdRefs = value => {
  if (!value || typeof value !== 'object') return [];
  const own = Object.keys(value).length === 1 && typeof value['@id'] === 'string' ? [value['@id']] : [];
  return own.concat(Object.values(value).flatMap(collectIdRefs));
};

describe('generated SEO output', () => {
  it.each(routes)('keeps canonical metadata and graph aligned for %s', route => {
    const canonical = `${SITE}${route}`;
    const { dom, graph } = graphFor(route);
    const document = dom.window.document;
    expect(document.querySelector('link[rel="canonical"]').href).toBe(canonical);
    expect(document.querySelector('meta[property="og:url"]').content).toBe(canonical);

    const ids = graph.map(node => node['@id']).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
    const localRefs = graph.flatMap(collectIdRefs).filter(id => id.startsWith(SITE));
    for (const ref of localRefs) expect(ids).toContain(ref);

    const output = JSON.stringify(graph);
    for (const type of ['LocalBusiness', 'ProfessionalService', 'Offer', 'Service']) {
      expect(output).not.toContain(`\"@type\":\"${type}\"`);
    }

    for (const anchor of document.querySelectorAll('a[href^="/"]')) {
      const href = anchor.getAttribute('href').split(/[?#]/)[0];
      expect(href === '/' || href.endsWith('/')).toBe(true);
    }
  });

  it('matches sitemap URLs and trustworthy dates', () => {
    const xml = readFileSync('dist/sitemap-0.xml', 'utf8');
    for (const route of routes) expect(xml).toContain(`<loc>${SITE}${route}</loc>`);
    for (const [, value] of xml.matchAll(/<lastmod>(.*?)<\/lastmod>/g)) {
      const time = new Date(value).getTime();
      expect(Number.isNaN(time)).toBe(false);
      expect(time).toBeLessThanOrEqual(Date.now() + 5 * 60 * 1000);
    }
  });

  it('represents projects as a contiguous ItemList', () => {
    const { graph } = graphFor('/projects/');
    const list = graph.find(node => node['@type'] === 'ItemList');
    expect(list.itemListElement).toHaveLength(PROJECTS.length);
    expect(list.itemListElement.map(item => item.position)).toEqual(PROJECTS.map((_, index) => index + 1));
    expect(list.itemListElement.map(item => item.item.url)).toEqual(PROJECTS.map(project => project.liveUrl));
  });

  it('ships Cloudflare headers with a FormSubmit-compatible CSP', () => {
    expect(existsSync('public/_headers')).toBe(true);
    const headers = readFileSync('public/_headers', 'utf8');
    for (const value of ['Strict-Transport-Security', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy', 'Content-Security-Policy']) {
      expect(headers).toContain(value);
    }
    expect(headers).toContain("form-action 'self' https://formsubmit.co");
    expect(headers).toMatch(/\/_astro\/\*[\s\S]*immutable/);
    expect(headers).not.toMatch(/\/img\/\*[\s\S]*immutable/);
  });
});
