import { existsSync, readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { PROJECTS } from '../src/data/projects.js';

const SITE = 'https://bio.ekalliptus.com';
const pageTypes = {
  '/': 'ProfilePage',
  '/about/': 'AboutPage',
  '/skills/': 'WebPage',
  '/projects/': 'CollectionPage',
  '/contact/': 'ContactPage',
};
const routes = Object.keys(pageTypes);
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

    const pageEntities = graph.filter(node => node.url === canonical && /Page$/.test(node['@type']));
    expect(pageEntities).toHaveLength(1);
    expect(pageEntities[0]['@type']).toBe(pageTypes[route]);
    expect(pageEntities[0]['@id']).toBe(`${canonical}#webpage`);
    expect(pageEntities[0].dateModified).toBeTruthy();

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
      // Pages end with '/'; hosted static assets (e.g. /cv/*.pdf) are exempt.
      expect(href === '/' || href.endsWith('/') || /\.\w+$/.test(href)).toBe(true);
    }
  });

  it('matches sitemap URLs and trustworthy dates', () => {
    const xml = readFileSync('dist/sitemap-0.xml', 'utf8');
    const locations = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
    expect(locations).toEqual(routes.map(route => `${SITE}${route}`).sort());
    expect(xml).not.toContain(`${SITE}/404/`);
    for (const [, value] of xml.matchAll(/<lastmod>(.*?)<\/lastmod>/g)) {
      const time = new Date(value).getTime();
      expect(Number.isNaN(time)).toBe(false);
      expect(time).toBeLessThanOrEqual(Date.now() + 5 * 60 * 1000);
    }
  });

  it('keeps the 404 response out of the index', () => {
    const dom = new JSDOM(readFileSync('dist/404.html', 'utf8'));
    const document = dom.window.document;
    expect(document.querySelector('meta[name="robots"]').content).toContain('noindex');
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.querySelector('link[hreflang]')).toBeNull();
    expect(document.querySelector('script[type="application/ld+json"]')).toBeNull();
  });

  it('represents projects as a contiguous ItemList', () => {
    const { graph } = graphFor('/projects/');
    const list = graph.find(node => node['@type'] === 'ItemList');
    const page = graph.find(node => node['@type'] === 'CollectionPage');
    expect(page.mainEntity).toEqual({ '@id': list['@id'] });
    expect(list.itemListElement).toHaveLength(PROJECTS.length);
    expect(list.itemListElement.map(item => item.position)).toEqual(PROJECTS.map((_, index) => index + 1));
    expect(list.itemListElement.map(item => item.item.url)).toEqual(PROJECTS.map(project => project.liveUrl));
  });

  it('derives every visible project count from the catalog', () => {
    const names = PROJECTS.map(project => project.name);
    const { graph } = graphFor('/projects/');
    const list = graph.find(node => node['@type'] === 'ItemList');
    expect(list.itemListElement.map(item => item.item.name)).toEqual(names);

    for (const route of ['/', '/about/', '/skills/', '/projects/']) {
      const text = readFileSync(fileFor(route), 'utf8');
      expect(text).not.toMatch(/\b(40|41) projects\b/);
    }
  });

  it('ships crawlable, accessible skill text without stale branding', () => {
    const skills = new JSDOM(readFileSync(fileFor('/skills/'), 'utf8')).window.document;
    expect(skills.querySelectorAll('.skills-list .skill-name').length).toBeGreaterThan(0);
    for (const route of routes) expect(readFileSync(fileFor(route), 'utf8')).not.toContain('Editor');
  });

  it('keeps the screenshot pipeline aligned with declared WebP previews', () => {
    const script = readFileSync('scripts/screenshot-projects.mjs', 'utf8');
    expect(script).toContain('project.previewImage');
    expect(script).toContain("type: 'webp'");
    expect(script).not.toContain("type: 'png'");
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
