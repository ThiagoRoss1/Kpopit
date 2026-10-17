import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIdolSlug } from '../../src/utils/formatters.ts';

test('keeps plain names and joins name and group', () => {
    assert.equal(buildIdolSlug('Kim Chaewon', 'LE SSERAFIM'), 'kim-chaewon-le-sserafim');
    assert.equal(buildIdolSlug('Saerom', 'fromis_9'), 'saerom-fromis_9');
});

test('drops every character outside [a-z0-9-_]', () => {
    assert.equal(buildIdolSlug('Y:SY', 'fromis_9'), 'ysy-fromis_9');
    assert.equal(buildIdolSlug('Taeyeon', "Girls' Generation"), 'taeyeon-girls-generation');
});

test('strips accents instead of dropping the letter', () => {
    assert.equal(buildIdolSlug('Rosé', 'BLACKPINK'), 'rose-blackpink');
});

test('leaves out a missing group', () => {
    assert.equal(buildIdolSlug('IU', null), 'iu');
    assert.equal(buildIdolSlug('IU'), 'iu');
});

test('never returns an empty or dash-edged slug', () => {
    assert.equal(buildIdolSlug(' ? ', '!'), 'idol');
    assert.equal(buildIdolSlug('A - B', ''), 'a-b');
});
