import type { EvmNetwork } from '../../Explorer/EvmExplorer';
import type { MarketsResponse } from '../../Client';
import type { TTLCache } from '../../utils/TTLCache';
import { publicKeyToEthAddress, isValidEvmAddress } from '../../utils/crypto';
import { signEvmMessage, verifyEvmMessage } from '../../utils/messageSigning';
import { NetworkDescriptor } from './NetworkDescriptor';
import type { NetworkInfoInternal, EvmAddressType } from './types';

/** A {@link NetworkDescriptor} whose {@link id} is an EVM network. */
export class EvmNetworkDescriptor extends NetworkDescriptor<EvmAddressType> {
  declare readonly id: EvmNetwork;

  /** @internal */
  constructor(
    id: EvmNetwork,
    info: NetworkInfoInternal,
    marketsCache: TTLCache<MarketsResponse>,
    apiKey: string,
  ) {
    super(id, info, marketsCache, apiKey);
  }

  /**
   * Derives an EIP-55 checksummed Ethereum address from a public key.
   *
   * @param publicKey - Compressed or uncompressed secp256k1 public key.
   */
  public override publicKeyToAddress(publicKey: Uint8Array): string {
    return publicKeyToEthAddress(publicKey);
  }

  /**
   * Checks whether a string is a valid EVM address for this network.
   *
   * Accepts both checksummed and all-lowercase/all-uppercase forms.
   * When the address uses mixed case, the EIP-55 checksum is verified.
   *
   * @param address - The address string to validate.
   * @returns `true` if the address is valid.
   */
  public override isValidAddress(address: string): boolean {
    return isValidEvmAddress(address);
  }

  /**
   * Signs a message using EIP-191 personal sign (the same scheme as MetaMask's
   * `personal_sign`).
   *
   * @param message - The message to sign (string or raw bytes).
   * @param privateKey - The 32-byte secp256k1 private key.
   * @returns The 65-byte signature as a hex string with `0x` prefix.
   *
   * @example
   * ```ts
   * const key = await wallet.derive("m/44'/60'/0'/0/0");
   * const sig = cg.networks.ethereum.signMessage('Hello', key.privateKey.raw);
   * ```
   */
  public signMessage(message: string | Uint8Array, privateKey: Uint8Array): string {
    return signEvmMessage(message, privateKey);
  }

  /**
   * Verifies an EIP-191 personal sign signature.
   *
   * @param message - The original message.
   * @param signature - The signature hex string (with `0x` prefix).
   * @param address - The expected signer address.
   * @returns `true` if the signature is valid.
   *
   * @example
   * ```ts
   * const valid = cg.networks.ethereum.verifyMessage('Hello', sig, '0xAb5801a7...');
   * ```
   */
  public verifyMessage(message: string | Uint8Array, signature: string, address: string): boolean {
    return verifyEvmMessage(message, signature, address);
  }
}
