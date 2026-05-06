import { BaseEvmConnector } from '../EvmConnector/BaseEvmConnector';
import type { CreateEvmTransactionParams } from '../EvmConnector/BaseEvmConnector';
import type { AddressOptions } from '../Connector';
import { EvmRpcExplorer } from './EvmRpcExplorer';
import type { Wallet } from '../../Wallet/Wallet';
import { Amount } from '../../utils/Amount';
import type { BaseValue } from '../../utils/Amount';
import Decimal from 'decimal.js';
import type { EvmRpcNetworkDescriptor } from '../../ChainGate/networks';
import { EvmRpcTransaction } from './EvmRpcTransaction';
import { encodeErc20Transfer } from '../../utils/abiEncode';

/**
 * Connector for any EVM-compatible network via a direct JSON-RPC connection.
 *
 * Supported operations: `address()`, `addressBalance()`, `transfer()`,
 * `transferToken()`, `transferNft()`, `transferErc1155()`, `callContract()`.
 * For transaction history, token-balance discovery, and fiat conversion use
 * {@link EvmConnector} instead.
 *
 * @example
 * ```ts
 * const cg = new ChainGate();
 * const network = cg.networks.evmRpc({
 *   rpcUrl: 'https://bsc-dataseed.binance.org',
 *   chainId: 56,
 *   name: 'BNB Smart Chain',
 *   symbol: 'BNB',
 * });
 *
 * const conn = cg.connect(network, wallet);
 * const addr = await conn.address();
 * const balance = await conn.addressBalance();
 * const tx = await conn.transfer(network.amount('0.1'), '0x...');
 * const broadcasted = await tx.signAndBroadcast();
 * ```
 */
export class EvmRpcConnector extends BaseEvmConnector<
  EvmRpcExplorer,
  EvmRpcNetworkDescriptor,
  EvmRpcTransaction
> {
  /** @internal */
  constructor(wallet: Wallet, explorer: EvmRpcExplorer, network: EvmRpcNetworkDescriptor) {
    super(wallet, explorer, network);
  }

  protected override createTransaction(
    params: CreateEvmTransactionParams,
  ): Promise<EvmRpcTransaction> {
    return EvmRpcTransaction.create({ explorer: this.explorer, ...params });
  }

  /**
   * Returns the native coin balance for this wallet's address.
   *
   * The returned `Amount` uses the network's decimals and native token metadata.
   * Fiat conversion is not supported here — use {@link EvmConnector} when needed.
   */
  public async addressBalance(options?: AddressOptions): Promise<{
    address: string;
    balance: Amount;
  }> {
    const addr = await this.address(options);
    const balanceWei = await this.explorer.getBalance(addr);
    const balance = this.network.amountFromSmallestUnit(balanceWei);
    return { address: addr, balance };
  }

  /**
   * Creates an ERC-20 token transfer transaction.
   *
   * Token decimals are resolved automatically.
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
  ): Promise<EvmRpcTransaction> {
    const { index = 0, derivationPath } = options ?? {};
    const [fromAddress, decimals] = await Promise.all([
      this.address(options),
      this.explorer.getTokenDecimals(contractAddress),
    ]);
    const getPrivateKey = this.createPrivateKeyGetter(index, derivationPath);
    const rawAmount = BigInt(
      new Decimal(amount.toString()).mul(new Decimal(10).pow(decimals)).toFixed(0),
    );
    const data = encodeErc20Transfer(toAddress, rawAmount);

    return this.createTransaction({
      fromAddress,
      toAddress: contractAddress,
      valueWei: 0n,
      data,
      getPrivateKey,
    });
  }
}
