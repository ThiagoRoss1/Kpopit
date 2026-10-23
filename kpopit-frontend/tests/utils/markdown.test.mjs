import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPosts, parseFrontmatter, renderMarkdown } from '../../src/utils/markdown.ts';

const CHANGELOG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../content/changelog');

test('frontmatter gives title, date and description; the rest is the body', () => {
    const { data, body } = parseFrontmatter('---\ntitle: "Hello"\ndate: 2026-10-23\ndescription: A post\n---\nBody text');
    assert.deepEqual(data, { title: 'Hello', date: '2026-10-23', description: 'A post' });
    assert.equal(body, 'Body text');
});

test('a post without a required field or with a bad date is rejected', () => {
    assert.throws(() => parseFrontmatter('no frontmatter'), /frontmatter/);
    assert.throws(() => parseFrontmatter('---\ntitle: x\ndate: 2026-10-23\n---\n'), /description/);
    assert.throws(() => parseFrontmatter('---\ntitle: x\ndate: 23/10\ndescription: y\n---\n'), /YYYY-MM-DD/);
});

test('headings, paragraphs, lists and inline marks render', () => {
    assert.equal(
        renderMarkdown('## Title\n\nSome **bold** and *it* `code`\nsame paragraph\n\n- one\n- [two](/idols)'),
        '<h3>Title</h3>\n<p>Some <strong>bold</strong> and <em>it</em> <code>code</code> same paragraph</p>\n<ul><li>one</li><li><a href="/idols">two</a></li></ul>',
    );
});

test('HTML in a post is escaped and unsafe links stay text', () => {
    const html = renderMarkdown('<script>alert(1)</script> [x](javascript:alert(1)) [y](http://plain.example)');
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(!html.includes('href="javascript'));
    assert.ok(!html.includes('href="http://'));
});

test('the changelog posts in the repo parse, newest first', () => {
    const sources = Object.fromEntries(fs.readdirSync(CHANGELOG).filter((f) => f.endsWith('.md'))
        .map((f) => [`/content/changelog/${f}`, fs.readFileSync(path.join(CHANGELOG, f), 'utf8')]));
    const posts = loadPosts(sources);
    assert.ok(posts.length >= 1);
    for (const post of posts) {
        assert.ok(post.title && post.description && post.html.includes('<'));
    }
    assert.deepEqual(posts.map((p) => p.date), [...posts.map((p) => p.date)].sort().reverse());
});
