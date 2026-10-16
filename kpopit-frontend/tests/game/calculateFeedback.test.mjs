import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFeedback } from '../../src/utils/calculateFeedback.ts';

const idol = (over = {}) => ({
    idol_id: 1,
    artist_name: 'Answer',
    gender: 'F',
    nationality: ['South Korea'],
    groups: ['LOONA', 'LOOSSEMBLE'],
    idol_debut_year: 2018,
    birth_date: '2000-01-15',
    height: 165,
    position: ['Main Vocalist', 'Leader'],
    companies: ['BlockBerry'],
    image_path: '/x.webp',
    image_version: '1',
    member_count: 5,
    ...over,
});

test('identical idols are correct on every attribute', () => {
    const fb = calculateFeedback(idol(), idol());
    for (const [key, item] of Object.entries(fb)) assert.equal(item.status, 'correct', key);
});

test('set attributes: correct, partial and incorrect', () => {
    const fb = calculateFeedback(
        idol({ position: ['Leader', 'Dancer'], groups: ['LOONA'], nationality: ['Japan'] }),
        idol(),
    );
    assert.deepEqual(fb.position, { status: 'partial', correct_items: ['Leader'], incorrect_items: ['Dancer'] });
    assert.equal(fb.groups.status, 'partial');
    assert.deepEqual(fb.nationality, { status: 'incorrect', correct_items: [], incorrect_items: ['Japan'] });
});

test('set comparison trims items and ignores order', () => {
    const fb = calculateFeedback(idol({ position: [' Leader', 'Main Vocalist '] }), idol());
    assert.equal(fb.position.status, 'correct');
});

test('numbers: higher means the guess is above the answer', () => {
    const fb = calculateFeedback(idol({ height: 170, idol_debut_year: 2015, member_count: 5 }), idol());
    assert.deepEqual(fb.height, { status: 'higher', correct_items: [], incorrect_items: ['170'] });
    assert.deepEqual(fb.idol_debut_year, { status: 'lower', correct_items: [], incorrect_items: ['2015'] });
    assert.equal(fb.member_count.status, 'correct');
});

test('birth date compares as dates and shows the guessed string', () => {
    const older = calculateFeedback(idol({ birth_date: '1998-05-01' }), idol());
    assert.deepEqual(older.birth_date, { status: 'lower', correct_items: [], incorrect_items: ['1998-05-01'] });
    const younger = calculateFeedback(idol({ birth_date: '2003-02-02' }), idol());
    assert.equal(younger.birth_date.status, 'higher');
});

test('missing numbers are incorrect with nothing to show', () => {
    const fb = calculateFeedback(idol({ member_count: undefined, height: null }), idol());
    assert.deepEqual(fb.member_count, { status: 'incorrect', correct_items: [], incorrect_items: [] });
    assert.deepEqual(fb.height, { status: 'incorrect', correct_items: [], incorrect_items: [] });
});

test('name and gender are exact matches', () => {
    const fb = calculateFeedback(idol({ artist_name: 'Other', gender: 'M' }), idol());
    assert.deepEqual(fb.artist_name, { status: 'incorrect', correct_items: [], incorrect_items: ['Other'] });
    assert.deepEqual(fb.gender, { status: 'incorrect', correct_items: [], incorrect_items: ['M'] });
});
