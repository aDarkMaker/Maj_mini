/**
 * Unit tests: round-end settlement (gameover.ts) — normal wins / 流局 check-called.
 */
import { describe, expect, test } from 'bun:test';
import type { GameState, PlayerIndex, PlayerState } from '../ts/types';
import { settleRound, hasTing, isHuaZhu } from '../ts/gameover';

function makeState(hands: Record<number, string[]>, wall: string[] = []): GameState {
	const players: PlayerState[] = [0, 1, 2, 3].map((i) => ({
		index: i as PlayerIndex,
		hand: hands[i] ?? [],
		melds: [],
		discarded: [],
		queSuit: null,
	}));
	return {
		players,
		wall,
		currentPlayer: 0,
		lastDiscarded: null,
		lastDiscardFrom: null,
		phase: 'respond',
	};
}

describe('settleRound — normal win', () => {
	test('self-draw: winner collects base from all three others', () => {
		// P0 wins with base multiplier 1 (+1 zimo) = 2 from each of 3 = 6.
		// Supply a non-empty wall so the round does not count as mid-血 流局.
		const hand14 = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 't1', 't2', 't3', 't9', 't9'];
		const { net, reason } = settleRound(
			makeState({ 0: hand14 }, ['w2']),
			{ winners: [0], winHistory: [{ who: 0, isSelfDraw: true }] },
			1
		);
		expect(reason).toBe('normal');
		expect(net[0]).toBe(6);
		expect(net[1]).toBe(-2);
		expect(net[2]).toBe(-2);
		expect(net[3]).toBe(-2);
	});
});

describe('hasTing', () => {
	test('a 13-tile hand one tile from win is 听牌', () => {
		const h = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 't1', 't2', 't3', 't9'];
		expect(hasTing(h, [])).toBe(true);
	});
	test('wrong tile count is not 听牌', () => {
		expect(hasTing(['w1', 'w2', 'w3'], [])).toBe(false);
	});
});

describe('isHuaZhu', () => {
	test('hand spanning all three suits is a hua-zhu', () => {
		expect(isHuaZhu(['w1', 't1', 'b1', 'w2', 't2', 'b2'], [])).toBe(true);
	});
	test('two suits is not hua-zhu', () => {
		expect(isHuaZhu(['w1', 'w2', 't1'], [])).toBe(false);
	});
});