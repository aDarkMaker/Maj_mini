/**
 * Unit tests: feature vectorization (features.ts) — 30-dim hand+que-suit encoding.
 */
import { describe, expect, test } from 'bun:test';
import { handToVec } from '../ai/features';
import { NUM_TILES, NUM_FEATURES } from '../ai/constants';

describe('handToVec', () => {
	test('produces 30-dim vector with correct tile counts', () => {
		const v = handToVec(['w1', 'w1', 'w2', 't5', 'b9']);
		expect(v).toHaveLength(NUM_FEATURES);
		expect(v[0]).toBe(2); // w1
		expect(v[1]).toBe(1); // w2
		expect(v[13]).toBe(1); // t5 (9+4)
		expect(v[26]).toBe(1); // b9 (18+8)
	});

	test('appends que-suit one-hot at indices 27/28/29', () => {
		const v = handToVec(['w1'], 'w');
		expect(v[NUM_TILES]).toBe(1); // 27 -> que w
		expect(v[NUM_TILES + 1]).toBe(0);
		expect(v[NUM_TILES + 2]).toBe(0);
	});

	test('no que-suit leaves the flags zero', () => {
		const v = handToVec(['w1']);
		expect(v[NUM_TILES + 2]).toBe(0);
	});
});
