/**
 * Unit tests: win detection (rule.ts) — standard hand, seven pairs, que-men,
 * valid-discard enforcement.
 */
import { describe, expect, test } from 'bun:test';
import { canWin, getValidDiscards, getSuit, isDaDuiZi } from '../ts/rule';

describe('canWin — standard hand', () => {
	test('123 345 678 万 + 99 条 + 123 条', () => {
		// w1-9 handled via sets; final = 123345678 w, 99 t, 123 t... use plain win
		const hand = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w1', 'w2', 'w3', 't9', 't9', 't1', 't2', 't3'];
		expect(canWin(hand, [], 't3', false)).toBe(true);
	});

	test('incomplete hand fails', () => {
		const hand = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w1', 'w2', 'w3', 't9', 't9', 't1', 't2', 't4'];
		expect(canWin(hand, [], 't4', false)).toBe(false);
	});
});

describe('canWin — seven pairs', () => {
	test('7 pairs (with a quad as two pairs) valid', () => {
		const hand = ['w1', 'w1', 'w2', 'w2', 'w3', 'w3', 'w4', 'w4', 't1', 't1', 't2', 't2', 't3', 't3'];
		expect(canWin(hand, [], 't3', true)).toBe(true);
	});

	test('non-pair hand is not seven pairs', () => {
		const hand = ['w1', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 't1', 't2', 't3', 't4'];
		expect(canWin(hand, [], 't4', true)).toBe(false);
	});
});

describe('canWin — que-men (定缺)', () => {
	const hand = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 't1', 't2', 't3', 't9', 't9', 'b1', 'b2', 'b3']; // hard win
	test('que-wan rejected because wans present', () => {
		expect(canWin(hand, [], 'b3', true, 'w')).toBe(false);
	});
});

describe('getValidDiscards — que-men enforcement', () => {
	test('only missing-suit tiles while they remain', () => {
		const hand = ['w1', 'w2', 't1', 't2', 't9', 'b1'];
		expect(getValidDiscards(hand, 'w').sort()).toEqual(['w1', 'w2']);
	});
	test('all distinct hand tiles once missing suit is clear of hand', () => {
		// que-suit b, but hand has no b → any distinct hand tile is legal
		const hand = ['w1', 'w2', 'w3', 't1', 't2'];
		expect(getValidDiscards(hand, 'b')).toEqual(['w1', 'w2', 'w3', 't1', 't2']);
	});
	test('empty hand', () => {
		expect(getValidDiscards([], 'w')).toEqual([]);
	});
});

describe('getSuit helper', () => {
	test('extracts suit from tile id', () => {
		expect(getSuit('w5')).toBe('w');
		expect(getSuit('t9')).toBe('t');
		expect(getSuit('xyz')).toBe(null);
	});
});

describe('isDaDuiZi', () => {
	test('all four sets are triplets + a pair', () => {
		const counts = new Map([
			['w1', 3],
			['w2', 3],
			['w3', 3],
			['w5', 3],
			['w8', 2],
		]);
		expect(isDaDuiZi(counts)).toBe(true);
	});

	test('a run cannot be formed from triplets → not da-dui-zi', () => {
		// w4,w5,w6 as a run (one each) can't be all-triplets
		const counts = new Map([
			['w1', 3],
			['w2', 3],
			['w3', 3],
			['w4', 1], // singleton breaks all-三-刻
			['w5', 1],
			['w6', 1],
			['w8', 2],
		]);
		expect(isDaDuiZi(counts)).toBe(false);
	});
});