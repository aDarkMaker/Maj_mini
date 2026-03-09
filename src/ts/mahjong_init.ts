import _ from 'lodash';
import type { GameState, PlayerState, PlayerIndex } from './types';

const SUITS = ['w', 't', 'b'] as const;
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/** Init */
export function createDeck(): string[] {
	return _.flatMap([...SUITS], (s: string) =>
		_.flatMap([...RANKS], (r: number) => _.map(_.times(4), () => `${s}${r}`))
	);
}

/** 洗牌 */
export function shuffleDeck(deck: string[]): string[] {
	return _.shuffle([...deck]);
}

/** 生成玩家 */
export function createPlayers(): PlayerState[] {
	return ([0, 1, 2, 3] as const).map((index) => ({
		index,
		hand: [],
		melds: [],
		discarded: [],
	}));
}

/** 发牌 */
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

/**
 * Init
 * @param dealer 庄家 Default 0
 * @param seed 种子
 */
export function initGame(dealer: PlayerIndex = 0, seed?: number): GameState {
	const deck = createDeck();
	const wall = seed !== undefined ? shuffleWhitSeed(deck, seed) : shuffleDeck(deck);
	const players = createPlayers();
	const { hands, remainingWall } = dealFromWall(wall, dealer);

	_.times(4, (i: number) => {
		players[i]!.hand = hands[i]!;
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

function shuffleWhitSeed(deck: string[], seed: number): string[] {
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
