const t = @import("types.zig");
const rule = @import("rule.zig");

pub const ZIMO_ADDITION = 1;
pub const DEFAULT_CAP: usize = 8;

pub fn kongFan(kong_type: t.KongType) usize {
    return switch (kong_type) {
        .concealed => 2,
        .exposed => 2,
        .added => 1,
    };
}

pub fn baseFan(hand: []const t.TileIdx, melds: []const t.Meld) usize {
    const counts = rule.countsOf(hand, melds);
    if (counts.total() != 14) return 0;

    const qing = rule.isQingYiSe(counts);
    const qi_dui = rule.checkQiDui(counts);
    const long_gen = rule.longQiDuiGenCount(counts);

    if (qi_dui) return (if (qing) @as(usize, 6) else @as(usize, 3)) + long_gen;

    if (qing and rule.isDaDuiZi(counts)) return 4;
    if (qing) return 3;
    if (rule.isDaDuiZi(counts)) return 2;
    return 1;
}

pub fn fanToMultiplier(fan: usize, cap: usize) usize {
    if (fan < 1) return 0;
    const shift = @min(fan - 1, 16);
    const mult = @as(usize, 1) << @intCast(shift);
    return @min(mult, cap);
}

pub fn winMultiplier(hand: []const t.TileIdx, melds: []const t.Meld) usize {
    return fanToMultiplier(baseFan(hand, melds), DEFAULT_CAP);
}

pub fn winMultiplierFromOthers(hand: []const t.TileIdx, melds: []const t.Meld, is_self_draw: bool) usize {
    return winMultiplier(hand, melds) + (if (is_self_draw) @as(usize, ZIMO_ADDITION) else @as(usize, 0));
}
