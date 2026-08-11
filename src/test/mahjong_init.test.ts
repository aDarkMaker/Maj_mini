/**
 * Unit tests: deck / shuffle / deal (mahjong_init.ts).
 */
import { describe, expect, test } from 'bun:test';
import { createDeck, initGame, shuffleWithSeed } from '../ts/mahjong_init';

describe('createDeck', () => {
	test('makes 108 tiles, 4 of each', () => {
		const deck = createDeck();
		expect(deck).toHaveLength(108);
		expect(deck.filter((t) => t === 'w1')).toHaveLength(4);
		expect(deck.filter((t) => t === 'b9')).toHaveLength(4);
	});
});

describe('shuffleWithSeed', () => {
	test('same seed → same order; different seed → different order', () => {
		const deck = createDeck();
		const a = shuffleWithSeed(deck, 1);
		const b = shuffleWithSeed(deck, 1);
		const c = shuffleWithSeed(deck, 2);
		expect(a).toEqual(b);
		expect(a).not.toEqual(c);
		// still a permutation (multiset preserved)
		expect([...a].sort()).toEqual([...deck].sort());
	});
});

describe('initGame', () => {
	test('deterministic deal with a seed; 14 to dealer, 13 to others', () => {
		const g1 = initGame(0, 99);
		const g2 = initGame(0, 99);
		expect(g1.players[0]!.hand).toHaveLength(14);
		expect(g1.players[1]!.hand).toHaveLength(13);
		expect(g2.players.map((p) => p.hand)).toEqual(g1.players.map((p) => p.hand));
		// wall reduced accordingly
		expect(g1.wall.length).toBe(108 - 14 - 13 * 3);
	});

	test('every player has an assigned que-suit', () => {
		const g = initGame(0, 5);
		for (const p of g.players) {
			expect(['w', 't', 'b']).toContain(p.queSuit as string);
		}
	});
});