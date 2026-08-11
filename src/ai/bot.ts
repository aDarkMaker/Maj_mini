// Bot Python inference: resolves the venv interpreter and calls predict.py for a discard choice.
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { handToVec } from './features';
import { indexToTileId, tileIdToIndex, NUM_TILES } from './constants';
import type { GameState, PlayerIndex, Suit } from '@/ts/types';

const __dirname = typeof globalThis.__dirname !== 'undefined' ? globalThis.__dirname : path.dirname(fileURLToPath(import.meta.url));
const AGENT_DIR = path.resolve(__dirname, '../../agent');
const PREDICT_SCRIPT = path.join(AGENT_DIR, 'predict.py');

function resolvePython(): string {
	const venv = path.join(AGENT_DIR, '.venv');
	if (fs.existsSync(venv)) {
		return process.platform === 'win32'
			? path.join(venv, 'Scripts', 'python.exe')
			: path.join(venv, 'bin', 'python');
	}
	return 'uv run python';
}

const PYTHON = resolvePython();

function buildValidMask(hand: string[], validTileIds: string[]): number[] {
	const mask = new Array<number>(NUM_TILES).fill(0);
	const validSet = new Set(validTileIds);
	for (const id of hand) {
		if (!validSet.has(id)) continue;
		const i = tileIdToIndex(id);
		if (i >= 0) mask[i] = 1;
	}
	return mask;
}

export function chooseDiscardFromHand(hand: string[], validDiscardTileIds?: string[], queSuit?: Suit | null): Promise<string> {
	const vec = handToVec(hand, queSuit);
	const valid_mask =
		validDiscardTileIds && validDiscardTileIds.length > 0
			? buildValidMask(hand, validDiscardTileIds)
			: undefined;
	const payload = JSON.stringify(valid_mask ? { hand: vec, valid_mask } : { hand: vec });
	return new Promise<string>((resolve, reject) => {
		// PYTHON may be "uv run python" (contains a space): split into command + args for spawn.
		const [cmd, ...pyArgs] = PYTHON.split(/ +/);
		const proc = spawn(cmd!, [...pyArgs, PREDICT_SCRIPT], { stdio: ['pipe', 'pipe', 'inherit'] });
		proc.stdin?.write(payload + '\n');
		proc.stdin?.end();
		let out = '';
		proc.stdout?.on('data', (chunk) => (out += chunk));
		proc.on('close', (code) => {
			if (code !== 0) {
				reject(new Error('predict.py exited with ' + code));
				return;
			}
			try {
				const res = JSON.parse(out.trim());
				const idx = res.discard_idx as number;
				const tileId = indexToTileId(idx);
				const fallbacks = validDiscardTileIds?.length ? validDiscardTileIds : hand;
				if (!hand.includes(tileId)) {
					resolve(fallbacks[0]!);
				} else {
					resolve(tileId);
				}
			} catch (e) {
				reject(e);
			}
		});
	});
}

export function botDiscard(
	state: GameState,
	who: PlayerIndex,
	validDiscardTileIds: string[]
): Promise<string> {
	const player = state.players[who];
	if (!player || player.hand.length === 0) throw new Error('no hand');
	return chooseDiscardFromHand(player.hand, validDiscardTileIds.length > 0 ? validDiscardTileIds : undefined, player.queSuit);
}