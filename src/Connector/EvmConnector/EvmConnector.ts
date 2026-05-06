import { BaseEvmConnector } from './BaseEvmConnector';
import type { CreateEvmTransactionParams } from './BaseEvmConnector';
import type { AddressOptions } from '../Connector';
import { EvmExplorer } from '../../Explorer/EvmExplorer';
import type { Wallet } from '../../Wallet/Wallet';
import type { EvmAddressHistoryResponse, EvmAddressTxCountResponse } from '../../Client';
import { Amount } from '../../utils/Amount';
import type { BaseValue } from '../../utils/Amount';
import type { EvmNetworkDescriptor } from '../../ChainGate/networks';
import { EvmTransaction } from './EvmTransaction';
import { encodeErc20Transfer } from '../../utils/abiEncode';

/**
 * Connector for Ethereum (and EVM-compatible) networks.
 *
 * For network-level operations (blocks, gas, broadcasting, contract calls,
 * tokens, NFTs, logos) use {@link EvmExplorer} via
 * `cg.explore(cg.networks.ethereum)`.
 *
 * @example
 * ```ts
 * const cg = new ChainGate();
 * const eth = cg.connect(cg.networks.ethereum, wallet);
 *
 * // Get the default address (index 0)
 * const addr = await eth.address();
 *
 * // Get address at index 3
 * const addr3 = await eth.address({ index: 3 });
 *
 * // Query balance (uses the wallet's default address)
 * const balance = await eth.addressBalance();
 *
 * // Query balance at a specific index
 * const balance3 = await eth.addressBalance({ index: 3 });
 * ```
 */
export class EvmConnector extends BaseEvmConnector<
  EvmExplorer,
  EvmNetworkDescriptor,
  EvmTransaction
> {
  /** @internal */
  constructor(wallet: Wallet, explorer: EvmExplorer, network: EvmNetworkDescriptor) {
    super(wallet, explorer, network);
  }

  protected override createTransaction(
    params: CreateEvmTransactionParams,
  ): Promise<EvmTransaction> {
    return EvmTransaction.create({ explorer: this.explorer, ...params });
  }

  /** Returns the confirmed and unconfirmed balance for this wallet's address. */
  public async addressBalance(options?: AddressOptions): Promise<{
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
  public async addressHistory(
    page?: string,
    options?: AddressOptions,
  ): Promise<EvmAddressHistoryResponse> {
    const addr = await this.address(options);
    return this.explorer.getAddressHistory(addr, page);
  }

  /**
   * Returns all ERC-20/ERC-721/ERC-1155 token balances for this wallet's address.
   *
   * Each balance is an {@link Amount}. Use `isToken` and `isNFT` to distinguish types.
   */
  public async addressTokenBalances(options?: AddressOptions): Promise<Amount[]> {
    const addr = await this.address(options);
    return this.explorer.getAddressTokenBalances(addr);
  }

  /** Returns the nonce (transaction count) for this wallet's address. */
  public async addressTransactionCount(
    options?: AddressOptions,
  ): Promise<EvmAddressTxCountResponse> {
    const addr = await this.address(options);
    return this.explorer.getAddressTransactionCount(addr);
  }

  /**
   * Creates an ERC-20 token transfer transaction.
   *
   * Token decimals are resolved automatically, so only the amount
   * in human-readable units is required.
   *
   * @param contractAddress - Token contract address (with `0x` prefix).
   * @param amount - Amount of tokens in human-readable units.
   * @param toAddress - Recipient address.
   *
   * @throws {@link UnsupportedOperationError} if the wallet is view-only.
   */
  public async transferToken(
    contractAddress: string,
    amount: BaseValue,
    toAddress: string,
    options?: AddressOptions,
  ): Promise<EvmTransaction> {
    const { index = 0, derivationPath } = options ?? {};
    const [fromAddress, tokenData] = await Promise.all([
      this.address(options),
      this.explorer.getTokenData(contractAddress),
    ]);
    const getPrivateKey = this.createPrivateKeyGetter(index, derivationPath);
    const decimals = tokenData.decimals ?? 0;
    const tokenAmount = Amount.fromDecimal(
      amount,
      decimals,
      { symbol: tokenData.symbol ?? '', name: tokenData.name ?? '', network: this.network.id },
      this.explorer.global.marketsCache,
    );
    const data = encodeErc20Transfer(toAddress, tokenAmount.min());

    return this.createTransaction({
      fromAddress,
      toAddress: contractAddress,
      valueWei: 0n,
      data,
      getPrivateKey,
    });
  }
}
