import { Connector } from '../Connector';
import type { AddressOptions } from '../Connector';
import { UtxoExplorer } from '../../Explorer/UtxoExplorer';
import type { Wallet } from '../../Wallet/Wallet';
import { HDWallet } from '../../Wallet/SigningWallet/HDWallet/HDWallet';
import { PrivateKeyWallet } from '../../Wallet/SigningWallet/PrivateKeyWallet/PrivateKeyWallet';
import { XpubWallet } from '../../Wallet/ViewOnlyWallet/XpubWallet/XpubWallet';
import { PublicKeyWallet } from '../../Wallet/ViewOnlyWallet/PublicKeyWallet/PublicKeyWallet';
import { UnsupportedOperationError } from '../../errors';
import { Amount } from '../../utils/Amount';
import { hexToBytes } from '../../utils';
import type { BchAddressType, BchNetworkDescriptor } from '../../ChainGate/networks';
import { BchTransaction } from './BchTransaction';
import { createPrivateKeyGetter } from './utxoConnectorUtils';

/** Options for resolving a Bitcoin Cash wallet address. */
export interface BchAddressOptions extends AddressOptions {
  /** Address type override. When omitted the network's default (`'cashaddr'`) is used. */
  addressType?: BchAddressType;
}

/**
 * Connector for Bitcoin Cash (BCH).
 *
 * @example
 * ```ts
 * const cg = new ChainGate({ apiKey: 'your-key' });
 * const bch = cg.connect(cg.networks.bitcoincash, wallet);
 *
 * // Default address (cashaddr)
 * const addr = await bch.address();
 *
 * // Legacy address
 * const legacyAddr = await bch.address({ addressType: 'legacy' });
 *
 * const balance = await bch.addressBalance();
 *
 * const amount = cg.networks.bitcoincash.amount('0.01');
 * const tx = await bch.transfer(amount, 'bitcoincash:qq...');
 * ```
 */
export class BchConnector extends Connector<Wallet, UtxoExplorer, BchNetworkDescriptor> {
  /** @internal */
  constructor(wallet: Wallet, explorer: UtxoExplorer, network: BchNetworkDescriptor) {
    super(wallet, explorer, network);
  }

  /**
   * Resolves the effective address type and derivation path from the given options.
   * @internal
   */
  private resolveAddressOptions(options?: BchAddressOptions): {
    index: number;
    addressType: BchAddressType;
    derivationPath: string;
  } {
    const { index = 0, addressType, derivationPath } = options ?? {};
    const resolvedType = addressType ?? this.network.defaultAddressType;

    const typeConfig = this.network.addressTypes[resolvedType];
    if (!typeConfig) {
      const supported = Object.keys(this.network.addressTypes).join(', ');
      throw new UnsupportedOperationError(
        `Address type '${resolvedType}' is not supported on network '${this.network.id}'. ` +
          `Supported types: ${supported}.`,
      );
    }
    const resolvedPath = derivationPath ?? typeConfig.derivationPath;

    return { index, addressType: resolvedType, derivationPath: resolvedPath };
  }

  /**
   * Returns the address for this wallet on the Bitcoin Cash network.
   *
   * - **HD wallets**: derives at `{derivationPath}/{index}` using the derivation
   *   path for the selected address type (or the network default).
   * - **Single-key wallets**: only index `0` is valid. The address type determines
   *   the encoding (cashaddr or legacy) of the same public key.
   * - **XpubWallet**: derives at `m/0/{index}`.
   */
  public async address(options?: BchAddressOptions): Promise<string> {
    const { index, addressType, derivationPath } = this.resolveAddressOptions(options);
    const wallet = this.wallet;

    if (wallet instanceof HDWallet) {
      const fullPath = `${derivationPath}/${index}`;
      const derived = await wallet.derivePublicKey(fullPath);
      return this.network.publicKeyToAddress(derived.publicKey, addressType);
    }

    if (wallet instanceof XpubWallet) {
      const relativePath = `m/0/${index}`;
      const derived = await wallet.derive(relativePath);
      return this.network.publicKeyToAddress(derived.publicKey, addressType);
    }

    if (index !== 0) {
      throw new UnsupportedOperationError(
        `Wallet type '${wallet.walletType}' does not support indexed address derivation. ` +
          `Only index 0 is valid for single-key wallets.`,
      );
    }

    if (wallet instanceof PrivateKeyWallet || wallet instanceof PublicKeyWallet) {
      const pubKeyBytes = hexToBytes(wallet.publicKey);
      return this.network.publicKeyToAddress(pubKeyBytes, addressType);
    }

    throw new UnsupportedOperationError(`Unsupported wallet type: ${wallet.walletType}`);
  }

  /**
   * Returns the confirmed and unconfirmed balance for this wallet's address.
   */
  public async addressBalance(options?: BchAddressOptions): Promise<{
    address: string;
    confirmed: Amount;
    unconfirmed: Amount;
  }> {
    const addr = await this.address(options);
    return this.explorer.getAddressBalance(addr);
  }

  /**
   * Returns paginated transaction history for this wallet's address.
   *
   * @param page - Pagination cursor.
   */
  public async addressHistory(page?: string, options?: BchAddressOptions) {
    const addr = await this.address(options);
    return this.explorer.getAddressHistory(addr, page);
  }

  /**
   * Returns paginated UTXOs for this wallet's address.
   *
   * @param page - Pagination cursor.
   */
  public async addressUtxos(page?: string, options?: BchAddressOptions) {
    const addr = await this.address(options);
    return this.explorer.getUtxosByAddress(addr, page);
  }

  /**
   * Creates a BCH transfer transaction with recommended fees.
   *
   * @param amount - Amount to send.
   * @param toAddress - Recipient address (cashaddr or legacy).
   *
   * @throws {@link UnsupportedOperationError} if the wallet is view-only.
   */
  public async transfer(
    amount: Amount,
    toAddress: string,
    options?: BchAddressOptions,
  ): Promise<BchTransaction> {
    const { index, derivationPath } = this.resolveAddressOptions(options);
    const fromAddress = await this.address(options);
    const valueSat = amount.min();
    const getPrivateKey = createPrivateKeyGetter(this.wallet, index, derivationPath);

    return BchTransaction.create({
      explorer: this.explorer,
      fromAddress,
      toAddress,
      valueSat,
      networkParams: this.network.networkParams,
      getPrivateKey,
    });
  }
}
