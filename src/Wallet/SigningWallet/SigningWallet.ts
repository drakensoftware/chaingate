import { Secret } from '../Secret';
import { Wallet } from '../Wallet';
import type { WalletSerialized, SecretWalletType } from '../WalletSerialized';

/**
 * Options for {@link SigningWallet.serialize}.
 */
export interface SerializeOptions {
  /**
   * Set to `true` to suppress the console warning about serializing unencrypted private keys.
   * @default false
   */
  acknowledge?: boolean;
}

const SERIALIZE_WARNING =
  'WARNING: You are serializing unencrypted private key material. ' +
  'Anyone with access to this data can steal your funds. ' +
  'Pass { acknowledge: true } to suppress this warning.';

/**
 * Base class for wallets that hold private key material. Supports encryption.
 *
 * @typeParam T - The secret type this wallet holds.
 */
export abstract class SigningWallet<T extends Secret> extends Wallet {
  public abstract override readonly walletType: SecretWalletType;
  /** @internal */
  protected readonly secret: T;

  /** @internal */
  constructor(secret: T) {
    super();
    this.secret = secret;
  }

  /** Whether the wallet's secret material is currently encrypted. */
  get encrypted(): boolean {
    return this.secret.encrypted;
  }

  /**
   * Encrypts the wallet with a password. After encryption, operations that
   * need the secret will prompt for the password automatically.
   *
   * @param password - The encryption password.
   * @param askForPassword - Callback for future password prompts.
   * @throws {@link AlreadyEncryptedError} if already encrypted.
   */
  async encrypt(password: string, askForPassword: () => Promise<string | null>): Promise<void> {
    await this.secret.encrypt(password, askForPassword);
  }

  /** @internal */
  protected abstract doSerialize(): WalletSerialized;

  /**
   * Serializes the wallet for storage. Warns if serializing unencrypted
   * unless `options.acknowledge` is `true`.
   *
   * @param options - Serialization options.
   */
  public async serialize(options?: SerializeOptions): Promise<WalletSerialized> {
    if (this.secret.encrypted) {
      const { ciphertext, iv, salt } = this.secret.getEncryptedExport();
      return { type: this.walletType, ciphertext, iv, salt } as WalletSerialized;
    }
    if (!options?.acknowledge) {
      console.warn(SERIALIZE_WARNING);
    }
    return this.secret.withDecrypted(() => this.doSerialize());
  }
}
