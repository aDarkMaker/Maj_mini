import _ from 'lodash';
import type { Meld } from './types';
import { getTileCounts, totalTiles, getSuitSet, checkQiDui, isDaDuiZi, longQiDuiGenCount } from './rule';

const KONG_FAN: Record<string, number> = {
	concealed: 2,
	exposed: 2,
	added: 1,
};

function isQingYiSe(counts: Map<string, number>): boolean {
	return getSuitSet(counts).size === 1;
}

/** 基础倍率 */
export function getBaseFan(hand: string[], melds: Meld[]): number {
	const counts = getTileCounts(hand, melds);
	if (totalTiles(counts) !== 14) return 0;

	const qing = isQingYiSe(counts);
	const qiDui = checkQiDui(counts);
	const longGen = longQiDuiGenCount(counts);

	if (qiDui) {
		if (qing) return 6 + longGen;
		return 3 + longGen;
	}

	if (qing && isDaDuiZi(counts)) return 4;
	if (qing) return 3;
	if (isDaDuiZi(counts)) return 2;
	return 1;
}

/** 番数 */
export function fanToMultiplier(fan: number, cap: number = 8): number {
	const mult = fan >= 1 ? Math.pow(2, fan - 1) : 0;
	return Math.min(mult, cap);
}

/** 封顶胡牌 */
export function getWinMultiplier(hand: string[], melds: Meld[], baseFanCap: number = 8): number {
	return fanToMultiplier(getBaseFan(hand, melds), baseFanCap);
}

/** 自摸加底 */
export const ZIMO_ADDITION = 1;

/** 收菜 */
export function getWinMultiplierFromOthers(hand: string[], melds: Meld[], isSelfDraw: boolean, baseFanCap: number = 8): number {
	const base = getWinMultiplier(hand, melds, baseFanCap);
	return base + (isSelfDraw ? ZIMO_ADDITION : 0);
}

/** 刮风下雨 */
export function getKongFan(kongType: 'concealed' | 'exposed' | 'added'): number {
	return _.get(KONG_FAN, kongType, 0);
}
