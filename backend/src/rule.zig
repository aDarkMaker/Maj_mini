const std = @import("std");
const t = @import("types.zig");

pub const Counts = struct {
    c: [t.NUM_TILES]u8,

    pub fn init() Counts {
        return .{ .c = @splat(0) };
    }

    pub fn total(self: Counts) usize {
        var sum: usize = 0;
        for (self.c) |v| sum += v;
        return sum;
    }

    pub fn add(self: *Counts, idx: usize, n: u8) void {
        self.c[idx] += n;
    }

    pub fn sub(self: *Counts, idx: usize, n: u8) void {
        self.c[idx] -= n;
    }

    pub fn suitCount(self: Counts) u8 {
        var count: u8 = 0;
        for (0..3) |s| {
            var present = false;
            for (0..9) |r| {
                if (self.c[s * 9 + r] > 0) present = true;
            }
            if (present) count += 1;
        }
        return count;
    }
};

pub fn countsOf(hand: []const t.TileIdx, melds: []const t.Meld) Counts {
    var counts = Counts.init();
    for (hand) |x| counts.add(x, 1);
    for (melds) |m| counts.add(m.tile, m.count());
    return counts;
}

fn canFormMelds(counts: Counts, n: u8) bool {
    if (n == 0) return counts.total() == 0;

    var i: usize = 0;
    while (i < t.NUM_TILES) : (i += 1) {
        if (counts.c[i] >= 3) {
            var next = counts;
            next.sub(i, 3);
            if (canFormMelds(next, n - 1)) return true;
        }
    }

    var s: usize = 0;
    while (s < 3) : (s += 1) {
        var r: usize = 0;
        while (r < 7) : (r += 1) {
            const a = s * 9 + r;
            const b = a + 1;
            const c = a + 2;
            if (counts.c[a] >= 1 and counts.c[b] >= 1 and counts.c[c] >= 1) {
                var next = counts;
                next.sub(a, 1);
                next.sub(b, 1);
                next.sub(c, 1);
                if (canFormMelds(next, n - 1)) return true;
            }
        }
    }
    return false;
}

fn canFormTriplets(counts: Counts, n: u8) bool {
    if (n == 0) return counts.total() == 0;

    var i: usize = 0;
    while (i < t.NUM_TILES) : (i += 1) {
        if (counts.c[i] >= 3) {
            var next = counts;
            next.sub(i, 3);
            if (canFormTriplets(next, n - 1)) return true;
        }
    }
    return false;
}

pub fn checkQiDui(counts: Counts) bool {
    if (counts.total() != 14) return false;
    var pairs: usize = 0;
    for (counts.c) |v| {
        if (v == 2 or v == 4) {
            pairs += v >> 1;
        } else if (v == 1 or v == 3) {
            return false;
        }
    }
    return pairs >= 7;
}

fn checkStandard(counts: Counts) bool {
    if (counts.total() != 14) return false;
    var i: usize = 0;
    while (i < t.NUM_TILES) : (i += 1) {
        if (counts.c[i] >= 2) {
            var next = counts;
            next.sub(i, 2);
            if (canFormMelds(next, 4)) return true;
        }
    }
    return false;
}

pub fn isDaDuiZi(counts: Counts) bool {
    if (counts.total() != 14) return false;
    var i: usize = 0;
    while (i < t.NUM_TILES) : (i += 1) {
        if (counts.c[i] >= 2) {
            var next = counts;
            next.sub(i, 2);
            if (canFormTriplets(next, 4)) return true;
        }
    }
    return false;
}

pub fn longQiDuiGenCount(counts: Counts) usize {
    if (counts.total() != 14 or !checkQiDui(counts)) return 0;
    var n: usize = 0;
    for (counts.c) |v| {
        if (v == 4) n += 1;
    }
    return n;
}

pub fn isQingYiSe(counts: Counts) bool {
    return counts.suitCount() == 1;
}

fn hasQueSuitTile(counts: Counts, que: t.Suit) bool {
    for (1..10) |r| {
        if (counts.c[t.tileOf(que, @intCast(r))] > 0) return true;
    }
    return false;
}

pub fn canWin(hand: []const t.TileIdx, melds: []const t.Meld, que_suit: ?t.Suit) bool {
    const counts = countsOf(hand, melds);
    if (counts.total() != 14) return false;
    if (que_suit) |que| {
        if (hasQueSuitTile(counts, que)) return false;
    }
    if (counts.suitCount() > 2) return false;
    return checkStandard(counts) or checkQiDui(counts);
}

pub fn isHuaZhu(hand: []const t.TileIdx, melds: []const t.Meld) bool {
    return countsOf(hand, melds).suitCount() == 3;
}

fn contains(items: []const t.TileIdx, x: t.TileIdx) bool {
    for (items) |i| {
        if (i == x) return true;
    }
    return false;
}

pub fn validDiscards(gpa: std.mem.Allocator, hand: []const t.TileIdx, que_suit: ?t.Suit) !std.ArrayList(t.TileIdx) {
    var out: std.ArrayList(t.TileIdx) = .empty;
    if (hand.len == 0) return out;

    if (que_suit) |que| {
        for (hand) |x| {
            if (t.suitOf(x) == que and !contains(out.items, x)) try out.append(gpa, x);
        }
        if (out.items.len > 0) return out;
    }

    for (hand) |x| {
        if (!contains(out.items, x)) try out.append(gpa, x);
    }
    return out;
}

pub fn hasTing(hand: []const t.TileIdx, melds: []const t.Meld) bool {
    if (hand.len != 13) return false;
    var buf: [14]t.TileIdx = undefined;
    for (hand, 0..) |x, i| buf[i] = x;
    for (t.ALL_TILES) |x| {
        buf[13] = x;
        if (canWin(&buf, melds, null)) return true;
    }
    return false;
}
