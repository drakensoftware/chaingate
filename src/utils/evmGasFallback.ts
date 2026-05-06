/** Intrinsic gas for a simple ETH value transfer (no calldata). */
export const SIMPLE_TRANSFER_GAS = 21_000n;

/**
 * Conservative gas estimates per standard ERC function selector. Used only as
 * a fallback when on-chain gas estimation fails. Values are upper bounds for a
 * typical implementation — bespoke contracts with hooks may need more.
 */
const SELECTOR_GAS: Readonly<Record<string, bigint>> = {
  '0xa9059cbb': 90_000n, // ERC-20 transfer(address,uint256)
  '0x23b872dd': 120_000n, // ERC-20/721 transferFrom(address,address,uint256)
  '0x42842e0e': 120_000n, // ERC-721 safeTransferFrom(address,address,uint256)
  '0xb88d4fde': 130_000n, // ERC-721 safeTransferFrom(address,address,uint256,bytes)
  '0xf242432a': 130_000n, // ERC-1155 safeTransferFrom(address,address,uint256,uint256,bytes)
  '0x2eb2c2d6': 250_000n, // ERC-1155 safeBatchTransferFrom(...)
  '0x095ea7b3': 70_000n, // ERC-20/721 approve(address,uint256)
  '0xa22cb465': 60_000n, // ERC-721/1155 setApprovalForAll(address,bool)
};

/** Gas fallback for unrecognized contract calls. */
const UNKNOWN_CONTRACT_CALL_GAS = 200_000n;

/** Fallback gas limit derived from the calldata function selector. */
export function fallbackGasFromCalldata(data: string): bigint {
  if (data === '0x' || data.length < 10) return SIMPLE_TRANSFER_GAS;
  const selector = data.slice(0, 10).toLowerCase();
  return SELECTOR_GAS[selector] ?? UNKNOWN_CONTRACT_CALL_GAS;
}
