/**
 * Core game data types for Sichuan Mahjong (定缺 / 血战到底).
 *
 * Tile encoding: each tile is `TileId`, a 2-char string `{suit}{rank}`,
 * e.g. "w1" = 一万, "t5" = 五条, "b9" = 九筒. There are 4 copies of each tile.
 *
 * Phases:
 *  - draw:    current player draws from the wall
 *  - discard: current player must discard one tile (que-men forces the missing suit)
 *  - respond: after a discard, other players may pong/kong/win; else turn passes
 */

/** Tile suit: w=万 (chars), t=条 (bamboo), b=筒 (dots). Also used for the queSuit (missing suit). */
export type Suit = 'w' | 't' | 'b';

/** Structured tile form (kept for reference; runtime uses string TileId). */
type Tile = { suit: Suit; rank: number };

/** Flat string encoding of a tile, e.g. "w1" | "b9". */
type TileId = string;

/** Seat index of the four players, clockwise from dealer. */
export type PlayerIndex = 0 | 1 | 2 | 3;

/** Kong (gang) flavour; affects compensation and the drawn replacement tile. */
export type KongType = 'concealed' | 'exposed' | 'added';

/** Per-player snapshot during a round. */
export interface PlayerState {
	index: PlayerIndex;
	hand: TileId[];
	melds: Meld[];
	discarded: TileId[];
	/** 定缺: the suit this player must clear from hand and never win with. */
	queSuit: Suit | null;
}

/** A claimed group exposed on the table: a triplet (pong) or quad (kong). */
export interface Meld {
	type: 'pong' | 'kong';
	tiles: TileId[];
	kongType?: KongType;
}

/** Full round state. */
export interface GameState {
	players: PlayerState[];
	/** Remaining draw pile. */
	wall: TileId[];
	currentPlayer: PlayerIndex;
	/** Most recently discarded tile (set during `respond` phase). */
	lastDiscarded: TileId | null;
	/** The player who produced that discard. */
	lastDiscardFrom: PlayerIndex | null;
	phase: 'draw' | 'discard' | 'respond';
}

/** Rust-style Result wrapper used by all engine actions to carry errors. */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
/** Construct a successful result. */
export function ok<T>(value: T): Result<T, never> {
	return { ok: true, value };
}
/** Construct a failed result. */
export function err<E>(error: E): Result<never, E> {
	return { ok: false, error };
}