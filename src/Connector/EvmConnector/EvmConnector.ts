import { Connector } from '../Connector';
import type { AddressOptions } from '../Connector';
import { EvmExplorer } from '../../Explorer/EvmExplorer';
import type { Wallet } from '../../Wallet/Wallet';
import { HDWallet } from '../../Wallet/SigningWallet/HDWallet/HDWallet';
import { PrivateKeyWallet } from '../../Wallet/SigningWallet/PrivateKeyWallet/PrivateKeyWallet';
import { XpubWallet } from '../../Wallet/ViewOnlyWallet/XpubWallet/XpubWallet';
import { PublicKeyWallet } from '../../Wallet/ViewOnlyWallet/PublicKeyWallet/PublicKeyWallet';
import { hexToBytes } from '../../utils';
import { UnsupportedOperationError } from '../../errors';
import type { EvmAddressHistoryResponse, EvmAddressTxCountResponse } from '../../Client';
import { Amount } from '../../utils/Amount';
import type { EvmNetworkDescriptor } from '../../ChainGate/networks';
import { EvmTransaction } from './EvmTransaction';
import {
  encodeErc20Transfer,
  encodeErc721SafeTransferFrom,
  encodeErc1155SafeTransferFrom,
} from '../../utils/abiEncode';

/**
 * Connector for Ethereum (and EVM-compatible) networks.
 *
 * Bridges a {@link Wallet} with an {@link EvmExplorer} to provide
 * address derivation and address-scoped queries.
 *
 * For network-level operations (blocks, gas, broadcasting, contract calls,
 * tokens, NFTs, logos) use the {@link EvmExplorer} directly via
 * `cg.explore(cg.networks.ethereum)`.
 *
 * @example
 * ```ts
 * const cg = new ChainGate({ apiKey: 'your-key' });
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
export class EvmConnector extends Connector<Wallet, EvmExplorer, EvmNetworkDescriptor> {
  private readonly defaultDerivationPath: string;

  /** @internal */
  constructor(wallet: Wallet, explorer: EvmExplorer, network: EvmNetworkDescriptor) {
    super(wallet, explorer, network);

    const typeConfig = network.addressTypes[network.defaultAddressType];
    if (!typeConfig) {
      throw new UnsupportedOperationError(
        `Network '${network.id}' does not have address type configuration.`,
      );
    }
    this.defaultDerivationPath = typeConfig.derivationPath;
  }

  /**
   * Returns the Ethereum address for this wallet.
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
   * Returns the confirmed and unconfirmed balance for this wallet's address.
   */
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

  /**
   * Returns the nonce (transaction count) for this wallet's address.
   */
  public async addressTransactionCount(
    options?: AddressOptions,
  ): Promise<EvmAddressTxCountResponse> {
    const addr = await this.address(options);
    return this.explorer.getAddressTransactionCount(addr);
  }

  /**
   * Creates an ETH transfer transaction with recommended (normal) fees.
   *
   * The returned {@link EvmTransaction} can be inspected, have its fee adjusted,
   * and then signed + broadcast.
   *
   * @param amount - Amount to send. Create via
   *   {@link NetworkDescriptor.amount | cg.networks.ethereum.amount(0.1)} for
   *   base-unit amounts, or
   *   {@link NetworkDescriptor.amountFromCurrency | cg.networks.ethereum.amountFromCurrency('usd', 50)}
   *   for fiat amounts.
   * @param toAddress - Recipient address (checksummed or lowercase with `0x`).
   *
   * @throws {@link UnsupportedOperationError} if the wallet is view-only.
   *
   * @example
   * ```ts
   * // Send 0.1 ETH
   * const amount = cg.networks.ethereum.amount('0.1');
   * const tx = await eth.transfer(amount, '0x...');
   *
   * // Send $50 worth of ETH at the current market rate
   * const amount = await cg.networks.ethereum.amountFromCurrency('usd', 50);
   * const tx = await eth.transfer(amount, '0x...');
   *
   * // Optionally adjust the fee
   * tx.fee('high');
   *
   * // Sign and broadcast
   * const broadcasted = await tx.signAndBroadcast();
   * const cancel = broadcasted.onConfirmed((details) => {
   *   console.log('Confirmed in block', details.blockHeight);
   * });
   *
   * // Stop waiting at any time:
   * cancel();
   * ```
   */
  public async transfer(
    amount: Amount,
    toAddress: string,
    options?: AddressOptions,
  ): Promise<EvmTransaction> {
    const { index = 0, derivationPath } = options ?? {};
    const fromAddress = await this.address(options);
    const valueWei = amount.min();
    const getPrivateKey = this.createPrivateKeyGetter(index, derivationPath);

    return EvmTransaction.create({
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
   * The returned {@link EvmTransaction} can be inspected, have its fee adjusted,
   * and then signed + broadcast — just like a native ETH transfer.
   *
   * @param contractAddress - Token contract address (with `0x` prefix).
   * @param amount - Amount of tokens in the token's smallest unit. Create via
   *   the `Amount` returned by {@link EvmConnector.addressTokenBalances} or
   *   construct manually.
   * @param toAddress - Recipient address.
   *
   * @throws {@link UnsupportedOperationError} if the wallet is view-only.
   *
   * @example
   * ```ts
   * const tx = await eth.transferToken(
   *   '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
   *   usdcAmount,
   *   '0xRecipient...',
   * );
   * tx.fee('high');
   * const broadcasted = await tx.signAndBroadcast();
   * ```
   */
  public async transferToken(
    contractAddress: string,
    amount: Amount,
    toAddress: string,
    options?: AddressOptions,
  ): Promise<EvmTransaction> {
    const { index = 0, derivationPath } = options ?? {};
    const fromAddress = await this.address(options);
    const getPrivateKey = this.createPrivateKeyGetter(index, derivationPath);
    const data = encodeErc20Transfer(toAddress, amount.min());

    return EvmTransaction.create({
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
   * const tx = await eth.transferNft(
   *   '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', // BAYC
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
  ): Promise<EvmTransaction> {
    const { index = 0, derivationPath } = options ?? {};
    const fromAddress = await this.address(options);
    const getPrivateKey = this.createPrivateKeyGetter(index, derivationPath);
    const data = encodeErc721SafeTransferFrom(fromAddress, toAddress, BigInt(tokenId));

    return EvmTransaction.create({
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
   * const tx = await eth.transferErc1155(
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
  ): Promise<EvmTransaction> {
    const { index = 0, derivationPath } = options ?? {};
    const fromAddress = await this.address(options);
    const getPrivateKey = this.createPrivateKeyGetter(index, derivationPath);
    const data = encodeErc1155SafeTransferFrom(fromAddress, toAddress, BigInt(tokenId), amount);

    return EvmTransaction.create({
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
   * @param amount - Amount of ETH to send along with the call (use `0n` for
   *   pure function calls). Create via {@link NetworkDescriptor.amount}.
   *
   * @throws {@link UnsupportedOperationError} if the wallet is view-only.
   *
   * @example
   * ```ts
   * // Call a custom contract function
   * const tx = await eth.callContract(
   *   '0xContractAddress...',
   *   '0xa9059cbb000000000000000000000000...', // encoded calldata
   *   cg.networks.ethereum.amount(0),           // no ETH value
   * );
   * const broadcasted = await tx.signAndBroadcast();
   * ```
   */
  public async callContract(
    contractAddress: string,
    data: string,
    amount: Amount,
    options?: AddressOptions,
  ): Promise<EvmTransaction> {
    const { index = 0, derivationPath } = options ?? {};
    const fromAddress = await this.address(options);
    const getPrivateKey = this.createPrivateKeyGetter(index, derivationPath);

    return EvmTransaction.create({
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
