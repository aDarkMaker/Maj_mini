import _ from 'lodash';
import type { GameState, PlayerIndex, RoundSummary } from './ts/types';
import { engine } from './engine/client';
import { botDiscard } from './ai/bot';
import { printTable } from './ai/display';

const BASE_MONEY = 1;

/** Next player who has not won yet */
function nextActivePlayer(from: PlayerIndex, winners: Set<PlayerIndex>): PlayerIndex | null {
	const i = _.find(_.range(1, 5), (k: number) => !winners.has(((from + k) % 4) as PlayerIndex));
	return i === undefined ? null : (((from + i) % 4) as PlayerIndex);
}

/** Hand the turn to the next player */
async function passToNext(state: GameState, summary: RoundSummary): Promise<GameState> {
	const from = state.lastDiscardFrom ?? state.currentPlayer;
	const next = nextActivePlayer(from, new Set(summary.winners));
	if (next === null) return state;
	return engine.passToNext(state, summary.winners);
}

const suitName: Record<string, string> = { w: '万', t: '条', b: '筒' };
function fmtTile(tileId: string): string {
	if (tileId.length < 2) return tileId;
	const s = tileId[0]!;
	const r = tileId.slice(1);
	return `${r}${suitName[s] ?? s}`;
}

function printScoreboard(net: number[], winners: PlayerIndex[]) {
	console.log('\n========== 结算 ==========');
	console.log('玩家 |  结果  | 积分');
	console.log('-----|--------|-----');
	for (let i = 0; i < 4; i++) {
		const w = net[i] ?? 0;
		const isWin = winners.includes(i as PlayerIndex);
		const tag = isWin ? '胡牌' : w > 0 ? '赢' : w < 0 ? '输' : '-';
		const sign = w > 0 ? '+' : '';
		console.log(`  ${i}  |  ${tag.padEnd(4)} | ${sign}${w}`);
	}
	console.log('==========================\n');
}

async function runOneGame(seed?: number) {
	let state = await engine.init(0, seed);
	const summary: RoundSummary = { winners: [], winHistory: [] };
	const winnerSet = () => new Set(summary.winners);

	console.log('== 开局定缺 ==');
	console.log(state.players.map((p, i) => `玩家${i}:${suitName[p.queSuit ?? ''] ?? p.queSuit}`).join('  '));
	console.log('');

	while (!(await engine.isRoundOver(state, summary))) {
		if (state.phase === 'draw') {
			const who = state.currentPlayer;
			if (winnerSet().has(who)) {
				const next = nextActivePlayer(who, winnerSet());
				if (next === null) break;
				state = { ...state, currentPlayer: next };
				continue;
			}
			const drawn = await engine.draw(state, who).catch((e: Error) => {
				if (e.message.includes('InvalidMove')) return null;
				throw e;
			});
			if (!drawn) break;
			state = drawn;
			const p = state.players[who];
			if (!p) continue;
			for (const t of p.hand) {
				if (await engine.canWin({ hand: p.hand, melds: p.melds, queSuit: p.queSuit })) {
					state = await engine.win(state, who, t, true);
					if (!summary.winners.includes(who)) summary.winners.push(who);
					summary.winHistory.push({ who, isSelfDraw: true });
					console.log(`>>> 玩家${who} 自摸胡！(${fmtTile(t)})`);
					break;
				}
			}
			continue;
		}

		if (state.phase === 'discard') {
			const who = state.currentPlayer;
			const hand = state.players[who]?.hand ?? [];
			if (hand.length === 0) break;
			const validDiscards = await engine.validDiscards(hand, state.players[who]?.queSuit ?? null);
			const tileId = await botDiscard(state, who, validDiscards);
			state = await engine.discard(state, tileId, who);
			console.log(`玩家${who} → ${fmtTile(tileId)}`);
			const lastTile = state.lastDiscarded!;
			const fromWho = state.lastDiscardFrom ?? who;
			let someoneWon = false;
			for (let i = 0; i < 4; i++) {
				const i_ = i as PlayerIndex;
				if (i_ === fromWho || winnerSet().has(i_)) continue;
				const pl = state.players[i_];
				if (!pl) continue;
				if (await engine.canWin({ hand: [...pl.hand, lastTile], melds: pl.melds, queSuit: pl.queSuit })) {
					state = await engine.win(state, i_, lastTile, false);
					if (!summary.winners.includes(i_)) summary.winners.push(i_);
					summary.winHistory.push({ who: i_, isSelfDraw: false, fromWho });
					console.log(`>>> 玩家${i_} 点炮胡！(${fmtTile(lastTile)}) ← 玩家${fromWho}`);
					someoneWon = true;
					break;
				}
			}
			if (!someoneWon) state = await passToNext(state, summary);
			continue;
		}

		if (state.phase === 'respond') {
			state = await passToNext(state, summary);
		}
	}

	const { net, reason } = await engine.settle(state, summary, BASE_MONEY);
	console.log(reason === 'liuju' ? '\n【流局】' : '\n【三家胡】');
	printScoreboard(net, summary.winners);
	console.log('\n【最终桌面】');
	printTable(state, summary.winners);
	return { state, summary, net, reason };
}

runOneGame()
	.then(() => console.log('Done'))
	.catch((e) => console.error(e));
