const std = @import("std");

pub const NUM_TILES: usize = 27;
pub const NUM_PLAYERS: usize = 4;
pub const DECK_SIZE: usize = NUM_TILES * 4;

pub const TileIdx = u8;

pub const Suit = enum(u8) { w = 0, t = 1, b = 2 };
pub const Phase = enum { draw, discard, respond };
pub const MeldKind = enum { pong, kong };
pub const KongType = enum { concealed, exposed, added };
pub const Reason = enum { normal, liuju };

pub const ALL_TILES: [NUM_TILES]TileIdx = blk: {
    var arr: [NUM_TILES]TileIdx = undefined;
    for (0..NUM_TILES) |i| arr[i] = @intCast(i);
    break :blk arr;
};

pub fn suitOf(idx: TileIdx) Suit {
    return @fromBackingInt(@intCast(idx / 9));
}

pub fn rankOf(idx: TileIdx) u8 {
    return idx % 9 + 1;
}

pub fn tileOf(suit: Suit, rank: u8) TileIdx {
    return @backingInt(suit) * 9 + (rank - 1);
}

pub fn tileIdOf(idx: TileIdx, buf: *[2]u8) []const u8 {
    buf[0] = switch (suitOf(idx)) {
        .w => 'w',
        .t => 't',
        .b => 'b',
    };
    buf[1] = '1' + (rankOf(idx) - 1);
    return buf[0..2];
}

pub fn parseTileId(id: []const u8) ?TileIdx {
    if (id.len < 2) return null;
    const suit: Suit = switch (id[0]) {
        'w' => .w,
        't' => .t,
        'b' => .b,
        else => return null,
    };
    const rank = std.fmt.parseInt(u8, id[1..], 10) catch return null;
    if (rank < 1 or rank > 9) return null;
    return tileOf(suit, rank);
}

pub const Meld = struct {
    kind: MeldKind,
    tile: TileIdx,
    kong_type: ?KongType = null,

    pub fn count(self: Meld) u8 {
        return if (self.kind == .pong) 3 else 4;
    }
};

pub const Player = struct {
    index: u8 = 0,
    hand: std.ArrayList(TileIdx) = .empty,
    melds: std.ArrayList(Meld) = .empty,
    discarded: std.ArrayList(TileIdx) = .empty,
    que_suit: ?Suit = null,
};

pub const Game = struct {
    players: [NUM_PLAYERS]Player,
    wall: []const TileIdx = &.{},
    wall_pos: usize = 0,
    current_player: u8 = 0,
    last_discarded: ?TileIdx = null,
    last_discard_from: ?u8 = null,
    phase: Phase = .discard,

    pub fn wallRemaining(self: *const Game) usize {
        return self.wall.len - self.wall_pos;
    }

    pub fn takeWall(self: *Game) ?TileIdx {
        if (self.wall_pos >= self.wall.len) return null;
        const tile = self.wall[self.wall_pos];
        self.wall_pos += 1;
        return tile;
    }
};

pub fn countInHand(hand: []const TileIdx, tile: TileIdx) usize {
    var n: usize = 0;
    for (hand) |x| {
        if (x == tile) n += 1;
    }
    return n;
}

pub fn removeFromHand(hand: *std.ArrayList(TileIdx), tile: TileIdx, n: usize) bool {
    var removed: usize = 0;
    var i: usize = 0;
    while (i < hand.items.len and removed < n) {
        if (hand.items[i] == tile) {
            _ = hand.orderedRemove(i);
            removed += 1;
        } else {
            i += 1;
        }
    }
    return removed == n;
}
