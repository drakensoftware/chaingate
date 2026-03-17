import type { AddressOptions } from '../Connector';
import { EvmRpcExplorer } from './EvmRpcExplorer';
import type { Wallet } from '../../Wallet/Wallet';
import { HDWallet } from '../../Wallet/SigningWallet/HDWallet/HDWallet';
import { PrivateKeyWallet } from '../../Wallet/SigningWallet/PrivateKeyWallet/PrivateKeyWallet';
import { XpubWallet } from '../../Wallet/ViewOnlyWallet/XpubWallet/XpubWallet';
import { PublicKeyWallet } from '../../Wallet/ViewOnlyWallet/PublicKeyWallet/PublicKeyWallet';
import { hexToBytes } from '../../utils';
import { UnsupportedOperationError } from '../../errors';
import { Amount } from '../../utils/Amount';
import type { BaseValue } from '../../utils/Amount';
import Decimal from 'decimal.js';
import type { EvmRpcNetworkDescriptor } from '../../ChainGate/networks';
import { EvmRpcTransaction } from './EvmRpcTransaction';
import {
  encodeErc20Transfer,
  encodeErc721SafeTransferFrom,
  encodeErc1155SafeTransferFrom,
} from '../../utils/abiEncode';

/**
 * Connector for any EVM-compatible network via a direct JSON-RPC connection.
 *
 * Unlike {@link EvmConnector}, this connector does **not** use the ChainGate
 * API. It talks directly to the RPC endpoint provided in the network
 * configuration.
 *
 * **Supported operations:** `address()`, `addressBalance()`, `transfer()`.
 *
 * **Not supported** (throws {@link UnsupportedOperationError}):
 * `addressHistory`, `addressTokenBalances`, `addressTransactionCount` — these
 * require an indexer and are not available through a plain JSON-RPC node.
 *
 * @example
 * ```ts
 * const cg = new ChainGate({ apiKey: '...' });
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
export class EvmRpcConnector {
  protected readonly wallet: Wallet;
  protected readonly explorer: EvmRpcExplorer;
  protected readonly network: EvmRpcNetworkDescriptor;
  private readonly defaultDerivationPath: string;

  /** @internal */
  constructor(wallet: Wallet, explorer: EvmRpcExplorer, network: EvmRpcNetworkDescriptor) {
    this.wallet = wallet;
    this.explorer = explorer;
    this.network = network;

    const typeConfig = network.addressTypes[network.defaultAddressType];
    if (!typeConfig) {
      throw new UnsupportedOperationError(
        `Network '${network.name}' does not have address type configuration.`,
      );
    }
    this.defaultDerivationPath = typeConfig.derivationPath;
  }

  /**
   * Returns the EVM address for this wallet.
   *
   * - **HD wallets** (`PhraseWallet`, `SeedWallet`, `XprivWallet`): derives at
   *   `{derivationPath}/{index}` (defaults to `m/44'/60'/0'/0/0`).
   * - **Single-key wallets** (`PrivateKeyWallet`, `PublicKeyWallet`): returns
   *   the address for the wallet's public key. Only index `0` is valid.
   * - **XpubWallet**: derives at `m/0/{index}` (relative to the xpub).
   */
  public async address(options?: AddressOptions): Promise<string> {
    const { index = 0, derivationPath } = options ?? {};
    const wallet = this.wallet;

    if (wallet instanceof HDWallet) {
      const basePath = derivationPath ?? this.defaultDerivationPath;
      const fullPath = `${basePath}/${index}`;
      const derived = await wallet.derivePublicKey(fullPath);
      return this.network.publicKeyToAddress(derived.publicKey);
    }

    if (wallet instanceof XpubWallet) {
      const relativePath = `m/0/${index}`;
      const derived = await wallet.derive(relativePath);
      return this.network.publicKeyToAddress(derived.publicKey);
    }

    if (index !== 0) {
      throw new UnsupportedOperationError(
        `Wallet type '${wallet.walletType}' does not support indexed address derivation. ` +
          `Only index 0 is valid for single-key wallets.`,
      );
    }

    if (wallet instanceof PrivateKeyWallet || wallet instanceof PublicKeyWallet) {
      return this.network.publicKeyToAddress(hexToBytes(wallet.publicKey));
    }

    throw new UnsupportedOperationError(`Unsupported wallet type: ${wallet.walletType}`);
  }

  /**
   * Returns the native coin balance for this wallet's address.
   *
   * The returned `Amount` uses the network's decimals and native token metadata
   * but does **not** support fiat conversion (no market data via RPC).
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
   * Creates a native coin transfer transaction with fees estimated from the RPC
   * node.
   *
   * The returned {@link EvmRpcTransaction} can be inspected, have its fee
   * adjusted, and then signed + broadcast.
   *
   * @param amount - Amount to send. Create via
   *   {@link EvmRpcNetworkDescriptor.amount | network.amount(0.1)}.
   * @param toAddress - Recipient address (checksummed or lowercase with `0x`).
   *
   * @throws {@link UnsupportedOperationError} if the wallet is view-only.
   */
  public async transfer(
    amount: Amount,
    toAddress: string,
    options?: AddressOptions,
  ): Promise<EvmRpcTransaction> {
    const { index = 0, derivationPath } = options ?? {};
    const fromAddress = await this.address(options);
    const valueWei = amount.min();
    const getPrivateKey = this.createPrivateKeyGetter(index, derivationPath);

    return EvmRpcTransaction.create({
      explorer: this.explorer,
      fromAddress,
      toAddress,
      valueWei,
      getPrivateKey,
    });
  }

  /**
   * Creates an ERC-20 token transfer transaction.
   *
   * Token decimals are fetched automatically from the contract, so you only
   * need to specify the amount in human-readable units (e.g. `'1.5'` for 1.5
   * tokens).
   *
   * The returned {@link EvmRpcTransaction} can be inspected, have its fee
   * adjusted, and then signed + broadcast — just like a native coin transfer.
   *
   * @param contractAddress - Token contract address (with `0x` prefix).
   * @param amount - Amount of tokens in human-readable units (e.g. `'10'`,
   *   `1.5`, `'0.001'`). Decimals are resolved automatically.
   * @param toAddress - Recipient address.
   *
   * @throws {@link UnsupportedOperationError} if the wallet is view-only.
   *
   * @example
   * ```ts
   * // Send 10 tokens — decimals are resolved automatically
   * const tx = await conn.transferToken(
   *   '0xTokenContract...',
   *   '10',
   *   '0xRecipient...',
   * );
   * const broadcasted = await tx.signAndBroadcast();
   * ```
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

    return EvmRpcTransaction.create({
      explorer: this.explorer,
      fromAddress,
      toAddress: contractAddress,
      valueWei: 0n,
      data,
      getPrivateKey,
    });
  }

  /**
   * Creates an ERC-721 NFT transfer transaction using `safeTransferFrom`.
   *
   * @param contractAddress - NFT contract address (with `0x` prefix).
   * @param tokenId - The NFT token ID to transfer.
   * @param toAddress - Recipient address.
   *
   * @throws {@link UnsupportedOperationError} if the wallet is view-only.
   *
   * @example
   * ```ts
   * const tx = await conn.transferNft(
   *   '0xNftContract...',
   *   '42',
   *   '0xRecipient...',
   * );
   * const broadcasted = await tx.signAndBroadcast();
   * ```
   */
  public async transferNft(
    contractAddress: string,
    tokenId: string,
    toAddress: string,
    options?: AddressOptions,
  ): Promise<EvmRpcTransaction> {
    const { index = 0, derivationPath } = options ?? {};
    const fromAddress = await this.address(options);
    const getPrivateKey = this.createPrivateKeyGetter(index, derivationPath);
    const data = encodeErc721SafeTransferFrom(fromAddress, toAddress, BigInt(tokenId));

    return EvmRpcTransaction.create({
      explorer: this.explorer,
      fromAddress,
      toAddress: contractAddress,
      valueWei: 0n,
      data,
      getPrivateKey,
    });
  }

  /**
   * Creates an ERC-1155 token transfer transaction using `safeTransferFrom`.
   *
   * @param contractAddress - ERC-1155 contract address (with `0x` prefix).
   * @param tokenId - The token ID to transfer.
   * @param amount - Number of tokens to transfer.
   * @param toAddress - Recipient address.
   *
   * @throws {@link UnsupportedOperationError} if the wallet is view-only.
   *
   * @example
   * ```ts
   * const tx = await conn.transferErc1155(
   *   '0xContract...',
   *   '42',
   *   10n,
   *   '0xRecipient...',
   * );
   * const broadcasted = await tx.signAndBroadcast();
   * ```
   */
  public async transferErc1155(
    contractAddress: string,
    tokenId: string,
    amount: bigint,
    toAddress: string,
    options?: AddressOptions,
  ): Promise<EvmRpcTransaction> {
    const { index = 0, derivationPath } = options ?? {};
    const fromAddress = await this.address(options);
    const getPrivateKey = this.createPrivateKeyGetter(index, derivationPath);
    const data = encodeErc1155SafeTransferFrom(fromAddress, toAddress, BigInt(tokenId), amount);

    return EvmRpcTransaction.create({
      explorer: this.explorer,
      fromAddress,
      toAddress: contractAddress,
      valueWei: 0n,
      data,
      getPrivateKey,
    });
  }

  /**
   * Creates a transaction that calls a smart contract with arbitrary calldata.
   *
   * This is the low-level primitive behind {@link transferToken},
   * {@link transferNft}, and {@link transferErc1155}. Use it for custom
   * contract interactions.
   *
   * @param contractAddress - Smart contract address (with `0x` prefix).
   * @param data - ABI-encoded calldata (hex string with `0x` prefix).
   * @param amount - Amount of native coin to send along with the call. Create via
   *   {@link EvmRpcNetworkDescriptor.amount}.
   *
   * @throws {@link UnsupportedOperationError} if the wallet is view-only.
   *
   * @example
   * ```ts
   * const tx = await conn.callContract(
   *   '0xContractAddress...',
   *   '0xa9059cbb...',
   *   network.amount(0),
   * );
   * const broadcasted = await tx.signAndBroadcast();
   * ```
   */
  public async callContract(
    contractAddress: string,
    data: string,
    amount: Amount,
    options?: AddressOptions,
  ): Promise<EvmRpcTransaction> {
    const { index = 0, derivationPath } = options ?? {};
    const fromAddress = await this.address(options);
    const getPrivateKey = this.createPrivateKeyGetter(index, derivationPath);

    return EvmRpcTransaction.create({
      explorer: this.explorer,
      fromAddress,
      toAddress: contractAddress,
      valueWei: amount.min(),
      data,
      getPrivateKey,
    });
  }

  /**
   * Returns a function that extracts the private key from the wallet.
   * @internal
   */
  private createPrivateKeyGetter(
    index: number,
    derivationPath?: string,
  ): () => Promise<Uint8Array> {
    const wallet = this.wallet;

    if (wallet instanceof HDWallet) {
      const basePath = derivationPath ?? this.defaultDerivationPath;
      const fullPath = `${basePath}/${index}`;
      return async () => {
        const derived = await wallet.derive(fullPath);
        return new Uint8Array(derived.privateKey.raw);
      };
    }

    if (wallet instanceof PrivateKeyWallet) {
      return async () => {
        const pk = await wallet.getPrivateKey();
        return new Uint8Array(pk.raw);
      };
    }

    throw new UnsupportedOperationError(
      `Wallet type '${wallet.walletType}' does not support signing transactions. ` +
        `A signing wallet (HD or private key) is required.`,
    );
  }
}
