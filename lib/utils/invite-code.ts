const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function generateInviteCode(length = 10): string {
  const n = ALPHABET.length;
  // Largest multiple of n that fits in a byte — reject above it to avoid the
  // modulo bias that would otherwise make low-index characters slightly likelier.
  const limit = Math.floor(256 / n) * n;
  let out = "";
  const buf = new Uint8Array(length);
  while (out.length < length) {
    crypto.getRandomValues(buf);
    for (let i = 0; i < buf.length && out.length < length; i++) {
      if (buf[i] < limit) out += ALPHABET[buf[i] % n];
    }
  }
  return out;
}

export function isValidInviteCode(code: string): boolean {
  if (code.length < 6 || code.length > 16) return false;
  for (const ch of code) {
    if (!ALPHABET.includes(ch)) return false;
  }
  return true;
}
