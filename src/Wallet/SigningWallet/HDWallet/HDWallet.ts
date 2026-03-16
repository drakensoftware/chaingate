import { HDKey } from '@scure/bip32';
import { Secret } from '../../Secret';
import { SigningWallet, SerializeOptions } from '../SigningWallet';
import type { WalletSerialized } from '../../WalletSerialized';
import { DerivedKey } from '../../DerivedKey';
import { DerivedPublicKey } from '../../DerivedPublicKey';
import { bytesToHex, hexToBytes } from '../../../utils';
import { commonDerivationPaths } from '../../../constants';
import { HDKeyNullError } from '../../errors';

/** A cached derivation result for a specific path. */
export interface DerivationIndexEntry {
  derivationPath: string;
  xpub: string;
  /** Compressed public key as hex. */
  publicKey: string;
}

/** @internal */
export type HDKeySource = { seed: Uint8Array } | { xpriv: string };

/** Optional restore data when deserializing an HD wallet. */
export interface HDWalletRestoreData {
  derivationIndex?: DerivationIndexEntry[];
  masterPublicKey?: string;
}

function requirePublicKey(key: HDKey): Uint8Array {
  if (!key.publicKey) throw new HDKeyNullError('publicKey');
  return key.publicKey;
}

function requirePrivateKey(key: HDKey): Uint8Array {
  if (!key.privateKey) throw new HDKeyNullError('privateKey');
  return key.privateKey;
}

/**
 * Base class for HD wallets. Derive unlimited child keys from a single secret.
 *
 * Common derivation paths are pre-computed and cached automatically.
 *
 * @typeParam T - The secret type (e.g. {@link Phrase}, {@link Seed}, {@link Xpriv}).
 *
 * @example
 * ```ts
 * const key = await wallet.derive("m/44'/60'/0'/0/0");
 * const pubKey = await wallet.derivePublicKey("m/44'/0'/0'/0/0");
 * ```
 */
export abstract class HDWallet<T extends Secret> extends SigningWallet<T> {
  private _publicKey: string;
  private readonly _derivationIndex: Map<string, DerivationIndexEntry>;

  /** @internal */
  constructor(secret: T, restoreData?: HDWalletRestoreData) {
    super(secret);

    this._derivationIndex = new Map(
      (restoreData?.derivationIndex ?? []).map((e) => [e.derivationPath, e]),
    );

    if (!secret.encrypted) {
      const master = this.createMasterKey();

      this._publicKey = bytesToHex(requirePublicKey(master));

      for (const path of commonDerivationPaths) {
        if (!this._derivationIndex.has(path)) {
          const derived = master.derive(path);
          this._derivationIndex.set(path, {
            derivationPath: path,
            xpub: derived.publicExtendedKey,
            publicKey: bytesToHex(requirePublicKey(derived)),
          });
        }
      }
    } else {
      this._publicKey = restoreData?.masterPublicKey ?? '';
    }
  }

  private createMasterKey(): HDKey {
    const source = this.getKeySource();
    return 'seed' in source
      ? HDKey.fromMasterSeed(source.seed)
      : HDKey.fromExtendedKey(source.xpriv);
  }

  /** @internal */
  protected abstract getKeySource(): HDKeySource;

  /** The master public key as a hex string. */
  get publicKey(): string {
    return this._publicKey;
  }

  /** All derivation paths that have been used, with their cached public keys. */
  get derivationIndex(): DerivationIndexEntry[] {
    return [...this._derivationIndex.values()];
  }

  /**
   * Derives only the public key at a given path. Returns cached results when available.
   *
   * @param derivationPath - e.g. `"m/44'/60'/0'/0/0"`.
   */
  public async derivePublicKey(derivationPath: string): Promise<DerivedPublicKey> {
    const cached = this._derivationIndex.get(derivationPath);
    if (cached) {
      return new DerivedPublicKey({
        publicKey: hexToBytes(cached.publicKey),
        xpub: cached.xpub,
      });
    }

    return this.secret.withDecrypted(() => {
      const master = this.createMasterKey();
      const derived = derivationPath ? master.derive(derivationPath) : master;

      if (derivationPath) {
        this._derivationIndex.set(derivationPath, {
          derivationPath,
          xpub: derived.publicExtendedKey,
          publicKey: bytesToHex(requirePublicKey(derived)),
        });
      }

      if (!this._publicKey) {
        this._publicKey = bytesToHex(requirePublicKey(master));
      }

      return new DerivedPublicKey({
        publicKey: requirePublicKey(derived),
        xpub: derived.publicExtendedKey,
      });
    });
  }

  /**
   * Derives a full key pair (public + private) at a given path.
   *
   * @param derivationPath - e.g. `"m/44'/60'/0'/0/0"`.
   */
  public async derive(derivationPath: string): Promise<DerivedKey> {
    return this.secret.withDecrypted(() => {
      const master = this.createMasterKey();
      const derived = derivationPath ? master.derive(derivationPath) : master;

      if (derivationPath && !this._derivationIndex.has(derivationPath)) {
        this._derivationIndex.set(derivationPath, {
          derivationPath,
          xpub: derived.publicExtendedKey,
          publicKey: bytesToHex(requirePublicKey(derived)),
        });
      }

      if (!this._publicKey) {
        this._publicKey = bytesToHex(requirePublicKey(master));
      }

      return new DerivedKey({
        privateKey: requirePrivateKey(derived),
        publicKey: requirePublicKey(derived),
        xpriv: derived.privateExtendedKey,
        xpub: derived.publicExtendedKey,
      });
    });
  }

  /** @inheritdoc */
  public async serialize(options?: SerializeOptions): Promise<WalletSerialized> {
    const base = await super.serialize(options);
    return {
      ...base,
      derivationIndex: this.derivationIndex,
      masterPublicKey: this._publicKey || undefined,
    } as WalletSerialized;
  }
}
