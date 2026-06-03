import crypto from "crypto";

// Server-authoritative reference id. 30 bits of randomness encoded as 6
// uppercase base32 chars (RFC 4648, alphabet [A-Z2-7], no padding) — gives
// ~1.07 B distinct ids per year, which is collision-free at any volume we'll
// ever serve. Format matches `REFERENCE_RE` in `src/lib/design-id.ts`.

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; // 32 chars

function id6(): string {
  // 30 bits → 4 random bytes is plenty; mask & shift to 6 base32 chars.
  const buf = crypto.randomBytes(4);
  // pack first 30 bits of buf into a 30-bit integer
  const n = ((buf[0] << 22) | (buf[1] << 14) | (buf[2] << 6) | (buf[3] >> 2)) >>> 0;
  let out = "";
  for (let i = 5; i >= 0; i--) {
    out += B32[(n >> (i * 5)) & 0x1f];
  }
  return out;
}

export function makeReference(date: Date = new Date()): string {
  return `EH-${date.getFullYear()}-${id6()}`;
}
