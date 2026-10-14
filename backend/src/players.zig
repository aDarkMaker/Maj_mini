const std = @import("std");
const t = @import("types.zig");
const rule = @import("rule.zig");

pub const Error = error{ InvalidMove, OutOfMemory };

pub fn cloneGame(gpa: std.mem.Allocator, game: *const t.Game) !t.Game {
    var out = game.*;
    for (0..t.NUM_PLAYERS) |i| {
        out.players[i].hand = try game.players[i].hand.clone(gpa);
        out.players[i].melds = try game.players[i].melds.clone(gpa);
        out.players[i].discarded = try game.players[i].discarded.clone(gpa);
    }
    return out;
}

pub fn deinitGame(gpa: std.mem.Allocator, game: *t.Game) void {
    for (0..t.NUM_PLAYERS) |i| {
        game.players[i].hand.deinit(gpa);
        game.players[i].melds.deinit(gpa);
        game.players[i].discarded.deinit(gpa);
    }
}

pub fn nextActive(from: u8, winners: []const bool) ?u8 {
    for (1..t.NUM_PLAYERS + 1) |k| {
        const idx: u8 = @intCast((from + k) % t.NUM_PLAYERS);
        if (!winners[idx]) return idx;
    }
    return null;
}

pub fn draw(gpa: std.mem.Allocator, game: *const t.Game, who: u8) Error!t.Game {
    if (game.phase != .draw) return error.InvalidMove;
    if (game.current_player != who) return error.InvalidMove;

    var next = try cloneGame(gpa, game);
    const tile = next.takeWall() orelse return error.InvalidMove;
    try next.players[who].hand.append(gpa, tile);
    next.phase = .discard;
    return next;
}

pub fn discard(gpa: std.mem.Allocator, game: *const t.Game, tile: t.TileIdx, who: u8) Error!t.Game {
    if (game.phase != .discard) return error.InvalidMove;
    if (game.current_player != who) return error.InvalidMove;

    var next = try cloneGame(gpa, game);
    if (!t.removeFromHand(&next.players[who].hand, tile, 1)) return error.InvalidMove;
    try next.players[who].discarded.append(gpa, tile);
    next.last_discarded = tile;
    next.last_discard_from = who;
    next.phase = .respond;
    return next;
}

pub fn pong(gpa: std.mem.Allocator, game: *const t.Game, who: u8, tile: t.TileIdx) Error!t.Game {
    if (game.phase != .respond) return error.InvalidMove;
    if (game.current_player != who) return error.InvalidMove;

    var next = try cloneGame(gpa, game);
    if (t.countInHand(next.players[who].hand.items, tile) < 2) return error.InvalidMove;
    _ = t.removeFromHand(&next.players[who].hand, tile, 2);
    try next.players[who].melds.append(gpa, .{ .kind = .pong, .tile = tile });
    next.last_discarded = null;
    next.last_discard_from = null;
    next.phase = .respond;
    return next;
}

fn kongDraw(gpa: std.mem.Allocator, game: *const t.Game, who: u8, meld: t.Meld, new_hand: std.ArrayList(t.TileIdx)) Error!t.Game {
    var next = try cloneGame(gpa, game);
    const tile = next.takeWall() orelse return error.InvalidMove;
    next.players[who].hand.deinit(gpa);
    next.players[who].hand = new_hand;
    try next.players[who].melds.append(gpa, meld);
    try next.players[who].hand.append(gpa, tile);
    next.last_discarded = null;
    next.last_discard_from = null;
    next.current_player = who;
    next.phase = .discard;
    return next;
}

pub fn kong(gpa: std.mem.Allocator, game: *const t.Game, who: u8, tile: t.TileIdx, kind: t.KongType) Error!t.Game {
    switch (kind) {
        .concealed => {
            if (game.phase != .draw and game.phase != .discard) return error.InvalidMove;
            if (game.current_player != who) return error.InvalidMove;
            if (t.countInHand(game.players[who].hand.items, tile) < 4) return error.InvalidMove;
            var hand = try game.players[who].hand.clone(gpa);
            _ = t.removeFromHand(&hand, tile, 4);
            return kongDraw(gpa, game, who, .{ .kind = .kong, .tile = tile, .kong_type = .concealed }, hand);
        },
        .exposed => {
            if (game.phase != .respond) return error.InvalidMove;
            if (game.last_discarded != tile) return error.InvalidMove;
            if (t.countInHand(game.players[who].hand.items, tile) < 3) return error.InvalidMove;
            var hand = try game.players[who].hand.clone(gpa);
            _ = t.removeFromHand(&hand, tile, 3);
            return kongDraw(gpa, game, who, .{ .kind = .kong, .tile = tile, .kong_type = .exposed }, hand);
        },
        .added => {
            if (game.phase != .discard) return error.InvalidMove;
            if (game.current_player != who) return error.InvalidMove;
            if (t.countInHand(game.players[who].hand.items, tile) < 1) return error.InvalidMove;

            var next = try cloneGame(gpa, game);
            var found: ?usize = null;
            for (next.players[who].melds.items, 0..) |m, i| {
                if (m.kind == .pong and m.tile == tile) found = i;
            }
            const idx = found orelse return error.InvalidMove;
            _ = t.removeFromHand(&next.players[who].hand, tile, 1);
            next.players[who].melds.items[idx] = .{ .kind = .kong, .tile = tile, .kong_type = .added };

            const new_tile = next.takeWall() orelse return error.InvalidMove;
            try next.players[who].hand.append(gpa, new_tile);
            next.phase = .discard;
            return next;
        },
    }
}

pub fn win(gpa: std.mem.Allocator, game: *const t.Game, who: u8, tile: t.TileIdx, is_self_draw: bool) Error!t.Game {
    const player = &game.players[who];

    var owned_hand: ?std.ArrayList(t.TileIdx) = null;
    defer if (owned_hand) |*h| h.deinit(gpa);

    const hand_items: []const t.TileIdx = if (is_self_draw) blk: {
        if (game.phase != .discard or game.current_player != who) return error.InvalidMove;
        if (t.countInHand(player.hand.items, tile) < 1) return error.InvalidMove;
        break :blk player.hand.items;
    } else blk: {
        if (game.phase != .respond or game.last_discarded != tile) return error.InvalidMove;
        owned_hand = try player.hand.clone(gpa);
        try owned_hand.?.append(gpa, tile);
        break :blk owned_hand.?.items;
    };

    if (!rule.canWin(hand_items, player.melds.items, player.que_suit)) return error.InvalidMove;

    const next_draw_player: u8 = if (is_self_draw) @intCast((who + 1) % t.NUM_PLAYERS) else @intCast(((game.last_discard_from orelse who) + 1) % t.NUM_PLAYERS);

    var next = try cloneGame(gpa, game);
    next.last_discarded = null;
    next.last_discard_from = null;
    next.current_player = next_draw_player;
    next.phase = .draw;

    if (!is_self_draw) {
        try next.players[who].hand.append(gpa, tile);
    }
    return next;
}
