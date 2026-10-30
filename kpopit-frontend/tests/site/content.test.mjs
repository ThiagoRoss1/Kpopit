import test from 'node:test';
import assert from 'node:assert/strict';
import { CHANGELOG, CHANGE_TYPES, filterChangelog, parseChangeType } from '../../src/data/changelog.ts';
import { FAQ, faqJsonLd, visibleFaq } from '../../src/data/faq.ts';
import { PRIVACY, UPDATED } from '../../src/data/privacy.ts';
import { contactMailto } from '../../src/data/contact.ts';
import { formatPostDate, isNewPost, readNext, tagFromKey, tagKey } from '../../src/pages/Blog/blogData.ts';

const ALL_ON = { calendar: true, idol_xp: true, public_profile: true, collection: true };
const ALL_OFF = { calendar: false, idol_xp: false, public_profile: false, collection: false };

test('changelog entries are newest first, with ISO dates and known types', () => {
    const dates = CHANGELOG.map((e) => e.date);
    assert.deepEqual(dates, [...dates].sort().reverse());
    for (const entry of CHANGELOG) {
        assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/);
        assert.ok(entry.title.length > 0);
        for (const item of entry.items) assert.ok(CHANGE_TYPES.includes(item.type), item.type);
    }
});

test('the changelog ?type= filter keeps entries with that type and falls back to all', () => {
    assert.equal(filterChangelog(CHANGELOG, 'all').length, CHANGELOG.length);
    assert.ok(filterChangelog(CHANGELOG, 'new').every((e) => e.items.some((i) => i.type === 'new')));
    assert.ok(filterChangelog(CHANGELOG, 'change').length > 0);
    assert.equal(parseChangeType('change'), 'change');
    for (const bad of [null, '', 'NEW', 'other']) assert.equal(parseChangeType(bad), 'all');
});

test('the FAQ JSON-LD has exactly the visible questions', () => {
    for (const features of [ALL_ON, ALL_OFF]) {
        const groups = visibleFaq(features);
        const ld = faqJsonLd(groups);
        assert.equal(ld['@type'], 'FAQPage');
        assert.deepEqual(ld.mainEntity.map((q) => q.name), groups.flatMap((g) => g.items.map((i) => i.question)));
        for (const q of ld.mainEntity) assert.ok(q.acceptedAnswer.text.length > 20);
    }
});

test('flagged FAQ questions only show while their feature is on', () => {
    const questions = (features) => visibleFaq(features).flatMap((g) => g.items.map((i) => i.question));
    assert.ok(questions(ALL_ON).includes('Can I play days I missed?'));
    assert.ok(questions(ALL_ON).includes('What is Idol XP?'));
    assert.ok(!questions(ALL_OFF).includes('Can I play days I missed?'));
    assert.ok(!questions(ALL_OFF).includes('What is Idol XP?'));
    assert.equal(new Set(FAQ.flatMap((g) => g.items.map((i) => i.question))).size, FAQ.flatMap((g) => g.items).length, 'no duplicate questions');
});

test('the privacy policy has a date and every section has its short line and body', () => {
    assert.ok(UPDATED.length > 0);
    assert.equal(new Set(PRIVACY.map((s) => s.id)).size, PRIVACY.length);
    for (const s of PRIVACY) assert.ok(s.title && s.short && s.body, s.id);
    const text = PRIVACY.map((s) => `${s.body} ${(s.list ?? []).join(' ')}`).join(' ').toLowerCase();
    assert.ok(!text.includes('encrypt'), 'the player ID is not described as encrypted');
    assert.ok(text.includes('15 days'));
});

test('blog helpers: tag keys, dates, NEW within 7 days, read next by tag then time', () => {
    assert.equal(tagKey('Dev log'), 'dev-log');
    assert.equal(tagFromKey('dev-log'), 'Dev log');
    assert.equal(tagFromKey('nope'), null);
    assert.equal(formatPostDate('2026-07-02'), 'Jul 2, 2026');
    const today = new Date(2026, 6, 9);
    assert.equal(isNewPost('2026-07-02', today), true);
    assert.equal(isNewPost('2026-07-01', today), false);
    assert.equal(isNewPost('2026-07-10', today), false);

    const post = (slug, tag) => ({ slug, tag });
    const posts = [post('a', 'News'), post('b', 'Update'), post('c', 'News'), post('d', 'Update'), post('e', 'News')];
    assert.deepEqual(readNext(posts, posts[2]).map((p) => p.slug), ['a', 'e', 'b']);
});

test('the contact form mailto carries the topic, idol, message and reply-to', () => {
    const url = contactMailto('Wrong idol data', ' Height is wrong ', 'Karina (aespa)', 'me@example.com');
    assert.ok(url.startsWith('mailto:contact@kpopit.net?subject=%5BKpopIt%5D%20Wrong%20idol%20data&body='));
    assert.equal(decodeURIComponent(url.split('body=')[1]), 'Idol: Karina (aespa)\n\nHeight is wrong\n\nReply to: me@example.com');
    assert.equal(decodeURIComponent(contactMailto('Bug', 'Broken', '', '').split('body=')[1]), 'Broken');
});
