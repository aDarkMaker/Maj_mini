import * as fs from 'fs';
import type { Suit } from '@/ts/types';
import { createDeck } from '@/ts/mahjong_init';
import { getValidDiscards } from '@/ts/rule';
import { handToVec } from './features';
import { tileIdToIndex } from './constants';
import { runRollout } from './rollout';

const SUITS: Suit[] = ['w', 't', 'b'];

function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
	const out = [...arr];
	let s = seed;
	for (let i = out.length - 1; i > 0; i--) {
		s = (s * 1103515245 + 12345) & 0x7fff_ffff;
		const j = s % (i + 1);
		[out[i], out[j]] = [out[j]!, out[i]!];
	}
	return out;
}

/** 生成手牌 */
function sampleHand14(seed: number): string[] {
	const deck = createDeck();
	const shuffled = shuffleWithSeed(deck, seed);
	return shuffled.slice(0, 14);
}

/** 定缺下可打的牌（每种一张为代表） */
function possibleDiscards(hand: string[], queSuit: Suit | null): string[] {
	return getValidDiscards(hand, queSuit);
}

export interface DatasetRow {
	hand: number[];
	discard_idx: number;
	reward: number;
}

/** 数据集 */
export function generateDataset(outputPath: string, numHands: number, rolloutsPerAction: number, baseSeed: number): void {
	const stream = fs.createWriteStream(outputPath, { flags: 'w' });
	let written = 0;
	for (let h = 0; h < numHands; h++) {
		const hand14 = sampleHand14(baseSeed + h * 10000);
		const queSuit = SUITS[(Math.abs(baseSeed) + h) % 3] as Suit;
		const vec = handToVec(hand14);
		const discards = possibleDiscards(hand14, queSuit);
		for (const tileId of discards) {
			const reward = runRollout(hand14, tileId, rolloutsPerAction, baseSeed + h * 10000 + 1, queSuit);
			const discard_idx = tileIdToIndex(tileId);
			if (discard_idx < 0) continue;
			const row: DatasetRow = { hand: vec, discard_idx, reward };
			stream.write(JSON.stringify(row) + '\n');
			written++;
		}
	}
	stream.end();
	console.log('Wrote', written, 'rows to', outputPath);
}
