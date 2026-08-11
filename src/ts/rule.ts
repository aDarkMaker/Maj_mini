/**
 * Win detection, que-men (定缺) checks, and valid-discard logic.
 *
 * A winning hand is either:
 *  - standard: 4 sets (triplet or run) + 1 pair ("234 pattern"), or
 *  - seven pairs (七对, incl. long-geng quads).
 * que-men (缺门) constraints are enforced here: the hand+melds must not contain
 * the player's assigned missing suit, and discard choices must clear it first.
 */
import _ from 'lodash';
import type { Meld, Suit } from './types';

const SUITS = ['w', 't', 'b'] as const;

/** Extract the suit from a TileId, or null if malformed. */
export function getSuit(tileId: string): Suit | null {
	if (tileId.length < 2) return null;
	const s = tileId[0];
	if (s === 'w' || s === 't' || s === 'b') return s;
	return null;
}

/** Extract the rank (1-9) from a TileId, or null if malformed. */
function getRank(tileId: string): number | null {
	if (tileId.length < 2) return null;
	const r = parseInt(tileId.slice(1), 10);
	return r >= 1 && r <= 9 ? r : null;
}

/** A TileId is valid when both suit and rank parse correctly. */
function isValidTileId(tileId: string): boolean {
	return getSuit(tileId) !== null && getRank(tileId) !== null;
}

/** Aggregate tile counts from hand + exposed melds (all four copies of each tile). */
function getTileCounts(hand: string[], melds: Meld[]): Map<string, number> {
	const counts = new Map<string, number>();
	for (const id of hand) {
		if (!isValidTileId(id)) continue;
		counts.set(id, (counts.get(id) ?? 0) + 1);
	}
	for (const m of melds) {
		for (const id of m.tiles) {
			if (!isValidTileId(id)) continue;
			counts.set(id, (counts.get(id) ?? 0) + 1);
		}
	}
	return counts;
}

/** Sum of all counted tiles. */
function totalTiles(counts: Map<string, number>): number {
	return _.sum([...counts.values()]);
}

/** que-men (缺门) rule: hand+melds must span at most 2 suits, i.e. the missing suit is cleared. */
function checkQueMen(counts: Map<string, number>): boolean {
	const suits = new Set<Suit>();
	for (const [tileId] of counts) {
		const s = getSuit(tileId);
		if (s) suits.add(s);
	}
	return suits.size <= 2;
}

/** Remove the given tiles from a count map (immutable); drops entries that reach zero. */
function subtract(counts: Map<string, number>, tileIds: string[]): Map<string, number> {
	const next = new Map(counts);
	for (const id of tileIds) {
		const c = next.get(id) ?? 0;
		if (c <= 1) next.delete(id);
		else next.set(id, c - 1);
	}
	return next;
}

/** Seven-pairs win (七对): 14 tiles decomposable into 7 pairs (a quad counts as 2 pairs). */
function checkQiDui(counts: Map<string, number>): boolean {
	if (totalTiles(counts) !== 14) return false;
	let pairs = 0;
	for (const c of counts.values()) {
		if (c === 2 || c === 4) pairs += c >> 1;
		else if (c === 1 || c === 3) return false;
	}
	return pairs >= 7;
}

/** Recursively check whether `n` sets (triplet or run) can be formed from the counts. */
function canFormMelds(counts: Map<string, number>, n: number): boolean {
	if (n === 0) return totalTiles(counts) === 0;

	// Triplet (刻子): three identical tiles.
	for (const [tileId, c] of counts) {
		if (c >= 3) {
			const next = subtract(counts, [tileId, tileId, tileId]);
			if (canFormMelds(next, n - 1)) return true;
		}
	}

	// Run (顺子): three consecutive tiles of the same suit, w1-3 .. w7-9 etc.
	for (const suit of SUITS) {
		for (let r = 1; r <= 7; r++) {
			const a = `${suit}${r}`;
			const b = `${suit}${r + 1}`;
			const c = `${suit}${r + 2}`;
			if ((counts.get(a) ?? 0) >= 1 && (counts.get(b) ?? 0) >= 1 && (counts.get(c) ?? 0) >= 1) {
				const next = subtract(counts, [a, b, c]);
				if (canFormMelds(next, n - 1)) return true;
			}
		}
	}
	return false;
}

/** Standard "234 pattern" win (4 sets + 1 pair). Tries each tile as the pair. */
function checkStandard(counts: Map<string, number>): boolean {
	if (totalTiles(counts) !== 14) return false;
	for (const [tileId, c] of counts) {
		if (c >= 2) {
			const withoutPair = subtract(counts, [tileId, tileId]);
			if (canFormMelds(withoutPair, 4)) return true;
		}
	}
	return false;
}

/**
 * Determine whether a hand wins.
 * @param queSuit if non-null, hand+melds must carry no tile of this (missing) suit.
 * The `_winningTile` / `_isSelfDraw` params are accepted for API symmetry but do not affect the result.
 */
export function canWin(
	hand: string[],
	melds: Meld[],
	_winningTile: string,
	_isSelfDraw: boolean,
	queSuit?: Suit | null
): boolean {
	const counts = getTileCounts(hand, melds);
	if (totalTiles(counts) !== 14) return false;
	if (queSuit != null) {
		for (const [tileId, c] of counts)
			if (c > 0 && getSuit(tileId) === queSuit) return false;
	}
	if (!checkQueMen(counts)) return false;
	return checkStandard(counts) || checkQiDui(counts);
}

/**
 * Tiles this player is allowed to discard under que-men (定缺):
 * while any tile of the missing suit remains in hand, only those are legal;
 * otherwise every distinct hand tile is legal.
 */
export function getValidDiscards(hand: string[], queSuit: Suit | null): string[] {
	if (!hand.length) return [];
	if (queSuit != null) {
		const ofQue = hand.filter((id) => getSuit(id) === queSuit);
		if (ofQue.length > 0) return [...new Set(ofQue)];
	}
	return [...new Set(hand)];
}

export { getRank, getTileCounts, totalTiles, checkQiDui };

/** The distinct set of suits present in the given counts. */
export function getSuitSet(counts: Map<string, number>): Set<Suit> {
	return new Set(_.compact(_.map([...counts.keys()], getSuit)));
}

/** How many quads (long-geng) contribute to a seven-pairs hand; 0 if not a valid seven-pairs. */
export function longQiDuiGenCount(counts: Map<string, number>): number {
	if (totalTiles(counts) !== 14 || !checkQiDui(counts)) return 0;
	return _.sumBy([...counts.values()], (c: number) => (c === 4 ? 1 : 0));
}

/** Recursively check whether `n` sets can all be triplets (used for 大对子 / da-dui-zi). */
function canFormOnlyTriplets(counts: Map<string, number>, n: number): boolean {
	if (n === 0) return totalTiles(counts) === 0;
	for (const [tileId, c] of counts) {
		if (c >= 3) {
			const next = subtract(counts, [tileId, tileId, tileId]);
			if (canFormOnlyTriplets(next, n - 1)) return true;
		}
	}
	return false;
}

/** 大对子 (da-dui-zi): a standard win where all four sets are triplets. */
export function isDaDuiZi(counts: Map<string, number>): boolean {
	if (totalTiles(counts) !== 14) return false;
	for (const [tileId, c] of counts) {
		if (c >= 2) {
			const withoutPair = subtract(counts, [tileId, tileId]);
			if (canFormOnlyTriplets(withoutPair, 4)) return true;
		}
	}
	return false;
}