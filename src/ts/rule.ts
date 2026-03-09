import _ from 'lodash';
import type { Meld, Suit } from './types';

const SUITS = ['w', 't', 'b'] as const;

/** 花色 */
export function getSuit(tileId: string): Suit | null {
	if (tileId.length < 2) return null;
	const s = tileId[0];
	if (s === 'w' || s === 't' || s === 'b') return s;
	return null;
}

/** 点数 */
function getRank(tileId: string): number | null {
	if (tileId.length < 2) return null;
	const r = parseInt(tileId.slice(1), 10);
	return r >= 1 && r <= 9 ? r : null;
}

function isValidTileId(tileId: string): boolean {
	return getSuit(tileId) !== null && getRank(tileId) !== null;
}

/** 计数 */
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

function totalTiles(counts: Map<string, number>): number {
	return _.sum([...counts.values()]);
}

/** 缺门 */
function checkQueMen(counts: Map<string, number>): boolean {
	const suits = new Set<Suit>();
	for (const [tileId] of counts) {
		const s = getSuit(tileId);
		if (s) suits.add(s);
	}
	return suits.size <= 2;
}

/** 修改牌堆 */
function subtract(counts: Map<string, number>, tileIds: string[]): Map<string, number> {
	const next = new Map(counts);
	for (const id of tileIds) {
		const c = next.get(id) ?? 0;
		if (c <= 1) next.delete(id);
		else next.set(id, c - 1);
	}
	return next;
}

/** 对子 */
function checkQiDui(counts: Map<string, number>): boolean {
	if (totalTiles(counts) !== 14) return false;
	let pairs = 0;
	for (const c of counts.values()) {
		if (c === 2 || c === 4) pairs += c >> 1;
		else if (c === 1 || c === 3) return false;
	}
	return pairs >= 7;
}

/** 搭子 */
function canFormMelds(counts: Map<string, number>, n: number): boolean {
	if (n === 0) return totalTiles(counts) === 0;

	// 刻子
	for (const [tileId, c] of counts) {
		if (c >= 3) {
			const next = subtract(counts, [tileId, tileId, tileId]);
			if (canFormMelds(next, n - 1)) return true;
		}
	}

	// 顺子
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

/** 标准 */
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

/** Win
 * @param queSuit 定缺：若传入，手牌+副露不能含该花色
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

/** 定缺下可打的牌：有缺门牌时只能打缺门，否则可打任意手牌（每种一张为代表） */
export function getValidDiscards(hand: string[], queSuit: Suit | null): string[] {
	if (!hand.length) return [];
	if (queSuit != null) {
		const ofQue = hand.filter((id) => getSuit(id) === queSuit);
		if (ofQue.length > 0) return [...new Set(ofQue)];
	}
	return [...new Set(hand)];
}

// Score 计分复用
export { getRank, getTileCounts, totalTiles, checkQiDui };

export function getSuitSet(counts: Map<string, number>): Set<Suit> {
	return new Set(_.compact(_.map([...counts.keys()], getSuit)));
}

export function longQiDuiGenCount(counts: Map<string, number>): number {
	if (totalTiles(counts) !== 14 || !checkQiDui(counts)) return 0;
	return _.sumBy([...counts.values()], (c: number) => (c === 4 ? 1 : 0));
}

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
