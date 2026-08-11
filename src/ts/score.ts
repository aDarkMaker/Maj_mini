/**
 * Fan counting (番数) and multiplier conversion for scoring.
 *
 * Fan is a base "doubling" value of a winning hand: higher-fan hands pay more.
 * The payout multiplier = 2^(fan-1), capped (default 8). A self-draw adds +1 to the
 * multiplier a winner collects from the other players. Kongs award separate "刮风下雨"
 * compensation depending on the kong type.
 */
import _ from 'lodash';
import type { Meld } from './types';
import { getTileCounts, totalTiles, getSuitSet, checkQiDui, isDaDuiZi, longQiDuiGenCount } from './rule';

/** Fan awarded for each kong visibility type (unknown vs exposed), used for 刮风下雨. */
const KONG_FAN: Record<string, number> = {
	concealed: 2,
	exposed: 2,
	added: 1,
};

/** 清一色: hand+melds span exactly one suit. */
function isQingYiSe(counts: Map<string, number>): boolean {
	return getSuitSet(counts).size === 1;
}

/** Base fan of a winning hand, from special patterns (七对 / 清一色 / 大对子 / 龙七对). */
export function getBaseFan(hand: string[], melds: Meld[]): number {
	const counts = getTileCounts(hand, melds);
	if (totalTiles(counts) !== 14) return 0;

	const qing = isQingYiSe(counts);
	const qiDui = checkQiDui(counts);
	const longGen = longQiDuiGenCount(counts);

	if (qiDui) {
		if (qing) return 6 + longGen; // Seven pairs + pure one suit
		return 3 + longGen; // Plain seven pairs (龙七对 adds per long-geng quad)
	}

	if (qing && isDaDuiZi(counts)) return 4; // 清大对
	if (qing) return 3; // 清一色
	if (isDaDuiZi(counts)) return 2; // 大对子
	return 1; // 平胡
}

/** Convert a fan count to a payout multiplier, capped at `cap` (default 8). */
export function fanToMultiplier(fan: number, cap: number = 8): number {
	const mult = fan >= 1 ? Math.pow(2, fan - 1) : 0;
	return Math.min(mult, cap);
}

/** Multiplier a winner collects for this hand (no self-draw bonus yet). */
export function getWinMultiplier(hand: string[], melds: Meld[], baseFanCap: number = 8): number {
	return fanToMultiplier(getBaseFan(hand, melds), baseFanCap);
}

/** Extra multiplier a self-draw winner takes from every other player (自摸加底). */
export const ZIMO_ADDITION = 1;

/** Total multiplier collected from each other player for a win (self-draw adds a base). */
export function getWinMultiplierFromOthers(hand: string[], melds: Meld[], isSelfDraw: boolean, baseFanCap: number = 8): number {
	const base = getWinMultiplier(hand, melds, baseFanCap);
	return base + (isSelfDraw ? ZIMO_ADDITION : 0);
}

/** Kong compensation (刮风下雨) fan value by kong visibility type. */
export function getKongFan(kongType: 'concealed' | 'exposed' | 'added'): number {
	return _.get(KONG_FAN, kongType, 0);
}