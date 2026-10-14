const std = @import("std");
const t = @import("types.zig");
const rule = @import("rule.zig");
const init = @import("init.zig");
const players = @import("players.zig");
const gameover = @import("gameover.zig");
const simulate = @import("simulate.zig");

pub const ProtoError = error{
    BadRequest,
    UnknownCommand,
    Engine,
} || std.mem.Allocator.Error || std.Io.Writer.Error;

const WireMeld = struct {
    type: []const u8,
    tiles: []const []const u8,
    kongType: ?[]const u8 = null,
};

const WirePlayer = struct {
    index: u8 = 0,
    hand: []const []const u8,
    melds: []const WireMeld,
    discarded: []const []const u8,
    queSuit: ?t.Suit = null,
};

const WireGame = struct {
    players: [t.NUM_PLAYERS]WirePlayer,
    wall: []const []const u8,
    currentPlayer: u8,
    lastDiscarded: ?[]const u8 = null,
    lastDiscardFrom: ?u8 = null,
    phase: t.Phase,
};

fn parseMeld(w: WireMeld) ProtoError!t.Meld {
    const tile = t.parseTileId(w.tiles[0]) orelse return error.BadRequest;
    if (std.mem.eql(u8, w.type, "pong")) return .{ .kind = .pong, .tile = tile };
    if (!std.mem.eql(u8, w.type, "kong")) return error.BadRequest;
    const kt: ?t.KongType = if (w.kongType) |s|
        (if (std.mem.eql(u8, s, "concealed"))
            .concealed
        else if (std.mem.eql(u8, s, "exposed"))
            .exposed
        else if (std.mem.eql(u8, s, "added"))
            .added
        else
            return error.BadRequest)
    else
        null;
    return .{ .kind = .kong, .tile = tile, .kong_type = kt };
}

pub fn parseGame(arena: std.mem.Allocator, value: std.json.Value) ProtoError!t.Game {
    const wire = std.json.parseFromValue(WireGame, arena, value, .{ .ignore_unknown_fields = true }) catch return error.BadRequest;
    var game: t.Game = .{ .players = undefined };

    for (0..t.NUM_PLAYERS) |i| {
        var p: t.Player = .{ .index = @intCast(i), .que_suit = wire.value.players[i].queSuit };
        for (wire.value.players[i].hand) |id| {
            try p.hand.append(arena, t.parseTileId(id) orelse return error.BadRequest);
        }
        for (wire.value.players[i].melds) |m| try p.melds.append(arena, try parseMeld(m));
        for (wire.value.players[i].discarded) |id| {
            try p.discarded.append(arena, t.parseTileId(id) orelse return error.BadRequest);
        }
        game.players[i] = p;
    }

    const wall = try arena.alloc(t.TileIdx, wire.value.wall.len);
    for (wire.value.wall, 0..) |id, i| wall[i] = t.parseTileId(id) orelse return error.BadRequest;
    game.wall = wall;
    game.wall_pos = 0;
    game.current_player = wire.value.currentPlayer;
    game.last_discarded = if (wire.value.lastDiscarded) |s| t.parseTileId(s) orelse return error.BadRequest else null;
    game.last_discard_from = wire.value.lastDiscardFrom;
    game.phase = wire.value.phase;
    return game;
}

fn tilesToStrings(tiles: []const t.TileIdx, buf: [][2]u8) [][2]u8 {
    const n = @min(tiles.len, buf.len);
    for (tiles[0..n], 0..) |x, i| _ = t.tileIdOf(x, &buf[i]);
    return buf[0..n];
}

fn writeMeld(s: *std.json.Stringify, meld: t.Meld) !void {
    var buf: [4][2]u8 = undefined;
    const n = meld.count();
    for (0..n) |i| _ = t.tileIdOf(meld.tile, &buf[i]);

    try s.beginObject();
    try s.objectField("type");
    try s.write(if (meld.kind == .pong) "pong" else "kong");
    try s.objectField("tiles");
    try s.write(buf[0..n]);
    if (meld.kong_type) |kt| {
        try s.objectField("kongType");
        try s.write(@tagName(kt));
    }
    try s.endObject();
}

pub fn writeGame(s: *std.json.Stringify, game: *const t.Game) !void {
    try s.beginObject();
    try s.objectField("players");
    try s.beginArray();
    for (0..t.NUM_PLAYERS) |i| {
        const p = &game.players[i];
        try s.beginObject();
        try s.objectField("index");
        try s.write(i);
        try s.objectField("hand");
        var hb: [14][2]u8 = undefined;
        try s.write(tilesToStrings(p.hand.items, &hb));
        try s.objectField("melds");
        try s.beginArray();
        for (p.melds.items) |m| try writeMeld(s, m);
        try s.endArray();
        try s.objectField("discarded");
        var db: [24][2]u8 = undefined;
        try s.write(tilesToStrings(p.discarded.items, &db));
        try s.objectField("queSuit");
        try s.write(if (p.que_suit) |q| @tagName(q) else null);
        try s.endObject();
    }
    try s.endArray();

    try s.objectField("wall");
    var wb: [136][2]u8 = undefined;
    try s.write(tilesToStrings(game.wall[game.wall_pos..], &wb));
    try s.objectField("currentPlayer");
    try s.write(game.current_player);
    try s.objectField("lastDiscarded");
    try s.write(if (game.last_discarded) |x| blk: {
        var b: [2]u8 = undefined;
        break :blk t.tileIdOf(x, &b);
    } else null);
    try s.objectField("lastDiscardFrom");
    try s.write(game.last_discard_from);
    try s.objectField("phase");
    try s.write(@tagName(game.phase));
    try s.endObject();
}

fn writeTileList(s: *std.json.Stringify, tiles: []const t.TileIdx) !void {
    var buf: [32][2]u8 = undefined;
    try s.write(tilesToStrings(tiles, &buf));
}

const WireWin = struct {
    who: u8,
    isSelfDraw: bool,
    fromWho: ?u8 = null,
};

const WireSummary = struct {
    winners: []const u8 = &.{},
    winHistory: []const WireWin = &.{},
};

fn toSummary(arena: std.mem.Allocator, wire: WireSummary) ProtoError!gameover.Summary {
    var summary: gameover.Summary = .{};
    for (wire.winners) |w| {
        if (w >= t.NUM_PLAYERS) return error.BadRequest;
        if (!summary.winners[w]) {
            summary.winners[w] = true;
            summary.win_count += 1;
        }
    }
    for (wire.winHistory) |rec| {
        if (rec.who >= t.NUM_PLAYERS) return error.BadRequest;
        try summary.history.append(arena, .{ .who = rec.who, .is_self_draw = rec.isSelfDraw, .from_who = rec.fromWho });
    }
    return summary;
}

fn arg(value: std.json.Value, key: []const u8) std.json.Value {
    return if (value == .object) (value.object.get(key) orelse .null) else .null;
}

fn reqInt(value: std.json.Value, key: []const u8) ProtoError!i64 {
    return switch (arg(value, key)) {
        .integer => |i| i,
        else => error.BadRequest,
    };
}

fn reqTile(value: std.json.Value, key: []const u8) ProtoError!t.TileIdx {
    const v = arg(value, key);
    if (v != .string) return error.BadRequest;
    return t.parseTileId(v.string) orelse error.BadRequest;
}

fn reqPhaseFreeGame(arena: std.mem.Allocator, value: std.json.Value) ProtoError!t.Game {
    return parseGame(arena, arg(value, "state"));
}

pub fn handle(
    arena: std.mem.Allocator,
    id: i64,
    cmd: []const u8,
    args: std.json.Value,
    out: *std.Io.Writer,
) !void {
    var s: std.json.Stringify = .{ .writer = out, .options = .{} };

    handleValue(arena, id, cmd, args, &s) catch |e| {
        try writeError(&s, id, @errorName(e));
        return;
    };
    try s.endObject();
    try out.writeByte('\n');
    try out.flush();
}

fn beginOk(s: *std.json.Stringify, id: i64) !void {
    try s.beginObject();
    try s.objectField("id");
    try s.write(id);
    try s.objectField("ok");
    try s.write(true);
    try s.objectField("value");
}

fn writeError(s: *std.json.Stringify, id: i64, message: []const u8) !void {
    try s.beginObject();
    try s.objectField("id");
    try s.write(id);
    try s.objectField("ok");
    try s.write(false);
    try s.objectField("error");
    try s.write(message);
    try s.endObject();
    try s.writer.writeByte('\n');
    try s.writer.flush();
}

fn handleValue(
    arena: std.mem.Allocator,
    id: i64,
    cmd: []const u8,
    args: std.json.Value,
    s: *std.json.Stringify,
) ProtoError!void {
    if (std.mem.eql(u8, cmd, "init")) {
        const dealer: u8 = if (arg(args, "dealer") == .integer) @intCast(@max(0, @min(3, (arg(args, "dealer")).integer))) else 0;
        const seed: ?u64 = if (arg(args, "seed") == .integer) @intCast(@max(0, (arg(args, "seed")).integer)) else null;
        const game = try init.initGame(arena, dealer, seed);
        try beginOk(s, id);
        try writeGame(s, &game);
        return;
    }

    if (std.mem.eql(u8, cmd, "draw")) {
        var game = try parseGame(arena, arg(args, "state"));
        const who: u8 = @intCast(try reqInt(args, "who"));
        const next = players.draw(arena, &game, who) catch return error.Engine;
        try beginOk(s, id);
        try writeGame(s, &next);
        return;
    }

    if (std.mem.eql(u8, cmd, "discard")) {
        var game = try parseGame(arena, arg(args, "state"));
        const who: u8 = @intCast(try reqInt(args, "who"));
        const tile = try reqTile(args, "tile");
        const next = players.discard(arena, &game, tile, who) catch return error.Engine;
        try beginOk(s, id);
        try writeGame(s, &next);
        return;
    }

    if (std.mem.eql(u8, cmd, "pong")) {
        var game = try parseGame(arena, arg(args, "state"));
        const who: u8 = @intCast(try reqInt(args, "who"));
        const tile = try reqTile(args, "tile");
        const next = players.pong(arena, &game, who, tile) catch return error.Engine;
        try beginOk(s, id);
        try writeGame(s, &next);
        return;
    }

    if (std.mem.eql(u8, cmd, "kong")) {
        var game = try parseGame(arena, arg(args, "state"));
        const who: u8 = @intCast(try reqInt(args, "who"));
        const tile = try reqTile(args, "tile");
        const kind_value = arg(args, "kind");
        if (kind_value != .string) return error.BadRequest;
        const parsed_kind = std.json.parseFromValue(t.KongType, arena, kind_value, .{}) catch return error.BadRequest;
        const next = players.kong(arena, &game, who, tile, parsed_kind.value) catch return error.Engine;
        try beginOk(s, id);
        try writeGame(s, &next);
        return;
    }

    if (std.mem.eql(u8, cmd, "win")) {
        var game = try parseGame(arena, arg(args, "state"));
        const who: u8 = @intCast(try reqInt(args, "who"));
        const tile = try reqTile(args, "tile");
        const is_self_draw = arg(args, "isSelfDraw") == .bool and arg(args, "isSelfDraw").bool;
        const next = players.win(arena, &game, who, tile, is_self_draw) catch return error.Engine;
        try beginOk(s, id);
        try writeGame(s, &next);
        return;
    }

    if (std.mem.eql(u8, cmd, "can_win")) {
        const HandArgs = struct {
            hand: []const []const u8,
            melds: []const WireMeld = &.{},
            queSuit: ?t.Suit = null,
        };
        const parsed = std.json.parseFromValue(HandArgs, arena, arg(args, "state"), .{}) catch return error.BadRequest;
        var hand: std.ArrayList(t.TileIdx) = .empty;
        for (parsed.value.hand) |x| try hand.append(arena, t.parseTileId(x) orelse return error.BadRequest);
        var melds: std.ArrayList(t.Meld) = .empty;
        for (parsed.value.melds) |m| try melds.append(arena, try parseMeld(m));

        try beginOk(s, id);
        try s.write(rule.canWin(hand.items, melds.items, parsed.value.queSuit));
        return;
    }

    if (std.mem.eql(u8, cmd, "valid_discards")) {
        const HandArgs = struct {
            hand: []const []const u8,
            queSuit: ?t.Suit = null,
        };
        const parsed = std.json.parseFromValue(HandArgs, arena, arg(args, "state"), .{}) catch return error.BadRequest;
        var hand: std.ArrayList(t.TileIdx) = .empty;
        for (parsed.value.hand) |x| try hand.append(arena, t.parseTileId(x) orelse return error.BadRequest);

        const valid = try rule.validDiscards(arena, hand.items, parsed.value.queSuit);
        try beginOk(s, id);
        try writeTileList(s, valid.items);
        return;
    }

    if (std.mem.eql(u8, cmd, "next_active")) {
        const from: u8 = @intCast(try reqInt(args, "from"));
        const WinnersArgs = struct { winners: []const u8 = &.{} };
        const parsed = std.json.parseFromValue(WinnersArgs, arena, args, .{ .ignore_unknown_fields = true }) catch return error.BadRequest;
        var winners: [t.NUM_PLAYERS]bool = @splat(false);
        for (parsed.value.winners) |w| {
            if (w < t.NUM_PLAYERS) winners[w] = true;
        }
        try beginOk(s, id);
        try s.write(players.nextActive(from, &winners));
        return;
    }

    if (std.mem.eql(u8, cmd, "pass_to_next")) {
        var game = try reqPhaseFreeGame(arena, args);
        const WinnersArgs = struct { winners: []const u8 = &.{} };
        const parsed = std.json.parseFromValue(WinnersArgs, arena, args, .{ .ignore_unknown_fields = true }) catch return error.BadRequest;
        var winners: [t.NUM_PLAYERS]bool = @splat(false);
        for (parsed.value.winners) |w| {
            if (w < t.NUM_PLAYERS) winners[w] = true;
        }
        const from = game.last_discard_from orelse game.current_player;
        const next = players.nextActive(from, &winners);
        if (next) |n| {
            game.current_player = n;
            game.phase = .draw;
            game.last_discarded = null;
            game.last_discard_from = null;
        }
        try beginOk(s, id);
        try writeGame(s, &game);
        return;
    }

    if (std.mem.eql(u8, cmd, "is_round_over")) {
        const game = try reqPhaseFreeGame(arena, args);
        const parsed = std.json.parseFromValue(WireSummary, arena, arg(args, "summary"), .{}) catch return error.BadRequest;
        const summary = try toSummary(arena, parsed.value);
        try beginOk(s, id);
        try s.write(gameover.isRoundOver(&game, &summary));
        return;
    }

    if (std.mem.eql(u8, cmd, "settle")) {
        const game = try reqPhaseFreeGame(arena, args);
        const parsed = std.json.parseFromValue(WireSummary, arena, arg(args, "summary"), .{}) catch return error.BadRequest;
        const summary = try toSummary(arena, parsed.value);
        const base_money: i64 = if (arg(args, "baseMoney") == .integer) (arg(args, "baseMoney")).integer else simulate.BASE_MONEY;
        const settled = try gameover.settle(&game, &summary, base_money);

        try beginOk(s, id);
        try s.beginObject();
        try s.objectField("net");
        try s.write(settled.net);
        try s.objectField("reason");
        try s.write(@tagName(settled.reason));
        try s.endObject();
        return;
    }

    if (std.mem.eql(u8, cmd, "simulate")) {
        const SimArgs = struct {
            hand: []const []const u8,
            firstDiscard: []const u8,
            rolloutsPerAction: usize,
            baseSeed: u64,
            queSuit: ?t.Suit = null,
        };
        const parsed = std.json.parseFromValue(SimArgs, arena, args, .{ .ignore_unknown_fields = true }) catch return error.BadRequest;
        var hand: std.ArrayList(t.TileIdx) = .empty;
        for (parsed.value.hand) |x| try hand.append(arena, t.parseTileId(x) orelse return error.BadRequest);
        const first = t.parseTileId(parsed.value.firstDiscard) orelse return error.BadRequest;

        const reward = simulate.runRollout(arena, hand.items, first, parsed.value.rolloutsPerAction, parsed.value.baseSeed, parsed.value.queSuit) catch return error.Engine;
        try beginOk(s, id);
        try s.write(reward);
        return;
    }

    if (std.mem.eql(u8, cmd, "self_play")) {
        const seed: u64 = @intCast(@max(0, try reqInt(args, "seed")));
        const result = simulate.runSelfPlay(arena, seed) catch return error.Engine;
        try beginOk(s, id);
        try s.beginObject();
        try s.objectField("net");
        try s.write(result.net);
        try s.objectField("winners");
        var wb: [4]i64 = undefined;
        var wn: usize = 0;
        for (0..t.NUM_PLAYERS) |i| {
            if (result.winners[i]) {
                wb[wn] = @intCast(i);
                wn += 1;
            }
        }
        try s.write(wb[0..wn]);
        try s.objectField("reason");
        try s.write(@tagName(result.reason));
        try s.endObject();
        return;
    }

    return error.UnknownCommand;
}
