import { Connector } from '../Connector';
import type { AddressOptions } from '../Connector';
import type { Wallet } from '../../Wallet/Wallet';
import { HDWallet } from '../../Wallet/SigningWallet/HDWallet/HDWallet';
import { PrivateKeyWallet } from '../../Wallet/SigningWallet/PrivateKeyWallet/PrivateKeyWallet';
import { XpubWallet } from '../../Wallet/ViewOnlyWallet/XpubWallet/XpubWallet';
import { PublicKeyWallet } from '../../Wallet/ViewOnlyWallet/PublicKeyWallet/PublicKeyWallet';
import { hexToBytes } from '../../utils';
import { UnsupportedOperationError } from '../../errors';
import { Amount } from '../../utils/Amount';
import { encodeErc721SafeTransferFrom, encodeErc1155SafeTransferFrom } from '../../utils/abiEncode';
import type { EvmAddressType, AddressTypeConfig } from '../../ChainGate/networks/types';

/** Minimal network descriptor shape required by EVM-style connectors. */
export interface EvmNetworkLike {
  defaultAddressType: EvmAddressType;
  addressTypes: Partial<Record<EvmAddressType, AddressTypeConfig>>;
  publicKeyToAddress(publicKey: Uint8Array): string;
  toString(): string;
}

/** Parameters for {@link BaseEvmConnector.createTransaction}. */
export interface CreateEvmTransactionParams {
  fromAddress: string;
  toAddress: string;
  valueWei: bigint;
  data?: string;
  getPrivateKey: () => Promise<Uint8Array>;
}

/** Shared base for EVM-style connectors. */
export abstract class BaseEvmConnector<
  TExplorer,
  TNetwork extends EvmNetworkLike,
  TTransaction,
> extends Connector<Wallet, TExplorer, TNetwork> {
  protected readonly defaultDerivationPath: string;

  /** @internal */
  constructor(wallet: Wallet, explorer: TExplorer, network: TNetwork) {
    super(wallet, explorer, network);

    const typeConfig = network.addressTypes[network.defaultAddressType];
    if (!typeConfig) {
      throw new UnsupportedOperationError(
        `Network '${network}' does not have address type configuration.`,
      );
    }
    this.defaultDerivationPath = typeConfig.derivationPath;
  }

  /**
   * Returns the EVM address for this wallet.
   *
   * - **HD wallets** derive at `{derivationPath}/{index}` (defaults to `m/44'/60'/0'/0/0`).
   * - **Single-key wallets** return the address for the wallet's public key. Only index `0` is valid.
   * - **XpubWallet** derives at `m/0/{index}`.
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

  /** Creates a native coin transfer transaction. */
  public async transfer(
    amount: Amount,
    toAddress: string,
    options?: AddressOptions,
  ): Promise<TTransaction> {
    const { index = 0, derivationPath } = options ?? {};
    const fromAddress = await this.address(options);
    const valueWei = amount.min();
    const getPrivateKey = this.createPrivateKeyGetter(index, derivationPath);

    return this.createTransaction({
      fromAddress,
      toAddress,
      valueWei,
      getPrivateKey,
    });
  }

  /** Creates an ERC-721 NFT transfer transaction using `safeTransferFrom`. */
  public async transferNft(
    contractAddress: string,
    tokenId: string,
    toAddress: string,
    options?: AddressOptions,
  ): Promise<TTransaction> {
    const { index = 0, derivationPath } = options ?? {};
    const fromAddress = await this.address(options);
    const getPrivateKey = this.createPrivateKeyGetter(index, derivationPath);
    const data = encodeErc721SafeTransferFrom(fromAddress, toAddress, BigInt(tokenId));

    return this.createTransaction({
      fromAddress,
      toAddress: contractAddress,
      valueWei: 0n,
      data,
      getPrivateKey,
    });
  }

  /** Creates an ERC-1155 token transfer transaction using `safeTransferFrom`. */
  public async transferErc1155(
    contractAddress: string,
    tokenId: string,
    amount: bigint,
    toAddress: string,
    options?: AddressOptions,
  ): Promise<TTransaction> {
    const { index = 0, derivationPath } = options ?? {};
    const fromAddress = await this.address(options);
    const getPrivateKey = this.createPrivateKeyGetter(index, derivationPath);
    const data = encodeErc1155SafeTransferFrom(fromAddress, toAddress, BigInt(tokenId), amount);

    return this.createTransaction({
      fromAddress,
      toAddress: contractAddress,
      valueWei: 0n,
      data,
      getPrivateKey,
    });
  }

  /** Creates a transaction that calls a smart contract with arbitrary calldata. */
  public async callContract(
    contractAddress: string,
    data: string,
    amount: Amount,
    options?: AddressOptions,
  ): Promise<TTransaction> {
    const { index = 0, derivationPath } = options ?? {};
    const fromAddress = await this.address(options);
    const getPrivateKey = this.createPrivateKeyGetter(index, derivationPath);

    return this.createTransaction({
      fromAddress,
      toAddress: contractAddress,
      valueWei: amount.min(),
      data,
      getPrivateKey,
    });
  }

  /** Subclass hook: returns the chain-specific transaction implementation. */
  protected abstract createTransaction(params: CreateEvmTransactionParams): Promise<TTransaction>;

  /**
   * Returns a function that extracts the private key from the wallet.
   * @internal
   */
  protected createPrivateKeyGetter(
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
