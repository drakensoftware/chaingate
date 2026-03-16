/**
 * Minimal RLP (Recursive Length Prefix) encoder for EVM transaction serialization.
 *
 * Implements the RLP encoding scheme as specified in the Ethereum Yellow Paper,
 * Appendix B. Only encoding is needed — decoding is not required for transaction
 * construction.
 *
 * @see https://ethereum.org/en/developers/docs/data-structures-and-encoding/rlp/
 */

/** An RLP-encodable value: bytes, or a nested list of encodable values. */
export type RlpItem = Uint8Array | RlpItem[];

/**
 * RLP-encodes a single item or nested list of items.
 */
export function rlpEncode(input: RlpItem): Uint8Array {
  if (input instanceof Uint8Array) {
    return encodeBytes(input);
  }
  return encodeList(input);
}

function encodeBytes(data: Uint8Array): Uint8Array {
  // Single byte in [0x00, 0x7f] range encodes as itself.
  if (data.length === 1 && data[0] < 0x80) {
    return data;
  }
  // Short string: 0–55 bytes → prefix = 0x80 + length.
  if (data.length <= 55) {
    const out = new Uint8Array(1 + data.length);
    out[0] = 0x80 + data.length;
    out.set(data, 1);
    return out;
  }
  // Long string: >55 bytes → prefix = 0xb7 + len(len), then len, then data.
  const lenBytes = encodeLength(data.length);
  const out = new Uint8Array(1 + lenBytes.length + data.length);
  out[0] = 0xb7 + lenBytes.length;
  out.set(lenBytes, 1);
  out.set(data, 1 + lenBytes.length);
  return out;
}

function encodeList(items: RlpItem[]): Uint8Array {
  // Concatenate all encoded children.
  const encoded = items.map(rlpEncode);
  const totalLength = encoded.reduce((sum, e) => sum + e.length, 0);

  if (totalLength <= 55) {
    const out = new Uint8Array(1 + totalLength);
    out[0] = 0xc0 + totalLength;
    let offset = 1;
    for (const e of encoded) {
      out.set(e, offset);
      offset += e.length;
    }
    return out;
  }

  const lenBytes = encodeLength(totalLength);
  const out = new Uint8Array(1 + lenBytes.length + totalLength);
  out[0] = 0xf7 + lenBytes.length;
  out.set(lenBytes, 1);
  let offset = 1 + lenBytes.length;
  for (const e of encoded) {
    out.set(e, offset);
    offset += e.length;
  }
  return out;
}

/** Encodes a positive integer length as big-endian bytes (no leading zeros). */
function encodeLength(length: number): Uint8Array {
  const bytes: number[] = [];
  let remaining = length;
  while (remaining > 0) {
    bytes.unshift(remaining & 0xff);
    remaining >>= 8;
  }
  return new Uint8Array(bytes);
}
