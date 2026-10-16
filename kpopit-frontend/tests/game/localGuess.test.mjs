import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLocalClassicGuess, toGuessedIdolData } from '../../src/utils/localGuess.ts';

const listItem = (id, over = {}) => ({
    id,
    artist_name: `Idol ${id}`,
    image_path: `/i${id}.webp`,
    image_version: '1',
    gender: 'F',
    nationality: ['South Korea'],
    idol_debut_year: 2020,
    birth_date: '2001-01-01',
    height: 160 + id,
    position: ['Vocalist'],
    groups: ['Group'],
    companies: ['Co'],
    ...over,
});

const idols = [listItem(1), listItem(2), listItem(3)];

test('maps the list id to idol_id and keeps every other field', () => {
    const mapped = toGuessedIdolData(idols[0]);
    assert.equal(mapped.idol_id, 1);
    assert.equal(mapped.id, 1);
    assert.equal(mapped.artist_name, 'Idol 1');
});

test('resolves the daily answer_id against the idol list', () => {
    const wrong = buildLocalClassicGuess(idols, 2, 3);
    assert.equal(wrong.guess_correct, false);
    assert.equal(wrong.guessed_idol_data.idol_id, 2);
    assert.equal(wrong.feedback.height.status, 'lower');
    assert.equal(wrong.feedback.artist_name.status, 'incorrect');

    const right = buildLocalClassicGuess(idols, 3, 3);
    assert.equal(right.guess_correct, true);
    assert.equal(right.feedback.artist_name.status, 'correct');
});

test('returns null when the guess or the answer is not in the list', () => {
    assert.equal(buildLocalClassicGuess(idols, 9, 1), null);
    assert.equal(buildLocalClassicGuess(idols, 1, 9), null);
});
