/**
 * Minimal ABI encoding utilities for ERC-20, ERC-721 and ERC-1155 transfer
 * calldata. No external ABI libraries are needed.
 *
 * All functions return a hex string with `0x` prefix ready to be used as
 * transaction `data`.
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Pads a hex string (without 0x) to 32 bytes (64 hex chars), left-aligned with zeros. */
function padLeft32(hex: string): string {
  return hex.padStart(64, '0');
}

/** Encodes a bigint as a 32-byte ABI word (uint256). */
function encodeUint256(value: bigint): string {
  if (value < 0n) throw new RangeError('ABI uint256 cannot be negative');
  const hex = value.toString(16);
  if (hex.length > 64) throw new RangeError('Value exceeds uint256 range');
  return padLeft32(hex);
}

/**
 * Encodes an Ethereum address as a 32-byte ABI word.
 * Accepts addresses with or without `0x` prefix.
 */
function encodeAddress(address: string): string {
  const clean = address.startsWith('0x') ? address.substring(2) : address;
  if (clean.length !== 40) {
    throw new RangeError(`Invalid address length: expected 40 hex chars, got ${clean.length}`);
  }
  return padLeft32(clean.toLowerCase());
}

// ---------------------------------------------------------------------------
// ERC-20: transfer(address,uint256)
// ---------------------------------------------------------------------------

/** Function selector for `transfer(address,uint256)`. */
const ERC20_TRANSFER_SELECTOR = 'a9059cbb';

/**
 * Encodes the calldata for an ERC-20 `transfer(address to, uint256 amount)` call.
 *
 * @param to - Recipient address.
 * @param amount - Amount of tokens in the token's smallest unit (e.g. wei for 18-decimal tokens).
 * @returns Hex string with `0x` prefix.
 */
export function encodeErc20Transfer(to: string, amount: bigint): string {
  return '0x' + ERC20_TRANSFER_SELECTOR + encodeAddress(to) + encodeUint256(amount);
}

// ---------------------------------------------------------------------------
// ERC-721: safeTransferFrom(address,address,uint256)
// ---------------------------------------------------------------------------

/** Function selector for `safeTransferFrom(address,address,uint256)`. */
const ERC721_SAFE_TRANSFER_FROM_SELECTOR = '42842e0e';

/**
 * Encodes the calldata for an ERC-721
 * `safeTransferFrom(address from, address to, uint256 tokenId)` call.
 *
 * @param from - Current owner address.
 * @param to - Recipient address.
 * @param tokenId - The NFT token ID.
 * @returns Hex string with `0x` prefix.
 */
export function encodeErc721SafeTransferFrom(from: string, to: string, tokenId: bigint): string {
  return (
    '0x' +
    ERC721_SAFE_TRANSFER_FROM_SELECTOR +
    encodeAddress(from) +
    encodeAddress(to) +
    encodeUint256(tokenId)
  );
}

// ---------------------------------------------------------------------------
// ERC-1155: safeTransferFrom(address,address,uint256,uint256,bytes)
// ---------------------------------------------------------------------------

/** Function selector for `safeTransferFrom(address,address,uint256,uint256,bytes)`. */
const ERC1155_SAFE_TRANSFER_FROM_SELECTOR = 'f242432a';

/**
 * Encodes the calldata for an ERC-1155
 * `safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)` call.
 *
 * The `data` parameter is always empty (`0x`).
 *
 * @param from - Current owner address.
 * @param to - Recipient address.
 * @param tokenId - The token ID.
 * @param amount - Number of tokens to transfer.
 * @returns Hex string with `0x` prefix.
 */
export function encodeErc1155SafeTransferFrom(
  from: string,
  to: string,
  tokenId: bigint,
  amount: bigint,
): string {
  // Dynamic `bytes` parameter: offset points to the data section after the
  // 5 words (5 * 32 = 160 = 0xa0), and the data itself is empty (length 0).
  const offset = encodeUint256(160n); // offset to bytes data
  const bytesLength = encodeUint256(0n); // empty bytes

  return (
    '0x' +
    ERC1155_SAFE_TRANSFER_FROM_SELECTOR +
    encodeAddress(from) +
    encodeAddress(to) +
    encodeUint256(tokenId) +
    encodeUint256(amount) +
    offset +
    bytesLength
  );
}
