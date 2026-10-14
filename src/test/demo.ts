/**
 * Fixed-deal smoke test for the Zig engine via the stdio client.
 * Run: bun run src/test/demo.ts
 */

import type { GameState, PlayerIndex, PlayerState } from '../ts/types';
import { engine } from '../engine/client';

const BASE_MONEY = 1;

/** Empty player with no hand and no melds */
function emptyPlayer(index: PlayerIndex): PlayerState {
	return { index, hand: [], melds: [], discarded: [], queSuit: null };
}

/** Player 0 is waiting on t1, que is b (only w and t in hand) */
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

/** Player 0 self-draws t1 (hand already contains t1, 14 tiles) */
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

async function runPointPaoDemo() {
	console.log('=== 点炮 demo：玩家 1 打 t1，玩家 0 胡 ===');
	const state = buildPointPaoState();
	const p0 = state.players[0]!;
	const canWin = await engine.canWin({ hand: [...p0.hand, 't1'], melds: p0.melds, queSuit: p0.queSuit });
	if (!canWin) throw new Error('canWin should be true for 点炮');

	const after = await engine.win(state, 0, 't1', false);
	const summary = { winners: [0] as PlayerIndex[], winHistory: [{ who: 0 as PlayerIndex, isSelfDraw: false, fromWho: 1 as PlayerIndex }] };
	const { net, reason } = await engine.settle(after, summary, BASE_MONEY);

	console.log('Reason:', reason);
	console.log('Net:', net);
	if (net[0]! <= 0 || net[1]! >= 0) throw new Error('Expected P0 win, P1 lose');
	console.log('点炮 demo 通过：P0 赢', net[0], '，P1 输', net[1]);
}

async function runSelfDrawDemo() {
	console.log('=== 自摸 demo：玩家 0 自摸 t1 ===');
	const state = buildSelfDrawState();
	const p0 = state.players[0]!;
	const canWin = await engine.canWin({ hand: p0.hand, melds: p0.melds, queSuit: p0.queSuit });
	if (!canWin) throw new Error('canWin should be true for 自摸');

	const after = await engine.win(state, 0, 't1', true);
	const summary = { winners: [0] as PlayerIndex[], winHistory: [{ who: 0 as PlayerIndex, isSelfDraw: true }] };
	const { net, reason } = await engine.settle(after, summary, BASE_MONEY);

	console.log('Reason:', reason);
	console.log('Net:', net);
	if (net[1]! >= 0 || net[2]! >= 0 || net[3]! >= 0) throw new Error('Expected P1,P2,P3 lose');
	console.log('自摸 demo 通过：P0 赢', net[0], '，其余三家各输', -net[1]!);
}

await runPointPaoDemo();
await runSelfDrawDemo();
console.log('Demo 全部通过');
process.exit(0);
