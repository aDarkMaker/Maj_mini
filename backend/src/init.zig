const std = @import("std");
const t = @import("types.zig");

pub const Lcg = struct {
    state: u64,

    pub fn init(seed: u64) Lcg {
        return .{ .state = seed };
    }

    pub fn next(self: *Lcg) u32 {
        self.state = (self.state *% 1103515245 +% 12345) & 0x7fff_ffff;
        return @intCast(self.state);
    }

    pub fn float(self: *Lcg) f64 {
        return @as(f64, @floatFromInt(self.next())) / @as(f64, 0x8000_0000);
    }
};

pub fn createDeck(arena: std.mem.Allocator) ![]t.TileIdx {
    const deck = try arena.alloc(t.TileIdx, t.DECK_SIZE);
    var i: usize = 0;
    for (0..t.NUM_TILES) |idx| {
        for (0..4) |_| {
            deck[i] = @intCast(idx);
            i += 1;
        }
    }
    return deck;
}

pub fn shuffleSeeded(deck: []t.TileIdx, seed: u64) void {
    var rng = Lcg.init(seed);
    var i: usize = deck.len;
    while (i > 1) {
        i -= 1;
        const j = rng.next() % @as(u32, @intCast(i + 1));
        const tmp = deck[i];
        deck[i] = deck[j];
        deck[j] = tmp;
    }
}

fn emptyGame() t.Game {
    var g: t.Game = .{ .players = undefined };
    for (0..t.NUM_PLAYERS) |i| {
        g.players[i] = .{ .index = @intCast(i) };
    }
    return g;
}

fn dealFromWall(wall: []const t.TileIdx, dealer: u8, players: *[t.NUM_PLAYERS]t.Player) usize {
    var offset: usize = 0;
    for (0..3) |_| {
        for (0..t.NUM_PLAYERS) |i| {
            const who = (dealer + i) % t.NUM_PLAYERS;
            for (0..4) |_| {
                players[who].hand.appendAssumeCapacity(wall[offset]);
                offset += 1;
            }
        }
    }
    players[dealer].hand.appendAssumeCapacity(wall[offset]);
    offset += 1;
    players[dealer].hand.appendAssumeCapacity(wall[offset]);
    offset += 1;
    for (1..t.NUM_PLAYERS) |k| {
        const who = (dealer + k) % t.NUM_PLAYERS;
        players[who].hand.appendAssumeCapacity(wall[offset]);
        offset += 1;
    }
    return offset;
}

pub fn initGame(arena: std.mem.Allocator, dealer: u8, seed: ?u64) !t.Game {
    const deck = try createDeck(arena);
    if (seed) |s| shuffleSeeded(deck, s);

    var g = emptyGame();
    for (0..t.NUM_PLAYERS) |i| {
        try g.players[i].hand.ensureTotalCapacity(arena, 14);
        try g.players[i].melds.ensureTotalCapacity(arena, 4);
        try g.players[i].discarded.ensureTotalCapacity(arena, 24);
    }

    const offset = dealFromWall(deck, dealer, &g.players);
    g.wall = deck[offset..];
    g.wall_pos = 0;
    g.current_player = dealer;
    g.phase = .discard;

    for (0..t.NUM_PLAYERS) |i| {
        const s: u8 = if (seed) |sd| @intCast((@abs(sd) + i) % 3) else @intCast(i % 3);
        g.players[i].que_suit = @fromBackingInt(@intCast(s));
    }
    return g;
}
