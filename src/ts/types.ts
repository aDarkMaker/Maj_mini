// 花色
export type Suit = 'w' | 't' | 'b';

// 牌面
type Tile = { suit: Suit; rank: number };

// 计数器
type TileId = string;

// 玩家
export type PlayerIndex = 0 | 1 | 2 | 3;

// 杠牌类型
export type KongType = 'concealed' | 'exposed' | 'added';

// 玩家状态
export interface PlayerState {
	index: PlayerIndex;
	hand: TileId[];
	melds: Meld[];
	discarded: TileId[];
	/** 定缺：该门必须打光，胡牌时手牌不能含此花色 */
	queSuit: Suit | null;
}

export interface Meld {
	type: 'pong' | 'kong';
	tiles: TileId[];
	kongType?: KongType;
}

// 游戏状态
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
