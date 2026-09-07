#!/usr/bin/env python3
"""Aftergraph pro-asset PNG renderer — Python standard library only.

No PIL / resvg / inkscape available in this environment, so icons and the
social card are rasterized from hand-tuned SDF-style geometry that mirrors
the SVG masters in this directory (same palette, same monogram construction).

Outputs (written next to this script unless OUT_DIR is set):
  favicon-16x16.png, favicon-32x32.png, favicon-48x48.png, favicon.ico,
  icon-192.png, icon-512.png, apple-touch-icon.png (180, square corners),
  og-card.png (1200x630, abstract geometric companion of og-card.svg)
"""
import math
import os
import struct
import zlib

INK = (8, 12, 20)
MID = (14, 22, 48)
PAPER = (245, 247, 250)
CYAN = (66, 199, 232)
TEAL = (36, 196, 173)

OUT_DIR = os.environ.get("OUT_DIR", os.path.dirname(os.path.abspath(__file__)))


def clamp01(v):
    return 0.0 if v < 0.0 else (1.0 if v > 1.0 else v)


def seg_dist(px, py, ax, ay, bx, by):
    abx = bx - ax
    aby = by - ay
    t = ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby)
    t = 0.0 if t < 0.0 else (1.0 if t > 1.0 else t)
    dx = px - (ax + abx * t)
    dy = py - (ay + aby * t)
    return math.sqrt(dx * dx + dy * dy)


def hex_verts(cx, cy, r):
    return [
        (cx + r * math.cos(-math.pi / 2 + i * math.pi / 3),
         cy + r * math.sin(-math.pi / 2 + i * math.pi / 3))
        for i in range(6)
    ]


def write_png(path, w, h, buf):
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        raw += buf[y * w * 4:(y + 1) * w * 4]

    def chunk(ctype, data):
        c = struct.pack(">I", len(data)) + ctype + data
        return c + struct.pack(">I", zlib.crc32(ctype + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    png = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
           + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
           + chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)
    return len(png)


def render_icon(size, ss, rounded=True):
    """App-icon monogram: gradient tile, cyan hex, paper nodes, cyan core."""
    W = H = size * ss
    inv = 1.0 / W
    verts = hex_verts(0.5, 0.5, 0.345)
    segs = [(verts[i], verts[(i + 1) % 6]) for i in range(6)]
    halfw = 0.020
    dot_r = 0.030
    dia_h = 0.072
    rad = 0.22
    buf = bytearray(W * H * 4)
    for y in range(H):
        v = (y + 0.5) * inv
        row = y * W * 4
        for x in range(W):
            u = (x + 0.5) * inv
            # rounded-rect mask
            if rounded:
                qx = abs(u - 0.5) - (0.5 - rad)
                qy = abs(v - 0.5) - (0.5 - rad)
                ax = qx if qx > 0 else 0.0
                ay = qy if qy > 0 else 0.0
                d = math.sqrt(ax * ax + ay * ay) + (qx if qx > qy else qy) - rad
                mask = clamp01(-d * W)
            else:
                mask = 1.0
            # vertical gradient MID -> INK + top cyan glow
            t = v
            r = MID[0] + (INK[0] - MID[0]) * t
            g = MID[1] + (INK[1] - MID[1]) * t
            b = MID[2] + (INK[2] - MID[2]) * t
            gd = math.sqrt((u - 0.5) ** 2 + (v - 0.30) ** 2)
            glow = max(0.0, 1.0 - gd / 0.55) ** 2 * 0.30
            r += (CYAN[0] - r) * glow
            g += (CYAN[1] - g) * glow
            b += (CYAN[2] - b) * glow
            # hexagon stroke
            dh = 10.0
            for (a, bb) in segs:
                d = seg_dist(u, v, a[0], a[1], bb[0], bb[1])
                if d < dh:
                    dh = d
            cov = clamp01(0.5 - (dh - halfw) * W)
            r += (CYAN[0] - r) * cov
            g += (CYAN[1] - g) * cov
            b += (CYAN[2] - b) * cov
            # node dots
            dn = 10.0
            for (nx, ny) in verts:
                d = math.sqrt((u - nx) ** 2 + (v - ny) ** 2)
                if d < dn:
                    dn = d
            cov = clamp01(0.5 - (dn - dot_r) * W)
            r += (PAPER[0] - r) * cov
            g += (PAPER[1] - g) * cov
            b += (PAPER[2] - b) * cov
            # diamond core
            dd = abs(u - 0.5) + abs(v - 0.5) - dia_h
            cov = clamp01(-dd * W * 0.5 + 0.25)
            # sharper fill: full inside, AA rim handled by cov ramp
            cov = 1.0 if dd < -1.0 / W else (0.0 if dd > 1.0 / W else 0.5 - dd * W * 0.5)
            r += (CYAN[0] - r) * cov
            g += (CYAN[1] - g) * cov
            b += (CYAN[2] - b) * cov
            o = row + x * 4
            buf[o] = int(r + 0.5)
            buf[o + 1] = int(g + 0.5)
            buf[o + 2] = int(b + 0.5)
            buf[o + 3] = int(255 * mask + 0.5)
    # box downsample to target size
    out = bytearray(size * size * 4)
    for y in range(size):
        for x in range(size):
            sr = sg = sb = sa = 0
            for j in range(ss):
                base = ((y * ss + j) * W + x * ss) * 4
                for i in range(ss):
                    o = base + i * 4
                    sr += buf[o]
                    sg += buf[o + 1]
                    sb += buf[o + 2]
                    sa += buf[o + 3]
            n = ss * ss
            o = (y * size + x) * 4
            out[o] = (sr + n // 2) // n
            out[o + 1] = (sg + n // 2) // n
            out[o + 2] = (sb + n // 2) // n
            out[o + 3] = (sa + n // 2) // n
    return out


def render_og(w=1200, h=630):
    """Abstract geometric companion of og-card.svg (no text: stdlib only)."""
    buf = bytearray(w * h * 4)
    verts = hex_verts(0.21 * w, 0.5 * h, 150.0)
    segs = [(verts[i], verts[(i + 1) % 6]) for i in range(6)]
    for y in range(h):
        v = y / h
        row = y * w * 4
        for x in range(w):
            u = x / w
            t = (u + v) * 0.5
            r = MID[0] + (INK[0] - MID[0]) * t
            g = MID[1] + (INK[1] - MID[1]) * t
            b = MID[2] + (INK[2] - MID[2]) * t
            # faint grid every 48px
            if x % 48 == 0 or y % 48 == 0:
                r += (PAPER[0] - r) * 0.05
                g += (PAPER[1] - g) * 0.05
                b += (PAPER[2] - b) * 0.05
            # cyan glow top-left, teal glow bottom-right
            d1 = math.sqrt((x - 0.18 * w) ** 2 + (y - 0.20 * h) ** 2)
            k = max(0.0, 1.0 - d1 / 520.0) ** 2 * 0.28
            r += (CYAN[0] - r) * k
            g += (CYAN[1] - g) * k
            b += (CYAN[2] - b) * k
            d2 = math.sqrt((x - 0.88 * w) ** 2 + (y - 0.95 * h) ** 2)
            k = max(0.0, 1.0 - d2 / 520.0) ** 2 * 0.22
            r += (TEAL[0] - r) * k
            g += (TEAL[1] - g) * k
            b += (TEAL[2] - b) * k
            # hexagon mark
            dh = 1e9
            for (a, bb) in segs:
                d = seg_dist(x, y, a[0], a[1], bb[0], bb[1])
                if d < dh:
                    dh = d
            if dh < 15.0:
                k = 1.0 if dh < 13.0 else (15.0 - dh) / 2.0
                r += (CYAN[0] - r) * k
                g += (CYAN[1] - g) * k
                b += (CYAN[2] - b) * k
            dn = 1e9
            for (nx, ny) in verts:
                d = math.sqrt((x - nx) ** 2 + (y - ny) ** 2)
                if d < dn:
                    dn = d
            if dn < 12.0:
                k = 1.0 if dn < 10.0 else (12.0 - dn) / 2.0
                r += (PAPER[0] - r) * k
                g += (PAPER[1] - g) * k
                b += (PAPER[2] - b) * k
            cxm, cym = 0.21 * w, 0.5 * h
            if abs(x - cxm) + abs(y - cym) < 30:
                r, g, b = CYAN
            # title bars (abstract text lines)
            if 255 <= y < 295 and 430 <= x < 990:
                r, g, b = PAPER
            if 320 <= y < 348 and 432 <= x < 800:
                r, g, b = (137, 147, 164)
            if 362 <= y < 390 and 432 <= x < 880:
                r, g, b = PAPER
            if 425 <= y < 431 and 432 <= x < 552:
                r, g, b = CYAN
            if 425 <= y < 431 and 560 <= x < 608:
                r, g, b = TEAL
            o = row + x * 4
            buf[o] = int(r + 0.5)
            buf[o + 1] = int(g + 0.5)
            buf[o + 2] = int(b + 0.5)
            buf[o + 3] = 255
    return buf


def write_ico(path, png_entries):
    """ICO container with PNG-compressed entries (Vista+ compatible)."""
    n = len(png_entries)
    header = struct.pack("<HHH", 0, 1, n)
    offset = 6 + 16 * n
    dirpart = b""
    for (size, data) in png_entries:
        w = 256 if size >= 256 else size
        dirpart += struct.pack("<BBBBHHII", w, w, 0, 0, 1, 32, len(data), offset)
        offset += len(data)
    with open(path, "wb") as f:
        f.write(header + dirpart)
        for (_, data) in png_entries:
            f.write(data)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    jobs = [
        ("favicon-16x16.png", 16, 4, True),
        ("favicon-32x32.png", 32, 4, True),
        ("favicon-48x48.png", 48, 4, True),
        ("icon-192.png", 192, 2, True),
        ("icon-512.png", 512, 2, True),
        ("apple-touch-icon.png", 180, 2, False),
    ]
    png_bytes = {}
    for (name, size, ss, rounded) in jobs:
        print("render %s ..." % name, flush=True)
        buf = render_icon(size, ss, rounded)
        p = os.path.join(OUT_DIR, name)
        n = write_png(p, size, size, buf)
        print("  wrote %s (%d bytes)" % (p, n), flush=True)
        with open(p, "rb") as f:
            png_bytes[name] = f.read()
    print("render og-card.png ...", flush=True)
    buf = render_og()
    p = os.path.join(OUT_DIR, "og-card.png")
    n = write_png(p, 1200, 630, buf)
    print("  wrote %s (%d bytes)" % (p, n), flush=True)
    ico = os.path.join(OUT_DIR, "favicon.ico")
    write_ico(ico, [(16, png_bytes["favicon-16x16.png"]),
                    (32, png_bytes["favicon-32x32.png"]),
                    (48, png_bytes["favicon-48x48.png"])])
    print("  wrote %s (%d bytes)" % (ico, os.path.getsize(ico)), flush=True)


if __name__ == "__main__":
    main()
