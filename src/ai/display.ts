import type { GameState } from '@/ts/types';

const suitName: Record<string, string> = { w: '万', t: '条', b: '筒' };

function fmtTile(tileId: string): string {
	if (tileId.length < 2) return tileId;
	const s = tileId[0]!;
	const r = tileId.slice(1);
	return `${r}${suitName[s] ?? s}`;
}

function fmtShortTile(tileId: string): string {
	if (tileId.length < 2) return tileId;
	const s = tileId[0]!;
	const r = tileId.slice(1);
	const suitChar = suitName[s] ?? s;
	return `${r}${suitChar}`;
}

/** 格式化手牌：排序后显示 */
function fmtHand(hand: string[]): string {
	// 按花色分组
	const groups: Record<string, string[]> = { w: [], t: [], b: [] };
	for (const t of hand) {
		const s = t[0];
		if (s && s in groups) groups[s]!.push(t);
	}
	// 每组内排序
	for (const s of ['w', 't', 'b']) {
		groups[s]!.sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
	}
	// 按万条筒顺序输出
	const parts: string[] = [];
	for (const s of ['w', 't', 'b']) {
		if (groups[s]!.length > 0) {
			parts.push(groups[s]!.map(fmtShortTile).join(''));
		}
	}
	return parts.join(' ');
}

/** 显示线性牌桌布局（从上到下 0-3） */
export function printTable(state: GameState, winners: number[]) {
	const ps = state.players;
	const isWin = (i: number) => winners.includes(i);

	console.log('\n┌─────────────────────────────────────────────────────────────────────');
	for (let i = 0; i < 4; i++) {
		const p = ps[i];
		if (!p) continue;
		const winTag = isWin(i) ? ' 【胡】' : '';
		console.log(`│ 【玩家${i}:${suitName[p.queSuit ?? ''] ?? '-'}】${winTag.padEnd(4)}`);
		console.log(`│   手牌[${String(p.hand.length).padStart(2)}张]: ${fmtHand(p.hand).padEnd(42)}`);
		console.log(`│   副露: ${(p.melds.map(m => fmtTile(m.tiles[0] ?? '')).join(' ') || '-').padEnd(45)}`);
		console.log(`│   弃牌: ${(p.discarded.map(fmtShortTile).join(' ') || '-').padEnd(45)}`);
		if (i < 3) {
			console.log('├─────────────────────────────────────────────────────────────────────');
		}
	}
	console.log('└─────────────────────────────────────────────────────────────────────');
}

/** 显示当前桌面状态（简化版，用于实时显示） */
export function printCompactState(state: GameState, currentPlayer?: number, action?: string) {
	const ps = state.players;
	console.log('\n┌────────┬────────┬────────┬────────────────');
	console.log(`│0:${suitName[ps[0]?.queSuit ?? ''] ?? '-'}${String(ps[0]?.hand.length).padStart(2)}│1:${suitName[ps[1]?.queSuit ?? ''] ?? '-'}${String(ps[1]?.hand.length).padStart(2)}│2:${suitName[ps[2]?.queSuit ?? ''] ?? '-'}${String(ps[2]?.hand.length).padStart(2)}│3:${suitName[ps[3]?.queSuit ?? ''] ?? '-'}${String(ps[3]?.hand.length).padStart(2)}│`);
	console.log('└────────┴────────┴────────┴────────────────');
	if (currentPlayer !== undefined && action) {
		console.log(`  玩家${currentPlayer} ${action}`);
	}
	if (state.lastDiscarded) {
		console.log(`  最新弃牌: ${fmtTile(state.lastDiscarded)}`);
	}
}
