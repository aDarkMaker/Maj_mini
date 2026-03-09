/**
 * 固定牌局 demo：构造「有输赢」的一局，用于测试 init / rule / score / gameover 全流程
 * 运行: bun run src/test/demo.ts
 */

import type { GameState, PlayerIndex, PlayerState } from '../ts/types';
import { win } from '../ts/players';
import { canWin } from '../ts/rule';
import { settleRound, type RoundSummary } from '../ts/gameover';
import { getWinMultiplierFromOthers } from '../ts/score';

const BASE_MONEY = 1;

/** 创建空玩家（无手牌、无副露） */
function emptyPlayer(index: PlayerIndex): PlayerState {
	return { index, hand: [], melds: [], discarded: [] };
}

/**
 * 固定牌局：玩家 0 听 1 条（t1），缺门为筒（只有万、条）
 * 手牌 13 张 = 123 345 678 万 + 99 条 + 23 条，胡 t1 成 123 345 678 万 99 条 123 条
 */
function buildPointPaoState(): GameState {
	const hand0: string[] = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 't9', 't9', 't2', 't3'];
	const hand1: string[] = ['w1', 'w4', 'w2', 'w3', 't1', 't4', 't5', 't6', 'b1', 'b2', 'b3', 'b4', 'b5'];
	const hand2: string[] = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 't1', 't2', 't3', 't4'];
	const hand3: string[] = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 't5', 't6', 't7', 't8'];

	const players: PlayerState[] = [
		{ ...emptyPlayer(0), hand: hand0 },
		{ ...emptyPlayer(1), hand: hand1 },
		{ ...emptyPlayer(2), hand: hand2 },
		{ ...emptyPlayer(3), hand: hand3 },
	];

	return {
		players,
		wall: [],
		currentPlayer: 0,
		lastDiscarded: 't1',
		lastDiscardFrom: 1,
		phase: 'respond',
	};
}

/**
 * 固定牌局：玩家 0 自摸 t1（手牌已含 t1，共 14 张）
 */
function buildSelfDrawState(): GameState {
	const hand0: string[] = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 't9', 't9', 't1', 't2', 't3'];
	const hand1: string[] = ['w1', 'w4', 'w2', 'w3', 't4', 't5', 't6', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6'];
	const hand2: string[] = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 't1', 't2', 't3', 't4'];
	const hand3: string[] = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 't5', 't6', 't7', 't8'];

	const players: PlayerState[] = [
		{ ...emptyPlayer(0), hand: hand0 },
		{ ...emptyPlayer(1), hand: hand1 },
		{ ...emptyPlayer(2), hand: hand2 },
		{ ...emptyPlayer(3), hand: hand3 },
	];

	return {
		players,
		wall: ['w2'],
		currentPlayer: 0,
		lastDiscarded: null,
		lastDiscardFrom: null,
		phase: 'discard',
	};
}

function runPointPaoDemo() {
	console.log('=== 点炮 demo：玩家 1 打 t1，玩家 0 胡 ===');
	const state = buildPointPaoState();
	const p0 = state.players[0]!;
	const ok = canWin([...p0.hand, 't1'], p0.melds, 't1', false);
	if (!ok) throw new Error('canWin should be true for 点炮');

	const res = win(state, 0, 't1', false);
	if (!res.ok) throw new Error('win failed: ' + res.error);
	const after = res.value;

	const summary: RoundSummary = {
		winners: [0],
		winHistory: [{ who: 0, isSelfDraw: false, fromWho: 1 }],
	};
	const { net, reason } = settleRound(after, summary, BASE_MONEY);

	console.log('Reason:', reason);
	console.log('Net:', net);
	if (net[0]! <= 0 || net[1]! >= 0) throw new Error('Expected P0 win, P1 lose');
	console.log('点炮 demo 通过：P0 赢', net[0], '，P1 输', net[1]);
}

function runSelfDrawDemo() {
	console.log('=== 自摸 demo：玩家 0 自摸 t1 ===');
	const state = buildSelfDrawState();
	const p0 = state.players[0]!;
	const ok = canWin(p0.hand, p0.melds, 't1', true);
	if (!ok) throw new Error('canWin should be true for 自摸');

	const res = win(state, 0, 't1', true);
	if (!res.ok) throw new Error('win failed: ' + res.error);
	const after = res.value;

	const summary: RoundSummary = {
		winners: [0],
		winHistory: [{ who: 0, isSelfDraw: true }],
	};
	const { net, reason } = settleRound(after, summary, BASE_MONEY);

	console.log('Reason:', reason);
	console.log('Net:', net);
	const mult = getWinMultiplierFromOthers(p0.hand, p0.melds, true);
	const expectedWin = mult * BASE_MONEY * 3;
	if (net[0]! !== expectedWin) throw new Error(`Expected P0 win ${expectedWin}, got ${net[0]}`);
	if (net[1]! >= 0 || net[2]! >= 0 || net[3]! >= 0) throw new Error('Expected P1,P2,P3 lose');
	console.log('自摸 demo 通过：P0 赢', net[0], '，其余三家各输', -net[1]!);
}

runPointPaoDemo();
runSelfDrawDemo();
console.log('Demo 全部通过');
