import { Wallet } from './Wallet/Wallet';
import { SigningWallet } from './Wallet/SigningWallet/SigningWallet';
import { HDWallet } from './Wallet/SigningWallet/HDWallet/HDWallet';
import { ViewOnlyWallet } from './Wallet/ViewOnlyWallet/ViewOnlyWallet';
import type { Secret } from './Wallet/Secret';

type Feature = 'hdwallet' | 'signingwallet' | 'viewonly';

/**
 * Checks if a wallet supports a feature and narrows the type accordingly.
 *
 * @param wallet - The wallet to check.
 * @param feature - `'hdwallet'`, `'signingwallet'`, or `'viewonly'`.
 *
 * @example
 * ```ts
 * if (supports(wallet, 'hdwallet')) {
 *   const key = await wallet.derive("m/44'/60'/0'/0/0");
 * }
 * ```
 */
export function supports(wallet: Wallet, feature: 'hdwallet'): wallet is HDWallet<Secret>;
export function supports(wallet: Wallet, feature: 'signingwallet'): wallet is SigningWallet<Secret>;
export function supports(wallet: Wallet, feature: 'viewonly'): wallet is ViewOnlyWallet;
export function supports(wallet: Wallet, feature: Feature): boolean {
  switch (feature) {
    case 'hdwallet':
      return wallet instanceof HDWallet;
    case 'signingwallet':
      return wallet instanceof SigningWallet;
    case 'viewonly':
      return wallet instanceof ViewOnlyWallet;
  }
}
