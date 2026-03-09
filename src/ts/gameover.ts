import _ from 'lodash';
import type { GameState, PlayerIndex, PlayerState, Meld } from './types';
import { getTileCounts, getSuitSet, canWin } from './rule';
import { getWinMultiplierFromOthers } from './score';

/** 本局已胡 */
export type RoundSummary = {
	winners: PlayerIndex[];
	winHistory: { who: PlayerIndex; isSelfDraw: boolean; fromWho?: PlayerIndex }[];
};

const TILE_IDS: string[] = _.flatMap(['w', 't', 'b'], (s: string) => _.map(_.range(1, 10), (r: number) => `${s}${r}`));

/** 是否听牌 */
export function hasTing(hand: string[], melds: Meld[]): boolean {
	if (hand.length !== 13) return false;
	return _.some(TILE_IDS, (t: string) => canWin([...hand, t], melds, t, true));
}

/** 是否花猪 */
export function isHuaZhu(hand: string[], melds: Meld[]): boolean {
	const counts = getTileCounts(hand, melds);
	return getSuitSet(counts).size === 3;
}

/**
 * 一局是否结束
 */
export function isRoundOver(state: GameState, summary: RoundSummary): boolean {
	if (summary.winners.length >= 3) return true;
	if (state.wall.length > 0) return false;
	const cur = state.players[state.currentPlayer];
	if (cur && cur.hand.length === 14) return false;
	const notWon = 4 - summary.winners.length;
	return notWon >= 2;
}

/**
 * 结算一局
 * @param state 当前状态
 * @param summary 本局已胡记录
 * @param baseMoney 底金
 * @param fullCap 流局查叫时「大叫」倍数
 * @param huaZhuCap 花猪赔非花猪倍数
 */
export function settleRound(
	state: GameState,
	summary: RoundSummary,
	baseMoney: number,
	fullCap: number = 8,
	huaZhuCap: number = 16
): { net: number[]; reason: 'normal' | 'liuju' } {
	const net = [0, 0, 0, 0] as number[];

	const winnerSet = new Set(summary.winners);

	// 胡牌结算
	for (const w of summary.winHistory) {
		const p = state.players[w.who];
		if (!p) continue;
		const mult = getWinMultiplierFromOthers(p.hand, p.melds, w.isSelfDraw);
		const amount = mult * baseMoney;
		if (w.isSelfDraw) {
			for (let i = 0; i < 4; i++) {
				if (i === w.who) net[i]! += amount * 3;
				else net[i]! -= amount;
			}
		} else {
			const from = w.fromWho ?? 0;
			net[w.who]! += amount;
			net[from]! -= amount;
		}
	}

	// 流局
	const isLiuju = state.wall.length === 0 && winnerSet.size < 3 && 4 - summary.winners.length >= 2;
	if (!isLiuju) return { net, reason: 'normal' };

	const notWinners = ([0, 1, 2, 3] as const).filter((i) => !winnerSet.has(i));
	const huaZhuList = notWinners.filter((i) => {
		const pl = state.players[i];
		return pl ? isHuaZhu(pl.hand, pl.melds) : false;
	});
	const tingList = notWinners.filter((i) => {
		if (huaZhuList.includes(i)) return false;
		const pl = state.players[i];
		return pl ? hasTing(pl.hand, pl.melds) : false;
	});
	const noTingList = notWinners.filter((i) => !huaZhuList.includes(i) && !tingList.includes(i));

	// 花猪赔非花猪
	const nonHuaZhu = notWinners.filter((i) => !huaZhuList.includes(i));
	for (const i of huaZhuList) {
		for (const j of nonHuaZhu) {
			net[i]! -= huaZhuCap * baseMoney;
			net[j]! += huaZhuCap * baseMoney;
		}
	}

	// 无叫赔有叫
	const payAmount = fullCap * baseMoney;
	for (const i of noTingList) {
		for (const j of tingList) {
			net[i]! -= payAmount;
			net[j]! += payAmount;
		}
	}

	return { net, reason: 'liuju' };
}
