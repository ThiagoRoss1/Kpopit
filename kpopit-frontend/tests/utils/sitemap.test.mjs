import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSitemap } from '../../app/sitemap.ts';

const locs = (xml) => [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);

test('lists every prerendered path once, as absolute URLs', () => {
    const xml = buildSitemap(['/', '/classic', '/idols', '/idols/6/karina-aespa', '/classic']);
    assert.deepEqual(locs(xml), [
        'https://kpopit.net/', 'https://kpopit.net/classic', 'https://kpopit.net/idols',
        'https://kpopit.net/idols/6/karina-aespa',
    ]);
    assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
});

test('has no lastmod (the build date would change on every deploy)', () => {
    assert.ok(!buildSitemap(['/', '/idols']).includes('<lastmod>'));
});

test('daily games change daily, other pages weekly', () => {
    const xml = buildSitemap(['/pixelated', '/privacy-policy']);
    assert.match(xml, /pixelated<\/loc>\n {4}<changefreq>daily/);
    assert.match(xml, /privacy-policy<\/loc>\n {4}<changefreq>weekly/);
});

test('skips the preview-build placeholder and escapes XML', () => {
    const xml = buildSitemap(['/idols/0/preview', "/a&b'"]);
    assert.deepEqual(locs(xml), ['https://kpopit.net/a&amp;b&apos;']);
});
