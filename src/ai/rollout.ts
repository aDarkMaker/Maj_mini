import type { GameState, PlayerIndex, Suit } from '@/ts/types';
import { createDeck } from '@/ts/mahjong_init';
import { draw, discard, win } from '@/ts/players';
import { canWin, getValidDiscards } from '@/ts/rule';
import { isRoundOver, settleRound, type RoundSummary } from '@/ts/gameover';

const SUITS: Suit[] = ['w', 't', 'b'];

const BASE_MONEY = 1;

function takeOne(wall: string[]): [string | null, string[]] {
	if (wall.length === 0) return [null, []];
	return [wall[0]!, wall.slice(1)];
}

function removeFromHand(hand: string[], tileId: string, n: number): string[] {
	let count = 0;
	return hand.filter((id) => {
		if (id! === tileId && count < n) {
			count++;
			return false;
		}
		return true;
	});
}

function shuffleWithSeed(arr: string[], seed: number): string[] {
	const out = [...arr];
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

function nextActivePlayer(from: PlayerIndex, winners: Set<PlayerIndex>): PlayerIndex | null {
	for (let k = 1; k <= 4; k++) {
		const idx = ((from + k) % 4) as PlayerIndex;
		if (!winners.has(idx)) return idx;
	}
	return null;
}

function passToNext(state: GameState, summary: RoundSummary): GameState {
	const from = state.lastDiscardFrom ?? state.currentPlayer;
	const next = nextActivePlayer(from, new Set(summary.winners));
	if (next === null) return state;
	return {
		...state,
		currentPlayer: next,
		phase: 'draw',
		lastDiscarded: null,
		lastDiscardFrom: null,
	};
}

/** 过牌 */
function subtractDeck(deck: string[], hand: string[]): string[] {
	const counts = new Map<string, number>();
	for (const id of deck) counts.set(id, (counts.get(id) ?? 0) + 1);
	for (const id of hand) {
		const c = counts.get(id) ?? 0;
		if (c > 0) counts.set(id, c - 1);
	}
	const out: string[] = [];
	for (const id of deck) {
		const c = counts.get(id) ?? 0;
		if (c > 0) {
			counts.set(id, c - 1);
			out.push(id);
		}
	}
	return out;
}

/** 发牌 */
function dealRest(rest: string[], dealer: PlayerIndex): { hands: string[][]; wall: string[] } {
	const hands: string[][] = [[], [], [], []];
	let offset = 0;
	for (let round = 0; round < 3; round++) {
		for (let i = 0; i < 4; i++) {
			const who = (dealer + i) % 4;
			if (who === dealer) continue;
			for (let k = 0; k < 4; k++) {
				hands[who]!.push(rest[offset++]!);
			}
		}
	}
	hands[(dealer + 1) % 4]!.push(rest[offset++]!);
	hands[(dealer + 2) % 4]!.push(rest[offset++]!);
	hands[(dealer + 3) % 4]!.push(rest[offset++]!);
	return { hands, wall: rest.slice(offset) };
}

/**
 * 构造一局，player0QueSuit 与 dataset 一致时首打才合法
 */
export function buildStateWithFirstDiscard(
	hand14: string[],
	firstDiscard: string,
	seed: number,
	player0QueSuit?: Suit | null
): GameState | null {
	const deck = createDeck();
	const rest = subtractDeck(deck, hand14);
	if (rest.length !== 108 - 14) return null;
	const shuffled = shuffleWithSeed(rest, seed);
	const { hands, wall } = dealRest(shuffled, 0);
	const players = [0, 1, 2, 3].map((index) => ({
		index: index as PlayerIndex,
		hand: index === 0 ? [...hand14] : (hands[index] ?? []),
		melds: [],
		discarded: [],
		queSuit: (index === 0 && player0QueSuit != null ? player0QueSuit : SUITS[(Math.abs(seed) + index) % 3]) as Suit,
	})) as GameState['players'];
	const state: GameState = {
		players,
		wall,
		currentPlayer: 0,
		lastDiscarded: null,
		lastDiscardFrom: null,
		phase: 'discard',
	};
	const res = discard(state, firstDiscard, 0);
	if (!res.ok) return null;
	return res.value;
}

/** 定缺下随便打一张（有缺门时只打缺门） */
function randomDiscard(hand: string[], queSuit: Suit | null, rng: () => number): string {
	const valid = getValidDiscards(hand, queSuit);
	return valid[Math.floor(rng() * valid.length)]!;
}

/** 搜打撤退 */
export function runGameToEnd(state: GameState, seed: number): { net: number[]; summary: RoundSummary } {
	const summary: RoundSummary = { winners: [], winHistory: [] };
	const winnerSet = () => new Set(summary.winners);
	let rngState = seed;

	const rand = () => {
		rngState = (rngState * 1103515245 + 12345) & 0x7fff_ffff;
		return rngState / 0x8000_0000;
	};

	let s = state;
	while (!isRoundOver(s, summary)) {
		if (s.phase === 'draw') {
			const who = s.currentPlayer;
			if (winnerSet().has(who)) {
				const next = nextActivePlayer(who, winnerSet());
				if (next === null) break;
				s = { ...s, currentPlayer: next };
				continue;
			}
			const res = draw(s, who);
			if (!res.ok) {
				if (res.error.includes('No tiles') || res.error.includes('wall')) break;
				throw new Error(res.error);
			}
			s = res.value;
			const p = s.players[who];
			if (!p) continue;
			for (const t of p.hand) {
				if (canWin(p.hand, p.melds, t, true, p.queSuit)) {
					const winRes = win(s, who, t, true);
					if (!winRes.ok) continue;
					s = winRes.value;
					if (!summary.winners.includes(who)) summary.winners.push(who);
					summary.winHistory.push({ who, isSelfDraw: true });
					break;
				}
			}
			continue;
		}

		if (s.phase === 'discard') {
			const who = s.currentPlayer;
			const hand = s.players[who]?.hand ?? [];
			if (hand.length === 0) break;
			const tileId = randomDiscard(hand, s.players[who]?.queSuit ?? null, rand);
			const res = discard(s, tileId, who);
			if (!res.ok) throw new Error(res.error);
			s = res.value;
			const lastTile = s.lastDiscarded!;
			const fromWho = s.lastDiscardFrom ?? who;
			let someoneWon = false;
			for (let i = 0; i < 4; i++) {
				const i_ = i as PlayerIndex;
				if (i_ === fromWho || winnerSet().has(i_)) continue;
				const pl = s.players[i_];
				if (!pl) continue;
				if (canWin([...pl.hand, lastTile], pl.melds, lastTile, false, pl.queSuit)) {
					const winRes = win(s, i_, lastTile, false);
					if (!winRes.ok) continue;
					s = winRes.value;
					if (!summary.winners.includes(i_)) summary.winners.push(i_);
					summary.winHistory.push({ who: i_, isSelfDraw: false, fromWho });
					someoneWon = true;
					break;
				}
			}
			if (!someoneWon) s = passToNext(s, summary);
			continue;
		}
		if (s.phase === 'respond') {
			s = passToNext(s, summary);
		}
	}

	const { net } = settleRound(s, summary, BASE_MONEY);
	return { net, summary };
}

/**
 * 穷举首打，player0QueSuit 与 dataset_gen 中该手牌定缺一致
 */
export function runRollout(
	hand14: string[],
	firstDiscard: string,
	rolloutsPerAction: number,
	baseSeed: number,
	player0QueSuit?: Suit | null
): number {
	let sum = 0;
	for (let r = 0; r < rolloutsPerAction; r++) {
		const state = buildStateWithFirstDiscard(hand14, firstDiscard, baseSeed + r, player0QueSuit);
		if (!state) continue;
		const { net } = runGameToEnd(state, baseSeed + 1000 + r);
		sum += net[0] ?? 0;
	}
	return rolloutsPerAction > 0 ? sum / rolloutsPerAction : 0;
}
