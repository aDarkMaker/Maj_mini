/**
 * Deck building, shuffling, dealing, and game initialization.
 *
 * A full deck is 108 tiles = 3 suits × 9 ranks × 4 copies. Dealing gives the dealer
 * 14 tiles and every other player 13 (dealer starts in `discard` phase). que-men
 * (缺门) is assigned deterministically per seat when a seed is supplied.
 */
import _ from 'lodash';
import type { GameState, PlayerState, PlayerIndex, Suit } from './types';

const SUITS: Suit[] = ['w', 't', 'b'];
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/** Build the 108-tile deck. */
export function createDeck(): string[] {
	return _.flatMap([...SUITS], (s: string) => _.flatMap([...RANKS], (r: number) => _.map(_.times(4), () => `${s}${r}`)));
}

/** Unseeded random shuffle (not reproducible). */
export function shuffleDeck(deck: string[]): string[] {
	return _.shuffle([...deck]);
}

/** Four empty seats (no que-men yet). */
export function createPlayers(): PlayerState[] {
	return ([0, 1, 2, 3] as const).map((index) => ({
		index,
		hand: [],
		melds: [],
		discarded: [],
		queSuit: null,
	}));
}

/** Deal 14 to the dealer and 13 to everyone else, clockwise from the dealer. */
function dealFromWall(wall: string[], dealer: PlayerIndex): { hands: string[][]; remainingWall: string[] } {
	const hands: string[][] = [[], [], [], []];
	let offset = 0;

	for (let round = 0; round < 3; round++) {
		for (let i = 0; i < 4; i++) {
			const who = (dealer + i) % 4;
			for (let k = 0; k < 4; k++) {
				hands[who]!.push(wall[offset++]!);
			}
		}
	}
	hands[dealer]!.push(wall[offset++]!);
	hands[dealer]!.push(wall[offset++]!);
	hands[(dealer + 1) % 4]!.push(wall[offset++]!);
	hands[(dealer + 2) % 4]!.push(wall[offset++]!);
	hands[(dealer + 3) % 4]!.push(wall[offset++]!);

	return { hands, remainingWall: wall.slice(offset) };
}

/** Initialise a fresh round; optionally deterministically (fixed seed) and assigns que-men. */
export function initGame(dealer: PlayerIndex = 0, seed?: number): GameState {
	const deck = createDeck();
	const wall = seed !== undefined ? shuffleWithSeed(deck, seed) : shuffleDeck(deck);
	const players = createPlayers();
	const { hands, remainingWall } = dealFromWall(wall, dealer);

	_.times(4, (i: number) => {
		players[i]!.hand = hands[i]!;
		players[i]!.queSuit = SUITS[seed !== undefined ? (Math.abs(seed) + i) % 3 : (i % 3)] as Suit;
	});

	return {
		players,
		wall: remainingWall,
		currentPlayer: dealer,
		lastDiscarded: null,
		lastDiscardFrom: null,
		phase: 'discard',
	};
}

/** Deterministic Fisher–Yates shuffle driven by an LCG; identical seed -> identical deal. */
export function shuffleWithSeed<T>(deck: T[], seed: number): T[] {
	const out = [...deck];
	let s = seed;
	for (let i = out.length - 1; i > 0; i--) {
		s = (s * 1103515245 + 12345) & 0x7fff_ffff;
		const j = s % (i + 1);
		const a = out[i]!;
		const b = out[j]!;
		if (a !== undefined && b !== undefined) {
			out[i] = b;
			out[j] = a;
		}
	}
	return out;
}