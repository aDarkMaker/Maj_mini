// Suit
export type Suit = 'w' | 't' | 'b';

// Tile face
type Tile = { suit: Suit; rank: number };

// Tile identifier
type TileId = string;

// Player seat
export type PlayerIndex = 0 | 1 | 2 | 3;

// Kong variant
export type KongType = 'concealed' | 'exposed' | 'added';

// Player state
export interface PlayerState {
	index: PlayerIndex;
	hand: TileId[];
	melds: Meld[];
	discarded: TileId[];
	/** Missing suit: must be discarded, and no such suit may remain when winning */
	queSuit: Suit | null;
}

export interface Meld {
	type: 'pong' | 'kong';
	tiles: TileId[];
	kongType?: KongType;
}

// Game state
export interface GameState {
	players: PlayerState[];
	wall: TileId[];
	currentPlayer: PlayerIndex;
	lastDiscarded: TileId | null;
	lastDiscardFrom: PlayerIndex | null;
	phase: 'draw' | 'discard' | 'respond';
}

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
export function ok<T>(value: T): Result<T, never> {
	return { ok: true, value };
}
export function err<E>(error: E): Result<never, E> {
	return { ok: false, error };
}

// Rounds already won in the current deal
export type RoundSummary = {
	winners: PlayerIndex[];
	winHistory: { who: PlayerIndex; isSelfDraw: boolean; fromWho?: PlayerIndex }[];
};
