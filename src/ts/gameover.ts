/**
 * Round-end detection and settlement.
 *
 * A round ends when either:
 *  - 血战到底: three players have already won (or the wall is exhausted), or
 *  - the draw pile runs out (流局). On a 流局 the remaining players are scored by
 *    check-called 查叫 (无叫 pays 有叫) and 花猪 (three-suit hands pay everyone).
 */
import _ from 'lodash';
import type { GameState, PlayerIndex, PlayerState, Meld } from './types';
import { getTileCounts, getSuitSet, canWin } from './rule';
import { getWinMultiplierFromOthers } from './score';

/** What happened during this round: who won, and on which tile (self-draw or discard). */
export type RoundSummary = {
	winners: PlayerIndex[];
	winHistory: { who: PlayerIndex; isSelfDraw: boolean; fromWho?: PlayerIndex }[];
};

const TILE_IDS: string[] = _.flatMap(['w', 't', 'b'], (s: string) => _.map(_.range(1, 10), (r: number) => `${s}${r}`));

/** Check-called 听牌 (is the 13-tile hand one tile away from a win). */
export function hasTing(hand: string[], melds: Meld[]): boolean {
	if (hand.length !== 13) return false;
	return _.some(TILE_IDS, (t: string) => canWin([...hand, t], melds, t, true));
}

/** 花猪: a hand (incl. melds) containing all three suits, which is always a penalty at 流局. */
export function isHuaZhu(hand: string[], melds: Meld[]): boolean {
	const counts = getTileCounts(hand, melds);
	return getSuitSet(counts).size === 3;
}

/** True when this round has concluded: 3 wins, or wall empty with 2+ players not yet won. */
export function isRoundOver(state: GameState, summary: RoundSummary): boolean {
	if (summary.winners.length >= 3) return true;
	if (state.wall.length > 0) return false;
	const cur = state.players[state.currentPlayer];
	if (cur && cur.hand.length === 14) return false;
	const notWon = 4 - summary.winners.length;
	return notWon >= 2;
}

/**
 * Settle each player's net score. Returns the per-player net and whether the round
 * ended without a full 3-winner 血战 (reason `liuju`). The net is the hero's 0-th entry
 * then all differences. Arguments:
 * @param baseMoney per point base value
 * @param fullCap multiplier a 无叫 player pays a 有叫 player at 流局
 * @param huaZhuCap multiplier an 花猪 pays each non-花猪
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

	const winnersBefore = new Set<PlayerIndex>();
	for (const w of summary.winHistory) {
		const p = state.players[w.who];
		if (!p) continue;
		const mult = getWinMultiplierFromOthers(p.hand, p.melds, w.isSelfDraw);
		const amount = mult * baseMoney;
		if (w.isSelfDraw) {
			let payers = 0;
			for (let i = 0; i < 4; i++) {
				if (i !== w.who && !winnersBefore.has(i as PlayerIndex)) payers++;
			}
			net[w.who]! += amount * payers;
			for (let i = 0; i < 4; i++) {
				if (i !== w.who && !winnersBefore.has(i as PlayerIndex)) net[i]! -= amount;
			}
		} else {
			const from = w.fromWho ?? 0;
			if (!winnersBefore.has(from)) {
				net[w.who]! += amount;
				net[from]! -= amount;
			}
		}
		winnersBefore.add(w.who);
	}

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

	const nonHuaZhu = notWinners.filter((i) => !huaZhuList.includes(i));
	for (const i of huaZhuList) {
		for (const j of nonHuaZhu) {
			net[i]! -= huaZhuCap * baseMoney;
			net[j]! += huaZhuCap * baseMoney;
		}
	}

	const payAmount = fullCap * baseMoney;
	for (const i of noTingList) {
		for (const j of tingList) {
			net[i]! -= payAmount;
			net[j]! += payAmount;
		}
	}

	return { net, reason: 'liuju' };
}