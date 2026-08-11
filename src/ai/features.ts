// Hand + que-suit -> 30-dim feature vector conversion.
import { NUM_TILES, NUM_FEATURES, QUE_SUIT_FEATURE_INDEX, tileIdToIndex, indexToTileId } from './constants';
import type { Suit } from '@/ts/types';

// 27 tile counts + 3 one-hot que-suit flags.
export function handToVec(hand: string[], queSuit?: Suit | null): number[] {
	const vec = new Array<number>(NUM_FEATURES).fill(0);
	for (const tileId of hand) {
		const i = tileIdToIndex(tileId);
		if (i >= 0) vec[i]!++;
	}
	if (queSuit) {
		const qi = QUE_SUIT_FEATURE_INDEX[queSuit];
		if (qi !== undefined) vec[qi] = 1;
	}
	return vec;
}

export function vecToHand(vec: number[]): string[] {
	const hand: string[] = [];
	for (let i = 0; i < NUM_TILES && i < vec.length; i++) {
		hand.push(indexToTileId(i));
	}
	return hand;
}