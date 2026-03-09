const SUITS = ['w', 't', 'b'] as const;
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export const TILE_IDS: string[] = [];
for (const s of SUITS) {
	for (const r of RANKS) {
		TILE_IDS.push(`${s}${r}`);
	}
}

export const TILE_INDEX: Record<string, number> = Object.fromEntries(TILE_IDS.map((id, i) => [id, i]));

export function tileIdToIndex(tileid: string): number {
	const i = TILE_INDEX[tileid];
	return i === undefined ? -1 : i;
}

export function indexToTileId(index: number): string {
	return TILE_IDS[index] ?? '';
}

export const NUM_TILES = 27;
