const std = @import("std");
const t = @import("types.zig");
const rule = @import("rule.zig");
const score = @import("score.zig");

pub const WinRecord = struct {
    who: u8,
    is_self_draw: bool,
    from_who: ?u8 = null,
};

pub const Summary = struct {
    winners: [t.NUM_PLAYERS]bool = @splat(false),
    win_count: usize = 0,
    history: std.ArrayList(WinRecord) = .empty,

    pub fn addWinner(self: *Summary, gpa: std.mem.Allocator, who: u8, is_self_draw: bool, from_who: ?u8) !void {
        if (!self.winners[who]) {
            self.winners[who] = true;
            self.win_count += 1;
        }
        try self.history.append(gpa, .{ .who = who, .is_self_draw = is_self_draw, .from_who = from_who });
    }
};

pub fn isRoundOver(game: *const t.Game, summary: *const Summary) bool {
    if (summary.win_count >= 3) return true;
    if (game.wallRemaining() > 0) return false;
    if (game.players[game.current_player].hand.items.len == 14) return false;
    return summary.win_count <= 2;
}

pub const Settle = struct {
    net: [t.NUM_PLAYERS]i64,
    reason: t.Reason,
};

pub fn settle(game: *const t.Game, summary: *const Summary, base_money: i64) !Settle {
    var net: [t.NUM_PLAYERS]i64 = @splat(0);

    var winners_before: [t.NUM_PLAYERS]bool = @splat(false);
    for (summary.history.items) |rec| {
        const p = &game.players[rec.who];
        const mult: i64 = @intCast(score.winMultiplierFromOthers(p.hand.items, p.melds.items, rec.is_self_draw));
        const amount = mult * base_money;

        if (rec.is_self_draw) {
            var payers: i64 = 0;
            for (0..t.NUM_PLAYERS) |i| {
                if (i != rec.who and !winners_before[i]) payers += 1;
            }
            net[rec.who] += amount * payers;
            for (0..t.NUM_PLAYERS) |i| {
                if (i != rec.who and !winners_before[i]) net[i] -= amount;
            }
        } else {
            const from = rec.from_who orelse 0;
            if (!winners_before[from]) {
                net[rec.who] += amount;
                net[from] -= amount;
            }
        }
        winners_before[rec.who] = true;
    }

    const is_liuju = game.wallRemaining() == 0 and summary.win_count < 3 and (t.NUM_PLAYERS - summary.win_count) >= 2;
    if (!is_liuju) return .{ .net = net, .reason = .normal };

    const hua_zhu_cap: i64 = 16;
    const full_cap: i64 = 8;

    var not_winners: [t.NUM_PLAYERS]u8 = undefined;
    var not_winners_len: usize = 0;
    for (0..t.NUM_PLAYERS) |i| {
        if (!summary.winners[i]) {
            not_winners[not_winners_len] = @intCast(i);
            not_winners_len += 1;
        }
    }

    var hua_zhu: [t.NUM_PLAYERS]bool = @splat(false);
    var ting: [t.NUM_PLAYERS]bool = @splat(false);
    for (not_winners[0..not_winners_len]) |i| {
        const p = &game.players[i];
        hua_zhu[i] = rule.isHuaZhu(p.hand.items, p.melds.items);
    }
    for (not_winners[0..not_winners_len]) |i| {
        if (hua_zhu[i]) continue;
        const p = &game.players[i];
        ting[i] = rule.hasTing(p.hand.items, p.melds.items);
    }

    for (not_winners[0..not_winners_len]) |i| {
        if (!hua_zhu[i]) continue;
        for (not_winners[0..not_winners_len]) |j| {
            if (hua_zhu[j]) continue;
            net[i] -= hua_zhu_cap * base_money;
            net[j] += hua_zhu_cap * base_money;
        }
    }

    const pay = full_cap * base_money;
    for (not_winners[0..not_winners_len]) |i| {
        if (hua_zhu[i] or ting[i]) continue;
        for (not_winners[0..not_winners_len]) |j| {
            if (!ting[j]) continue;
            net[i] -= pay;
            net[j] += pay;
        }
    }

    return .{ .net = net, .reason = .liuju };
}
