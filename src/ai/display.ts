// Terminal visualization of the table and per-player state.
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
	return `${r}${suitName[s] ?? s}`;
}

/** Format a hand grouped by suit, ranks sorted */
function fmtHand(hand: string[]): string {
	const groups: Record<string, string[]> = { w: [], t: [], b: [] };
	for (const t of hand) {
		const s = t[0];
		if (s && s in groups) groups[s]!.push(t);
	}
	for (const s of ['w', 't', 'b']) {
		groups[s]!.sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
	}
	const parts: string[] = [];
	for (const s of ['w', 't', 'b']) {
		if (groups[s]!.length > 0) {
			parts.push(groups[s]!.map(fmtShortTile).join(''));
		}
	}
	return parts.join(' ');
}

/** Print the linear table layout (top to bottom 0-3) */
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
		console.log(`│   副露: ${(p.melds.map((m) => fmtTile(m.tiles[0] ?? '')).join(' ') || '-').padEnd(45)}`);
		console.log(`│   弃牌: ${(p.discarded.map(fmtShortTile).join(' ') || '-').padEnd(45)}`);
		if (i < 3) {
			console.log('├─────────────────────────────────────────────────────────────────────');
		}
	}
	console.log('└─────────────────────────────────────────────────────────────────────');
}
