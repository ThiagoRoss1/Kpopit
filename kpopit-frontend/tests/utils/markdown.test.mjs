import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isAllowedImage, loadPosts, parseFrontmatter, renderMarkdown } from '../../src/utils/markdown.ts';
import { postImageUrl } from '../../src/utils/posts.ts';

const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CHANGELOG = path.join(FRONTEND, 'content/changelog');
const BUCKET = 'https://images.example.com';

const post = (fields, body = 'Body text') =>
    `---\n${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\n${body}`;
const FIELDS = {
    title: '"Hello"', date: '2026-10-23', description: 'A post',
    image: '/blog/hello/thumb.png', imageAlt: 'A thumbnail',
};

test('frontmatter gives title, date, description, image and imageAlt; the rest is the body', () => {
    const { data, body } = parseFrontmatter(post(FIELDS));
    assert.deepEqual(data, {
        title: 'Hello', date: '2026-10-23', description: 'A post', image: '/blog/hello/thumb.png', imageAlt: 'A thumbnail',
    });
    assert.equal(body, 'Body text');
});

test('a post without a required field, with a bad date or a foreign thumbnail is rejected', () => {
    assert.throws(() => parseFrontmatter('no frontmatter'), /frontmatter/);
    for (const key of Object.keys(FIELDS)) {
        const { [key]: _, ...rest } = FIELDS;
        assert.throws(() => parseFrontmatter(post(rest)), new RegExp(`"${key}"`));
    }
    assert.throws(() => parseFrontmatter(post({ ...FIELDS, date: '23/10' })), /YYYY-MM-DD/);
    assert.throws(() => parseFrontmatter(post({ ...FIELDS, image: 'https://other.example/x.png' }), { imageOrigin: BUCKET }), /image/);
    assert.equal(parseFrontmatter(post({ ...FIELDS, image: `${BUCKET}/x.png` }), { imageOrigin: BUCKET }).data.image, `${BUCKET}/x.png`);
});

test('images are allowed only from site paths or the image bucket', () => {
    assert.ok(isAllowedImage('/blog/a/b.png'));
    assert.ok(isAllowedImage(`${BUCKET}/a.png`, BUCKET));
    for (const src of ['//evil.example/a.png', '/\\evil.example/a.png', 'https://evil.example/a.png',
        `${BUCKET}.evil.example/a.png`, 'javascript:alert(1)', 'data:image/png;base64,AAAA', 'blog/a.png']) {
        assert.ok(!isAllowedImage(src, BUCKET), src);
    }
    assert.ok(!isAllowedImage(`${BUCKET}/a.png`), 'no bucket configured');

    const html = renderMarkdown(`![ok](/blog/a/b.png) ![cdn](${BUCKET}/c.png) ![nope](https://evil.example/x.png)`, { imageOrigin: BUCKET });
    assert.match(html, /<img src="\/blog\/a\/b.png" alt="ok"/);
    assert.match(html, /<img src="https:\/\/images.example.com\/c.png" alt="cdn"/);
    assert.ok(!html.includes('evil.example'));
    assert.match(html, / nope<\/p>$/);
});

test('raw HTML in a post is escaped and unsafe links stay text', () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\nHi <img src=x onerror=alert(1)> [x](javascript:alert(1)) [y](http://plain.example)\n\n<div>block</div>');
    for (const raw of ['<script>', '<img src=x', '<div>', 'href="javascript', 'href="http://']) assert.ok(!html.includes(raw), raw);
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(html.includes('&lt;div&gt;block&lt;/div&gt;'));
});

test('headings, paragraphs, lists, marks, code, links, blockquotes and tables render', () => {
    const html = renderMarkdown([
        '# Title', '', 'Some **bold** and *it* `c<d>`', '', '- one', '- [two](/idols)', '', '1. first', '2. [site](https://x.com)',
        '', '> quoted', '', '```', '<tag>', '```', '', '| a | b |', '|---|---|', '| 1 | 2 |',
    ].join('\n'));
    for (const part of ['<h2>Title</h2>', '<strong>bold</strong>', '<em>it</em>', '<code>c&lt;d&gt;</code>',
        '<ul>', '<a href="/idols">two</a>', '<ol>', '<a href="https://x.com">site</a>', '<blockquote>',
        '<pre><code>&lt;tag&gt;', '<table>', '<th>a</th>', '<td>2</td>']) {
        assert.ok(html.includes(part), part);
    }
});

test('posts come newest first', () => {
    const posts = loadPosts({
        '/content/changelog/a.md': post({ ...FIELDS, date: '2026-01-02' }),
        '/content/changelog/b.md': post({ ...FIELDS, date: '2026-03-01' }),
        '/content/changelog/c.md': post({ ...FIELDS, date: '2025-12-31' }),
    });
    assert.deepEqual(posts.map((p) => p.slug), ['b', 'a', 'c']);
});

test('the post thumbnail becomes an absolute og:image URL', () => {
    assert.equal(postImageUrl({ image: '/blog/a/t.png' }), 'https://kpopit.net/blog/a/t.png');
    assert.equal(postImageUrl({ image: `${BUCKET}/t.png` }), `${BUCKET}/t.png`);
});

test('the changelog posts in the repo parse and their thumbnails exist', () => {
    const sources = Object.fromEntries(fs.readdirSync(CHANGELOG).filter((f) => f.endsWith('.md'))
        .map((f) => [`/content/changelog/${f}`, fs.readFileSync(path.join(CHANGELOG, f), 'utf8')]));
    const posts = loadPosts(sources);
    assert.ok(posts.length >= 1);
    for (const p of posts) {
        assert.ok(p.title && p.description && p.imageAlt && p.html.includes('<'));
        assert.ok(fs.existsSync(path.join(FRONTEND, 'public', p.image)), p.image);
    }
});
