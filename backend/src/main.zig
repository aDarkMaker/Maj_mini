const std = @import("std");
const Io = std.Io;
const protocol = @import("protocol.zig");

pub fn main(init: std.process.Init) !void {
    const gpa = init.gpa;
    const io = init.io;

    var request_arena = std.heap.ArenaAllocator.init(gpa);
    defer request_arena.deinit();

    var in_buf: [1 << 16]u8 = undefined;
    var stdin_file = Io.File.stdin().readerStreaming(io, &in_buf);
    const reader = &stdin_file.interface;

    var out_buf: [1 << 16]u8 = undefined;
    var stdout_file = Io.File.stdout().writerStreaming(io, &out_buf);
    const writer = &stdout_file.interface;

    while (try reader.takeDelimiter('\n')) |line| {
        if (line.len == 0) continue;
        defer _ = request_arena.reset(.retain_capacity);
        const arena = request_arena.allocator();
        handleLine(arena, line, writer) catch |e| {
            try writer.print("{{\"id\":0,\"ok\":false,\"error\":\"{s}\"}}\n", .{@errorName(e)});
            try writer.flush();
        };
    }
}

fn handleLine(arena: std.mem.Allocator, line: []const u8, writer: *std.Io.Writer) !void {
    const req = std.json.parseFromSlice(std.json.Value, arena, line, .{}) catch {
        try writer.writeAll("{\"id\":0,\"ok\":false,\"error\":\"BadRequest\"}\n");
        try writer.flush();
        return;
    };
    const obj = req.value.object;

    const id: i64 = switch (obj.get("id") orelse .null) {
        .integer => |i| i,
        else => 0,
    };
    const cmd: []const u8 = switch (obj.get("cmd") orelse .null) {
        .string => |x| x,
        else => "",
    };
    const args = obj.get("args") orelse .null;

    try protocol.handle(arena, id, cmd, args, writer);
}
