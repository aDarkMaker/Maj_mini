/**
 * Unit tests: player actions (players.ts) — draw, discard, pong, kong, win.
 */
import { describe, expect, test } from 'bun:test';
import type { GameState, PlayerIndex, PlayerState } from '../ts/types';
import { draw, discard, pong, kong, win } from '../ts/players';

/** Build a state where P0 holds the given tiles (others empty). */
function makeState(hand: string[]): GameState {
	const players: PlayerState[] = [0, 1, 2, 3].map((i) => ({
		index: i as PlayerIndex,
		hand: [],
		melds: [],
		discarded: [],
		queSuit: null,
	}));
	players[0]!.hand = [...hand];
	return {
		players,
		wall: ['w2', 'w3', 'w4'],
		currentPlayer: 0,
		lastDiscarded: null,
		lastDiscardFrom: null,
		phase: 'discard',
	};
}

describe('draw', () => {
	test('draws the top wall tile and advances to discard phase', () => {
		const s = makeState([]);
		s.phase = 'draw';
		const res = draw(s, 0);
		expect(res.ok).toBe(true);
		if (res.ok) {
			expect(res.value.players[0]!.hand).toContain('w2'); // top of wall
			expect(res.value.phase).toBe('discard');
			expect(res.value.wall).toEqual(['w3', 'w4']);
		}
	});

	test('rejects draw outside draw phase', () => {
		const s = makeState([]);
		s.phase = 'discard';
		expect(draw(s, 0).ok).toBe(false);
	});

	test('rejects draw on empty wall', () => {
		const s = makeState([]);
		s.phase = 'draw';
		s.wall = [];
		expect(draw(s, 0).ok).toBe(false);
	});
});

describe('discard', () => {
	test('moves tile to discarded, empties from hand, phase -> respond', () => {
		const s = makeState(['w1', 'w2']);
		const res = discard(s, 'w1', 0);
		expect(res.ok).toBe(true);
		if (res.ok) {
			expect(res.value.players[0]!.discarded).toContain('w1');
			expect(res.value.players[0]!.hand).toEqual(['w2']);
			expect(res.value.phase).toBe('respond');
			expect(res.value.lastDiscarded).toBe('w1');
		}
	});

	test('rejects a tile not in hand', () => {
		const s = makeState(['w1', 'w2']);
		expect(discard(s, 'w9', 0).ok).toBe(false);
	});

	test('rejects discard out of turn', () => {
		const s = makeState(['w1']);
		expect(discard(s, 'w1', 1).ok).toBe(false);
	});
});

describe('pong', () => {
	test('two hand tiles + just-discarded form a pong meld', () => {
		const s = makeState(['w1', 'w1', 'w2']);
		s.phase = 'respond';
		s.lastDiscarded = 'w1';
		const res = pong(s, 0, 3, 'w1');
		expect(res.ok).toBe(true);
		if (res.ok) {
			expect(res.value.players[0]!.melds).toHaveLength(1);
			expect(res.value.players[0]!.melds[0]).toEqual({ type: 'pong', tiles: ['w1', 'w1', 'w1'] });
		}
	});

	test('rejects pong with only one matching tile', () => {
		const s = makeState(['w1', 'w2']);
		s.phase = 'respond';
		s.lastDiscarded = 'w1';
		expect(pong(s, 0, 3, 'w1').ok).toBe(false);
	});
});

describe('kong', () => {
	test('concealed kong turns four tiles into a meld and draws a replacement', () => {
		const s = makeState(['w1', 'w1', 'w1', 'w1', 'w2']);
		const res = kong(s, 0, 'w1', 'concealed');
		expect(res.ok).toBe(true);
		if (res.ok) {
			expect(res.value.players[0]!.melds).toHaveLength(1);
			expect(res.value.players[0]!.melds[0]!.type).toBe('kong');
			expect(res.value.players[0]!.hand.filter((t) => t === 'w1')).toHaveLength(0);
			expect(res.value.players[0]!.hand).toHaveLength(2); // w2 + drawn tile
		}
	});

	test('rejects concealed kong without four tiles', () => {
		const s = makeState(['w1', 'w1', 'w1']);
		expect(kong(s, 0, 'w1', 'concealed').ok).toBe(false);
	});
});

describe('win', () => {
	test('self-draw win on a valid 14-tile hand', () => {
		// 123 456 789 万 + 123 条 + 99 条 (t9 pair)
		const hand = [
			'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9',
			't1', 't2', 't3', 't9', 't9',
		];
		const s = makeState(hand);
		s.phase = 'discard';
		const res = win(s, 0, 't9', true);
		expect(res.ok).toBe(true);
		if (res.ok) {
			expect(res.value.players[0]!.hand).toHaveLength(14);
		}
	});

	test('rejects win on a non-winning hand', () => {
		const badHand = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 't1', 't2', 't3', 't4', 'b1'];
		const s = makeState(badHand);
		s.phase = 'discard';
		expect(win(s, 0, 'b1', true).ok).toBe(false);
	});
});