import { NUM_TILES, tileIdToIndex, indexToTileId } from './constants';

export function handToVec(hand: string[]): number[] {
	const vec = new Array<number>(NUM_TILES).fill(0);
	for (const tileId of hand) {
		const i = tileIdToIndex(tileId);
		if (i >= 0) vec[i]!++;
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
