import * as fs from 'fs';
import type { Suit } from '@/ts/types';
import { engine } from '@/engine/client';
import { handToVec } from './features';
import { tileIdToIndex, TILE_IDS } from './constants';

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

/** Four copies of every tile */
function createDeck(): string[] {
	return TILE_IDS.flatMap((id) => [id, id, id, id]);
}

/** Sample a random 14 tile hand */
function sampleHand14(seed: number): string[] {
	return shuffleWithSeed(createDeck(), seed).slice(0, 14);
}

export interface DatasetRow {
	hand: number[];
	discard_idx: number;
	reward: number;
}

/** Generate a JSONL dataset from exhaustive first-discard rollouts */
export async function generateDataset(outputPath: string, numHands: number, rolloutsPerAction: number, baseSeed: number): Promise<void> {
	const stream = fs.createWriteStream(outputPath, { flags: 'w' });
	let written = 0;
	for (let h = 0; h < numHands; h++) {
		const hand14 = sampleHand14(baseSeed + h * 10000);
		const queSuit = SUITS[(Math.abs(baseSeed) + h) % 3] as Suit;
		const vec = handToVec(hand14, queSuit);
		const discards = await engine.validDiscards(hand14, queSuit);
		for (const tileId of discards) {
			const reward = await engine.simulate(hand14, tileId, rolloutsPerAction, baseSeed + h * 10000 + 1, queSuit);
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
