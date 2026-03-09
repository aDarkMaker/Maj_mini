import _ from 'lodash';
import type { GameState, PlayerIndex } from './ts/types';
import { initGame } from './ts/mahjong_init';
import { draw, discard, win } from './ts/players';
import { canWin, getValidDiscards } from './ts/rule';
import { isRoundOver, settleRound, type RoundSummary } from './ts/gameover';
import { botDiscard } from './ai/bot';

const BASE_MONEY = 1;

/** 下一个未胡的玩家 */
function nextActivePlayer(from: PlayerIndex, winners: Set<PlayerIndex>): PlayerIndex | null {
	const i = _.find(_.range(1, 5), (k: number) => !winners.has(((from + k) % 4) as PlayerIndex));
	return i === undefined ? null : (((from + i) % 4) as PlayerIndex);
}

/** 轮到下家摸牌 */
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

async function runOneGame(seed?: number) {
	let state = initGame(0, seed);
	console.log('定缺:', state.players.map((p, i) => `玩家${i}:${p.queSuit ?? '-'}`).join(' '));
	const summary: RoundSummary = { winners: [], winHistory: [] };
	const winnerSet = () => new Set(summary.winners);

	while (!isRoundOver(state, summary)) {
		if (state.phase === 'draw') {
			const who = state.currentPlayer;
			if (winnerSet().has(who)) {
				const next = nextActivePlayer(who, winnerSet());
				if (next === null) break;
				state = { ...state, currentPlayer: next };
				continue;
			}
			const res = draw(state, who);
			if (!res.ok) {
				if (res.error.includes('No tiles') || res.error.includes('wall')) break;
				throw new Error(res.error);
			}
			state = res.value;
			const p = state.players[who];
			if (!p) continue;
			console.log(`玩家 ${who} 摸牌后手牌: ${p.hand.join(' ')}`);
			for (const t of p.hand) {
				if (canWin(p.hand, p.melds, t, true, p.queSuit)) {
					const winRes = win(state, who, t, true);
					if (!winRes.ok) continue;
					state = winRes.value;
					if (!summary.winners.includes(who)) summary.winners.push(who);
					summary.winHistory.push({ who, isSelfDraw: true });
					console.log(`玩家 ${who} 自摸胡`);
					break;
				}
			}
			continue;
		}

		if (state.phase === 'discard') {
			const who = state.currentPlayer;
			const hand = state.players[who]?.hand ?? [];
			if (hand.length === 0) break;
			console.log(`玩家 ${who} 打牌前手牌: ${hand.join(' ')}`);
			const validDiscards = getValidDiscards(hand, state.players[who]?.queSuit ?? null);
			const tileId = await botDiscard(state, who, validDiscards);
			const res = discard(state, tileId, who);
			if (!res.ok) throw new Error(res.error);
			state = res.value;
			const newHand = state.players[who]?.hand ?? [];
			console.log(`玩家 ${who} 打牌: ${tileId}，打后手牌: ${newHand.join(' ')}`);
			const lastTile = state.lastDiscarded!;
			const fromWho = state.lastDiscardFrom ?? who;
			let someoneWon = false;
			for (let i = 0; i < 4; i++) {
				const i_ = i as PlayerIndex;
				if (i_ === fromWho || winnerSet().has(i_)) continue;
				const pl = state.players[i_];
				if (!pl) continue;
				if (canWin([...pl.hand, lastTile], pl.melds, lastTile, false, pl.queSuit)) {
					const winRes = win(state, i_, lastTile, false);
					if (!winRes.ok) continue;
					state = winRes.value;
					if (!summary.winners.includes(i_)) summary.winners.push(i_);
					summary.winHistory.push({ who: i_, isSelfDraw: false, fromWho });
					console.log(`玩家 ${i_} 点炮胡 (点炮者: ${fromWho})`);
					someoneWon = true;
					break;
				}
			}
			if (!someoneWon) state = passToNext(state, summary);
			continue;
		}

		if (state.phase === 'respond') {
			state = passToNext(state, summary);
		}
	}

	const { net, reason } = settleRound(state, summary, BASE_MONEY);
	console.log('Round over.', reason === 'liuju' ? '流局' : '三家胡');
	console.log('Winners:', summary.winners);
	console.log('Net:', net);
	return { state, summary, net, reason };
}

runOneGame()
	.then(() => console.log('Done'))
	.catch((e) => console.error(e));
