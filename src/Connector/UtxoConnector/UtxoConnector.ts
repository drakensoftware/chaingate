import { Connector } from '../Connector';
import type { AddressOptions } from '../Connector';
import { UtxoExplorer } from '../../Explorer/UtxoExplorer';
import type { Wallet } from '../../Wallet/Wallet';
import { XpubWallet } from '../../Wallet/ViewOnlyWallet/XpubWallet/XpubWallet';
import { PublicKeyWallet } from '../../Wallet/ViewOnlyWallet/PublicKeyWallet/PublicKeyWallet';
import { HDWallet } from '../../Wallet/SigningWallet/HDWallet/HDWallet';
import { PrivateKeyWallet } from '../../Wallet/SigningWallet/PrivateKeyWallet/PrivateKeyWallet';
import { UnsupportedOperationError } from '../../errors';
import { Amount } from '../../utils/Amount';
import { hexToBytes } from '../../utils';
import type { UtxoAddressType, UtxoNetworkDescriptor } from '../../ChainGate/networks';
import { UtxoTransaction } from './UtxoTransaction';
import { CustomUtxoTransaction, signCustomUtxoTransaction } from './CustomUtxoTransaction';
import type { CustomUtxoTransactionParams } from './CustomUtxoTransaction';
import { createPrivateKeyGetter } from './utxoConnectorUtils';

/** Options for resolving a UTXO wallet address. */
export interface UtxoAddressOptions extends AddressOptions {
  /** Address type override. When omitted the network's default is used. */
  addressType?: UtxoAddressType;
}

/**
 * Connector for UTXO-based networks (Bitcoin, Litecoin, Dogecoin, Bitcoin Testnet).
 *
 * Bridges a {@link Wallet} with a {@link UtxoExplorer} to provide
 * address derivation, balance queries, and transaction broadcasting.
 *
 * @example
 * ```ts
 * const cg = new ChainGate();
 * const btcConn = cg.connect(cg.networks.bitcoin, wallet);
 *
 * // Default address (segwit for Bitcoin)
 * const addr = await btcConn.address();
 *
 * // Taproot address (auto-resolves derivation path)
 * const taprootAddr = await btcConn.address({ addressType: 'taproot' });
 *
 * // Legacy address with custom derivation path
 * const legacyAddr = await btcConn.address({ addressType: 'legacy', derivationPath: "m/44'/0'/0'/0" });
 *
 * const balance = await btcConn.addressBalance();
 *
 * const amount = cg.networks.bitcoin.amount('0.001');
 * const tx = await btcConn.transfer(amount, 'bc1q...');
 * ```
 */
export class UtxoConnector extends Connector<Wallet, UtxoExplorer, UtxoNetworkDescriptor> {
  /** @internal */
  constructor(wallet: Wallet, explorer: UtxoExplorer, network: UtxoNetworkDescriptor) {
    super(wallet, explorer, network);
  }

  /**
   * Resolves the effective address type and derivation path from the given options.
   * @internal
   */
  private resolveAddressOptions(options?: UtxoAddressOptions): {
    index: number;
    addressType: UtxoAddressType;
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
   * Returns the address for this wallet on this UTXO network.
   *
   * - **HD wallets**: derives at `{derivationPath}/{index}` using the derivation
   *   path for the selected address type (or the network default).
   * - **Single-key wallets**: only index `0` is valid. The address type determines
   *   the encoding (segwit, legacy, taproot) of the same public key.
   * - **XpubWallet**: derives at `m/0/{index}`.
   */
  public async address(options?: UtxoAddressOptions): Promise<string> {
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
  public async addressBalance(options?: UtxoAddressOptions): Promise<{
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
  public async addressHistory(page?: string, options?: UtxoAddressOptions) {
    const addr = await this.address(options);
    return this.explorer.getAddressHistory(addr, page);
  }

  /**
   * Returns paginated UTXOs for this wallet's address.
   *
   * @param page - Pagination cursor.
   */
  public async addressUtxos(page?: string, options?: UtxoAddressOptions) {
    const addr = await this.address(options);
    return this.explorer.getUtxosByAddress(addr, page);
  }

  /**
   * Creates a UTXO transfer transaction with recommended fees.
   *
   * The returned {@link UtxoTransaction} can be inspected, have its fee adjusted,
   * and then signed + broadcast.
   *
   * @param amount - Amount to send. Create via
   *   {@link NetworkDescriptor.amount | cg.networks.bitcoin.amount(0.001)} or
   *   {@link NetworkDescriptor.amountFromCurrency | cg.networks.bitcoin.amountFromCurrency('usd', 50)}.
   * @param toAddress - Recipient address.
   *
   * @throws {@link UnsupportedOperationError} if the wallet is view-only.
   */
  public async transfer(
    amount: Amount,
    toAddress: string,
    options?: UtxoAddressOptions,
  ): Promise<UtxoTransaction> {
    const { index, derivationPath } = this.resolveAddressOptions(options);
    const fromAddress = await this.address(options);
    const valueSat = amount.min();
    const getPrivateKey = createPrivateKeyGetter(this.wallet, index, derivationPath);

    return UtxoTransaction.create({
      explorer: this.explorer,
      fromAddress,
      toAddress,
      valueSat,
      networkParams: this.network.networkParams,
      getPrivateKey,
    });
  }

  /**
   * Creates a custom UTXO transaction with caller-defined inputs and outputs.
   *
   * @param params - Inputs and outputs for the transaction.
   * @throws {@link UnsupportedOperationError} if the wallet is view-only.
   */
  public createTransaction(
    params: CustomUtxoTransactionParams,
    options?: UtxoAddressOptions,
  ): CustomUtxoTransaction {
    const { index, derivationPath } = this.resolveAddressOptions(options);
    const getPrivateKey = createPrivateKeyGetter(this.wallet, index, derivationPath);

    return new CustomUtxoTransaction({
      explorer: this.explorer,
      networkParams: this.network.networkParams,
      inputs: params.inputs,
      outputs: params.outputs,
      getPrivateKey,
      signTransaction: signCustomUtxoTransaction,
    });
  }
}
