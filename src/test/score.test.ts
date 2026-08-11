/**
 * Unit tests: fan counting & multipliers (score.ts).
 */
import { describe, expect, test } from 'bun:test';
import { getBaseFan, fanToMultiplier, getWinMultiplierFromOthers, getKongFan } from '../ts/score';

describe('getBaseFan', () => {
	test('simple hand = 1 fan', () => {
		const hand = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 't1', 't2', 't3', 't9', 't9'];
		expect(getBaseFan(hand, [])).toBe(1);
	});

	test('seven pairs = 3 fan', () => {
		const hand = ['w1', 'w1', 'w2', 'w2', 'w3', 'w3', 'w4', 'w4', 't1', 't1', 't2', 't2', 't3', 't3'];
		expect(getBaseFan(hand, [])).toBe(3);
	});

	test('non-14 hand = 0 fan', () => {
		expect(getBaseFan(['w1', 'w2'], [])).toBe(0);
	});
});

describe('fanToMultiplier', () => {
	test('multiplier doubles per fan, capped', () => {
		expect(fanToMultiplier(1)).toBe(1);
		expect(fanToMultiplier(2)).toBe(2);
		expect(fanToMultiplier(3)).toBe(4);
		expect(fanToMultiplier(4)).toBe(8);
		expect(fanToMultiplier(5)).toBe(8); // capped at 8
	});
});

describe('getWinMultiplierFromOthers', () => {
	test('self-draw adds +1', () => {
		const hand = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 't1', 't2', 't3', 't9', 't9'];
		expect(getWinMultiplierFromOthers(hand, [], false)).toBe(1);
		expect(getWinMultiplierFromOthers(hand, [], true)).toBe(2);
	});
});

describe('getKongFan', () => {
	test('kong payment by type', () => {
		expect(getKongFan('concealed')).toBe(2);
		expect(getKongFan('exposed')).toBe(2);
		expect(getKongFan('added')).toBe(1);
	});
});