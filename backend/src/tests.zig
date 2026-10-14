const std = @import("std");
const t = @import("types.zig");
const rule = @import("rule.zig");
const players = @import("players.zig");
const gameover = @import("gameover.zig");
const score = @import("score.zig");
const init = @import("init.zig");

fn tiles(comptime ids: []const []const u8, buf: *[ids.len]t.TileIdx) []const t.TileIdx {
    for (ids, 0..) |id, i| buf[i] = t.parseTileId(id).?;
    return buf;
}

fn tileIds(comptime ids: []const []const u8, buf: *[ids.len][2]u8) []const [2]u8 {
    for (ids, 0..) |id, i| buf[i] = .{ id[0], id[1] };
    return buf;
}

test "tile id round trip" {
    for (t.ALL_TILES) |x| {
        var buf: [2]u8 = undefined;
        const id = t.tileIdOf(x, &buf);
        try std.testing.expectEqual(x, t.parseTileId(id).?);
    }
}

test "canWin standard" {
    var h: [14]t.TileIdx = undefined;
    const hand = tiles(&.{ "w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "t9", "t9", "t2", "t3", "t1" }, &h);
    try std.testing.expect(rule.canWin(hand, &.{}, null));
}

test "canWin rejects que suit tile" {
    var h: [14]t.TileIdx = undefined;
    const hand = tiles(&.{ "w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "t9", "t9", "t2", "t3", "t1" }, &h);
    try std.testing.expect(!rule.canWin(hand, &.{}, .t));
}

test "canWin qi dui" {
    var h: [14]t.TileIdx = undefined;
    const hand = tiles(&.{ "w1", "w1", "w2", "w2", "w3", "w3", "w4", "w4", "w5", "w5", "w6", "w6", "w7", "w7" }, &h);
    try std.testing.expect(rule.canWin(hand, &.{}, null));
}

test "valid discards forces que suit" {
    const gpa = std.testing.allocator;
    var h: [4]t.TileIdx = undefined;
    const hand = tiles(&.{ "w1", "t2", "b3", "b4" }, &h);
    var valid = try rule.validDiscards(gpa, hand, .b);
    defer valid.deinit(gpa);
    try std.testing.expectEqual(@as(usize, 2), valid.items.len);
}

test "point pao demo" {
    const gpa = std.testing.allocator;

    var h0: [13]t.TileIdx = undefined;
    const hand0 = tiles(&.{ "w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "t9", "t9", "t2", "t3" }, &h0);

    var game: t.Game = .{ .players = undefined };
    for (0..t.NUM_PLAYERS) |i| game.players[i] = .{ .index = @intCast(i) };
    try game.players[0].hand.appendSlice(gpa, hand0);
    defer players.deinitGame(gpa, &game);

    game.current_player = 0;
    game.last_discarded = t.parseTileId("t1");
    game.last_discard_from = 1;
    game.phase = .respond;

    var hand_with = try game.players[0].hand.clone(gpa);
    defer hand_with.deinit(gpa);
    try hand_with.append(gpa, t.parseTileId("t1").?);
    try std.testing.expect(rule.canWin(hand_with.items, &.{}, null));

    var after = try players.win(gpa, &game, 0, t.parseTileId("t1").?, false);
    defer players.deinitGame(gpa, &after);

    var summary: gameover.Summary = .{};
    defer summary.history.deinit(gpa);
    try summary.addWinner(gpa, 0, false, 1);

    const settled = try gameover.settle(&after, &summary, 1);
    try std.testing.expect(settled.net[0] > 0);
    try std.testing.expect(settled.net[1] < 0);
}

test "self draw demo" {
    const gpa = std.testing.allocator;

    var h0: [14]t.TileIdx = undefined;
    const hand0 = tiles(&.{ "w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9", "t9", "t9", "t1", "t2", "t3" }, &h0);

    var game: t.Game = .{ .players = undefined };
    for (0..t.NUM_PLAYERS) |i| game.players[i] = .{ .index = @intCast(i) };
    try game.players[0].hand.appendSlice(gpa, hand0);
    defer players.deinitGame(gpa, &game);

    var wall = [_]t.TileIdx{t.parseTileId("w2").?};
    game.wall = &wall;
    game.current_player = 0;
    game.phase = .discard;

    try std.testing.expect(rule.canWin(game.players[0].hand.items, &.{}, null));
    var after = try players.win(gpa, &game, 0, t.parseTileId("t1").?, true);
    defer players.deinitGame(gpa, &after);

    var summary: gameover.Summary = .{};
    defer summary.history.deinit(gpa);
    try summary.addWinner(gpa, 0, true, null);

    const settled = try gameover.settle(&after, &summary, 1);
    const expected: i64 = @as(i64, @intCast(score.winMultiplierFromOthers(game.players[0].hand.items, &.{}, true))) * 3;
    try std.testing.expectEqual(expected, settled.net[0]);
    try std.testing.expect(settled.net[1] < 0 and settled.net[2] < 0 and settled.net[3] < 0);
}

test "seeded init is deterministic" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const gpa = arena.allocator();

    const g1 = try init.initGame(gpa, 0, 42);
    const g2 = try init.initGame(gpa, 0, 42);

    try std.testing.expectEqualSlices(t.TileIdx, g1.wall, g2.wall);
    for (0..t.NUM_PLAYERS) |i| {
        try std.testing.expectEqualSlices(t.TileIdx, g1.players[i].hand.items, g2.players[i].hand.items);
    }
}

test "deck composition" {
    const gpa = std.testing.allocator;
    const deck = try init.createDeck(gpa);
    defer gpa.free(deck);
    try std.testing.expectEqual(@as(usize, t.DECK_SIZE), deck.len);

    var counts: [t.NUM_TILES]usize = @splat(0);
    for (deck) |x| counts[x] += 1;
    for (counts) |c| try std.testing.expectEqual(@as(usize, 4), c);
}
