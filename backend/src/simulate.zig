const std = @import("std");
const t = @import("types.zig");
const rule = @import("rule.zig");
const init = @import("init.zig");
const players = @import("players.zig");
const gameover = @import("gameover.zig");

pub const BASE_MONEY: i64 = 1;

pub const Result = struct {
    net: [t.NUM_PLAYERS]i64,
    winners: [t.NUM_PLAYERS]bool,
    win_count: usize,
    reason: t.Reason,
};

fn allocGame(gpa: std.mem.Allocator) !t.Game {
    var game: t.Game = .{ .players = undefined };
    for (0..t.NUM_PLAYERS) |i| {
        game.players[i] = .{ .index = @intCast(i) };
        try game.players[i].hand.ensureTotalCapacity(gpa, 14);
        try game.players[i].melds.ensureTotalCapacity(gpa, 4);
        try game.players[i].discarded.ensureTotalCapacity(gpa, 24);
    }
    return game;
}

fn subtractDeck(gpa: std.mem.Allocator, deck: []const t.TileIdx, hand: []const t.TileIdx) ![]t.TileIdx {
    var counts: [t.NUM_TILES]i32 = @splat(0);
    for (deck) |x| counts[x] += 1;
    for (hand) |x| counts[x] -= 1;

    const out = try gpa.alloc(t.TileIdx, deck.len - hand.len);
    var n: usize = 0;
    for (deck) |x| {
        if (counts[x] > 0) {
            counts[x] -= 1;
            out[n] = x;
            n += 1;
        }
    }
    return out;
}

fn dealRest(rest: []const t.TileIdx, dealer: u8, dst: *[t.NUM_PLAYERS]t.Player) usize {
    var offset: usize = 0;
    for (0..3) |_| {
        for (0..t.NUM_PLAYERS) |i| {
            const who = (dealer + i) % t.NUM_PLAYERS;
            if (who == dealer) continue;
            for (0..4) |_| {
                dst[who].hand.appendAssumeCapacity(rest[offset]);
                offset += 1;
            }
        }
    }
    for (1..t.NUM_PLAYERS) |k| {
        const who = (dealer + k) % t.NUM_PLAYERS;
        dst[who].hand.appendAssumeCapacity(rest[offset]);
        offset += 1;
    }
    return offset;
}

pub fn buildStateWithFirstDiscard(
    gpa: std.mem.Allocator,
    hand14: []const t.TileIdx,
    first_discard: t.TileIdx,
    seed: u64,
    player0_que: ?t.Suit,
) !?t.Game {
    const deck = try init.createDeck(gpa);
    defer gpa.free(deck);

    const rest = try subtractDeck(gpa, deck, hand14);
    if (rest.len != t.DECK_SIZE - 14) {
        gpa.free(rest);
        return null;
    }
    init.shuffleSeeded(rest, seed);

    var game = try allocGame(gpa);
    const offset = dealRest(rest, 0, &game.players);
    game.wall = rest[offset..];

    game.players[0].hand.clearRetainingCapacity();
    try game.players[0].hand.appendSlice(gpa, hand14);
    game.current_player = 0;
    game.phase = .discard;

    for (0..t.NUM_PLAYERS) |i| {
        const s: u8 = if (i == 0 and player0_que != null)
            @backingInt(player0_que.?)
        else
            @intCast((seed + i) % 3);
        game.players[i].que_suit = @fromBackingInt(@intCast(s));
    }

    return try players.discard(gpa, &game, first_discard, 0);
}

fn passToNext(gpa: std.mem.Allocator, game: *const t.Game, winners: []const bool) !t.Game {
    const from = game.last_discard_from orelse game.current_player;
    const next = players.nextActive(from, winners) orelse return players.cloneGame(gpa, game);
    var out = try players.cloneGame(gpa, game);
    out.current_player = next;
    out.phase = .draw;
    out.last_discarded = null;
    out.last_discard_from = null;
    return out;
}

fn randomDiscard(gpa: std.mem.Allocator, hand: []const t.TileIdx, que: ?t.Suit, rng: *init.Lcg) !?t.TileIdx {
    var valid = try rule.validDiscards(gpa, hand, que);
    defer valid.deinit(gpa);
    if (valid.items.len == 0) return null;
    const i: usize = @intFromFloat(rng.float() * @as(f64, @floatFromInt(valid.items.len)));
    return valid.items[@min(i, valid.items.len - 1)];
}

pub fn runGameToEnd(gpa: std.mem.Allocator, start: *const t.Game, seed: u64) !Result {
    var summary: gameover.Summary = .{};
    defer summary.history.deinit(gpa);

    var rng = init.Lcg.init(seed);
    var current = try players.cloneGame(gpa, start);

    while (!gameover.isRoundOver(&current, &summary)) {
        const who = current.current_player;

        if (current.phase == .draw) {
            if (summary.winners[who]) {
                const next = players.nextActive(who, &summary.winners) orelse break;
                current.current_player = next;
                continue;
            }
            if (current.wallRemaining() == 0) break;

            const drawn = try players.draw(gpa, &current, who);
            players.deinitGame(gpa, &current);
            current = drawn;

            for (current.players[who].hand.items) |tile| {
                if (!rule.canWin(current.players[who].hand.items, current.players[who].melds.items, current.players[who].que_suit)) continue;
                const won = try players.win(gpa, &current, who, tile, true);
                players.deinitGame(gpa, &current);
                current = won;
                try summary.addWinner(gpa, who, true, null);
                break;
            }
            continue;
        }

        if (current.phase == .discard) {
            const que = current.players[who].que_suit;
            const maybe_tile = try randomDiscard(gpa, current.players[who].hand.items, que, &rng);
            const tile = maybe_tile orelse break;

            const discarded = try players.discard(gpa, &current, tile, who);
            players.deinitGame(gpa, &current);
            current = discarded;

            const last_tile = current.last_discarded.?;
            const from_who = current.last_discard_from orelse who;
            var someone_won = false;
            for (0..t.NUM_PLAYERS) |i| {
                if (i == from_who or summary.winners[i]) continue;
                var hand_with = try current.players[i].hand.clone(gpa);
                defer hand_with.deinit(gpa);
                try hand_with.append(gpa, last_tile);
                if (!rule.canWin(hand_with.items, current.players[i].melds.items, current.players[i].que_suit)) continue;

                const won = try players.win(gpa, &current, @intCast(i), last_tile, false);
                players.deinitGame(gpa, &current);
                current = won;
                try summary.addWinner(gpa, @intCast(i), false, from_who);
                someone_won = true;
                break;
            }
            if (!someone_won) {
                const passed = try passToNext(gpa, &current, &summary.winners);
                players.deinitGame(gpa, &current);
                current = passed;
            }
            continue;
        }

        const passed = try passToNext(gpa, &current, &summary.winners);
        players.deinitGame(gpa, &current);
        current = passed;
    }

    const settled = try gameover.settle(&current, &summary, BASE_MONEY);
    const result = Result{
        .net = settled.net,
        .winners = summary.winners,
        .win_count = summary.win_count,
        .reason = settled.reason,
    };
    players.deinitGame(gpa, &current);
    return result;
}

pub fn runRollout(
    gpa: std.mem.Allocator,
    hand14: []const t.TileIdx,
    first_discard: t.TileIdx,
    rollouts_per_action: usize,
    base_seed: u64,
    player0_que: ?t.Suit,
) !f64 {
    if (rollouts_per_action == 0) return 0;
    var sum: i64 = 0;
    for (0..rollouts_per_action) |r| {
        const built = try buildStateWithFirstDiscard(gpa, hand14, first_discard, base_seed + r, player0_que);
        if (built) |game_const| {
            var game = game_const;
            defer players.deinitGame(gpa, &game);
            const res = try runGameToEnd(gpa, &game, base_seed + 1000 + r);
            sum += res.net[0];
        }
    }
    return @as(f64, @floatFromInt(sum)) / @as(f64, @floatFromInt(rollouts_per_action));
}

pub fn runSelfPlay(gpa: std.mem.Allocator, seed: u64) !Result {
    var game = try init.initGame(gpa, 0, seed);
    defer players.deinitGame(gpa, &game);
    return runGameToEnd(gpa, &game, seed);
}
