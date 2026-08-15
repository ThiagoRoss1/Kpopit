import test from 'node:test';
import assert from 'node:assert/strict';
import {
    disclosureExitDelay,
    isExpectedDisclosureAnimation,
    disclosureCompletionPath,
    isCurrentAnimationEvent,
    normalizeAnimationTimestamp,
    reduceDisclosureState,
    shouldCompleteDisclosureClose,
} from '../../src/hooks/disclosureTiming.ts';
import {
    COLLECTION_CARD_ZOOM_EXIT_MS,
    COLLECTION_STANDARD_EXIT_MS,
} from '../../src/pages/Collection/collectionMotion.ts';

test('normalizes epoch animation timestamps to the performance clock', () => {
    assert.equal(normalizeAnimationTimestamp(1_700_000_050_000, 50_000, 1_700_000_000_000), 50_000);
});

test('rejects an animationend queued before the current close cycle', () => {
    assert.equal(isCurrentAnimationEvent(95, 100, 120), false);
    assert.equal(isCurrentAnimationEvent(100, 100, 120), true);
});

test('rejects events when the browser clocks are unrelated and lets the watchdog finish', () => {
    assert.equal(isCurrentAnimationEvent(10, 100, 100_000), false);
});

test('does not require a timestamp when there is no active close cycle', () => {
    assert.equal(isCurrentAnimationEvent(0, null, 100), true);
});

test('only the closing owner can complete an animation-driven close', () => {
    const event = { eventTimestamp: 120, closeRequestedAt: 100, currentTime: 140 };
    assert.equal(shouldCompleteDisclosureClose({ ...event, closing: true, targetIsOwner: true }), true);
    assert.equal(shouldCompleteDisclosureClose({ ...event, closing: true, targetIsOwner: false }), false);
    assert.equal(shouldCompleteDisclosureClose({ ...event, closing: false, targetIsOwner: true }), false);
});

test('watchdog duration is bounded and invalid durations use the default', () => {
    assert.equal(disclosureExitDelay(300), 400);
    assert.equal(disclosureExitDelay(-20), 100);
    assert.equal(disclosureExitDelay(Number.NaN), 400);
});

test('reduced motion uses a next-frame completion path', () => {
    assert.equal(disclosureCompletionPath(true), 'frame');
    assert.equal(disclosureCompletionPath(false), 'watchdog');
});

test('animation-name filtering rejects stale exit animations from another owner cycle', () => {
    assert.equal(isExpectedDisclosureAnimation('collection-modal-out', ['collection-modal-out']), true);
    assert.equal(isExpectedDisclosureAnimation('collection-modal-in', ['collection-modal-out']), false);
    assert.equal(isExpectedDisclosureAnimation('anything', []), true);
});

test('disclosure state keeps a reopened cycle separate from the stale close', () => {
    const closed = { phase: 'closed', generation: 0 };
    const opened = reduceDisclosureState(closed, { type: 'open' });
    const closing = reduceDisclosureState(opened, { type: 'request-close' });
    const reopened = reduceDisclosureState(closing, { type: 'open' });

    assert.deepEqual(reopened, { phase: 'open', generation: 2 });
    assert.deepEqual(
        reduceDisclosureState(reopened, { type: 'finish-close', expectedGeneration: 1 }),
        reopened,
    );
    assert.deepEqual(
        reduceDisclosureState(
            reduceDisclosureState(reopened, { type: 'request-close' }),
            { type: 'finish-close', expectedGeneration: 2 },
        ),
        { phase: 'closed', generation: 3 },
    );
});

test('repeated close requests do not create a second lifecycle cycle', () => {
    const opened = reduceDisclosureState({ phase: 'closed', generation: 0 }, { type: 'open' });
    const closing = reduceDisclosureState(opened, { type: 'request-close' });

    assert.deepEqual(
        reduceDisclosureState(closing, { type: 'request-close' }),
        closing,
    );
});

test('a stale watchdog cannot finish a newer close generation', () => {
    const opened = reduceDisclosureState({ phase: 'closed', generation: 0 }, { type: 'open' });
    const firstClose = reduceDisclosureState(opened, { type: 'request-close' });
    const reopened = reduceDisclosureState(firstClose, { type: 'open' });
    const secondClose = reduceDisclosureState(reopened, { type: 'request-close' });

    assert.deepEqual(
        reduceDisclosureState(secondClose, { type: 'finish-close', expectedGeneration: firstClose.generation }),
        secondClose,
    );
});

test('finish-close is inert unless the disclosure is currently closing', () => {
    const opened = { phase: 'open', generation: 4 };
    const closed = { phase: 'closed', generation: 5 };

    assert.deepEqual(
        reduceDisclosureState(opened, { type: 'finish-close' }),
        opened,
    );
    assert.deepEqual(
        reduceDisclosureState(closed, { type: 'finish-close' }),
        closed,
    );
});

test('card zoom return flight shares the standard disclosure exit contract', () => {
    assert.equal(COLLECTION_CARD_ZOOM_EXIT_MS, COLLECTION_STANDARD_EXIT_MS);
    assert.equal(disclosureExitDelay(COLLECTION_CARD_ZOOM_EXIT_MS), 400);
});
