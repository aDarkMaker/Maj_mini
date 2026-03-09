import { isDraft, produce, type Draft } from 'immer';
import type { GameState, PlayerState, PlayerIndex, Meld } from './types';
import type { KongType} from './types';
import { ok, err, type Result } from './types';
import { canWin } from './rule';

function takeOne(wall: string[]): [string | null, string[]] {
	if (wall.length === 0) return [null, []];
	const tile = wall[0]!;
	const rest = wall.slice(1);
	return [tile, rest];
}

/** 移牌 */
function removeFromHand(hand: string[], tileId: string, n: number): string[] {
    const out: string[] = [];
    let count = 0;
    for (const id of hand) {
        if (id === tileId && count < n) {
            count++;
            continue;
        }
        out.push(id);
    }
    return out;
}

/** 摸牌 */
export function draw(state: GameState, playerIndex?: PlayerIndex): Result<GameState, string> {
	const who = playerIndex ?? state.currentPlayer;
	if (state.phase !== 'draw') return err('Not in draw phase');
	if (state.currentPlayer !== who) return err('Not your turn');
	const [tile, restWall] = takeOne(state.wall);
	if (!tile) return err('No tiles left in wall');
	const next = produce(state, (draft: Draft<GameState>) => {
		draft.wall = restWall;
		const player = draft.players[who];
		if (player) {
			player.hand.push(tile);
		}
		draft.phase = 'discard';
	});
	return ok(next);
}

/** 打牌 */
export function discard(
    state: GameState,
    tileId: string,
    playerIndex?: PlayerIndex,
): Result<GameState, string> {
    if (state.phase !== 'discard') return err('Not in discard phase');
    if (state.currentPlayer !== playerIndex) return err('Not your turn');
    const player = state.players[playerIndex];
    if (!player) return err('Player not found');
    if (!player.hand.includes(tileId)) return err('Tile not in hand');

    const next = produce(state, (draft: Draft<GameState>) => {
        const p =draft.players[playerIndex];
        if (p) {
            p.hand = removeFromHand(p.hand, tileId, 1);
            p.discarded.push(tileId);
        }
        draft.lastDiscarded = tileId;
        draft.lastDiscardFrom = playerIndex;
        draft.phase = 'respond';
    });
    return ok(next);
}

/** 碰 */
export function pong(
    state: GameState,
    who: PlayerIndex,
    fromWho: PlayerIndex,
    tileId: string,
): Result<GameState, string> {
    if (state.phase !== 'respond') return err('Not in respond phase');
    if (state.currentPlayer !== who) return err('Not your turn');
    const player = state.players[who];
    if (!player) return err('Player not found');
    const sameCount = player.hand.filter((id) => id === tileId).length;
    if (sameCount < 2) return err('Not enough tiles to pong');

    const next = produce(state, (draft: Draft<GameState>) => {
        const p = draft.players[who];
        if (p) {
            p.hand = removeFromHand(p.hand, tileId, 2);
            p.melds.push({ type: 'pong', tiles: [tileId, tileId, tileId] });
        }
        draft.lastDiscarded = null;
        draft.lastDiscardFrom = null;
        draft.currentPlayer = who;
        draft.phase = 'respond';
    });
    return ok(next);
}

/** 杠 + DLC */
function add_Kong_Draw(
    state: GameState,
    who: PlayerIndex,
    meld: Meld,
    newHand: string[],
): Result<GameState, string> {
    const [newTile, restWall] = takeOne(state.wall);
    if (!newTile) return err('No tiles left in wall');
    return ok(
        produce(state, (draft: Draft<GameState>) => {
            const p = draft.players[who];
            if (p) {
                p.hand = newHand;
                p.melds.push(meld);
            }
            draft.wall = restWall;
            const px = draft.players[who];
            if (px) px.hand.push(newTile);
            draft.lastDiscarded = null;
            draft.lastDiscardFrom = null;
            draft.currentPlayer = who;
            draft.phase = 'discard';
        })
    );
}

export function kong(
    state: GameState,
    who: PlayerIndex,
    tileId: string,
    kind: KongType,
    fromWho?: PlayerIndex,
): Result<GameState, string> {
    const four: string[] = [tileId, tileId, tileId, tileId];

    if (kind === 'concealed') {
        if (state.phase !== 'draw' && state.phase !== 'discard') return err('Wrong phase for concealed kong');
        if (state.currentPlayer !== who) return err('Not your turn');
        const player = state.players[who];
        if (!player) return err('Player not found');
        const count = player.hand.filter((id) => id === tileId).length;
        if (count < 4) return err ('Need four same tiles to kong');
        return add_Kong_Draw(state, who, { type: 'kong', tiles: four, kongType: 'concealed'}, removeFromHand(state.players[who]!.hand, tileId, 4));
    }

    if (kind === 'exposed') {
        if (state.phase !== 'respond') return err('Wrong phase for exposed kong');
        if (state.lastDiscarded !== tileId) return err('Last discarded tile mismatch');
        const player = state.players[who];
        if (!player) return err('Player not found');
        const count = player.hand.filter((id) => id === tileId).length;
        if (count < 3) return err('Need three same tiles to kong');
        return add_Kong_Draw(state, who, { type: 'kong', tiles: four, kongType: 'exposed'}, removeFromHand(state.players[who]!.hand, tileId, 3));
    }

    if (kind === 'added') {
        if (state.phase !== 'discard') return err('Wrong phase for added kong');
        if (state.currentPlayer !== who) return err('Not your turn');
        const player = state.players[who];
        if (!player) return err('Player not found');
        const pongMeld = player.melds.find((m) => m.type === 'pong' && m.tiles[0] === tileId);
        if (!pongMeld) return err('No pong of this tile to upgrade');
        if (!player.hand.includes(tileId)) return err('Tile not in hand');

        const next = produce(state, (draft: Draft<GameState>) => {
            const p = draft.players[who];
            if (!p) return;
            p.hand =p.hand.filter((id) => id !== tileId);
            const idx = p.melds.findIndex((m) => m === pongMeld || (m.type === 'kong') && m.tiles[0] === tileId);
            if (idx !== -1) {
                p.melds[idx] = { type: 'kong', tiles: [...p.melds[idx]!.tiles, tileId], kongType: 'added'};
            }
        });
        const [newTile, restWall] = takeOne(next.wall);
        if (!newTile) return err('No tiles left in wall');
        return ok(
            produce(next, (draft: Draft<GameState>) => {
                const px = draft.players[who];
                if (px) px.hand.push(newTile);
                draft.wall = restWall;
                draft.phase = 'discard';
            })
        );
    }
    return err('Invalid kong type');
}

/** 胡牌 */
export function win(
    state: GameState,
    who: PlayerIndex,
    tileId: string,
    isSelfDraw: boolean,
): Result<GameState, string> {
    const player = state.players[who];
    if (!player) return err('Player not found');
    if (!isSelfDraw) {
        if (state.phase !== 'respond' || state.lastDiscarded !== tileId) return err('Cannot win on this tile');
    } else {
        if (state.phase !== 'draw' || state.currentPlayer !== who) return err('Not your turn to win');
        if (!player.hand.includes(tileId)) return err('Tile not in hand');
    }

    const handWithTile = isSelfDraw ? player.hand : [...player.hand, tileId];
    if (!canWin(handWithTile, player.melds, tileId, isSelfDraw)) return err('Not a winning hand');

    const next = produce(state, (draft: Draft<GameState>) => {
        draft.lastDiscarded = null;
        draft.lastDiscardFrom = null;
        draft.currentPlayer = ((who + 1) % 4) as PlayerIndex;
        draft.phase = 'draw';
    });
    return ok(next);
}