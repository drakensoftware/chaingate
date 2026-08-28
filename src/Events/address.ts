/**
 * Address validation and canonicalization for event subscriptions.
 *
 * The server identifies a subscription by the exact address string it
 * receives, so the same address written two ways (checksummed vs lowercase,
 * CashAddr vs legacy) would otherwise become two subscriptions. Every address
 * is validated locally — an invalid one never reaches the server — and
 * reduced to one canonical form per network before it is sent.
 *
 * @internal
 */

import * as btc from '@scure/btc-signer';
import { NETWORKS_INFO } from '../ChainGate/networks';
import type { UtxoNetwork } from '../Explorer/UtxoExplorer';
import { toCashAddress, toLegacyAddress } from '../Connector/UtxoConnector/BchConnector/cashaddr';
import { isValidEvmAddress } from '../utils/crypto';
import { EventSubscriptionError } from '../errors';

/** Validates an EVM address and returns its canonical (lowercase) form. */
export function canonicalEvmAddress(address: string): string {
  if (typeof address !== 'string' || !isValidEvmAddress(address)) {
    throw new EventSubscriptionError(`Invalid EVM address: ${String(address)}`);
  }
  return address.toLowerCase();
}

/**
 * Validates an address for a UTXO network and returns its canonical form:
 * the normalized address encoding for Bitcoin-style networks, the prefixed
 * CashAddr form for Bitcoin Cash.
 */
export function canonicalUtxoAddress(network: UtxoNetwork, address: string): string {
  if (typeof address !== 'string' || address.length === 0) {
    throw new EventSubscriptionError(`Invalid ${network} address: ${String(address)}`);
  }
  if (network === 'bitcoincash') return canonicalBchAddress(address);

  const params = NETWORKS_INFO[network].networkParams;
  try {
    const codec = btc.Address(params);
    return codec.encode(codec.decode(address));
  } catch {
    throw new EventSubscriptionError(`Invalid ${network} address: ${address}`);
  }
}

function canonicalBchAddress(address: string): string {
  // CashAddr, with or without the `bitcoincash:` prefix.
  try {
    return toCashAddress(toLegacyAddress(address));
  } catch {
    // Not CashAddr — try legacy below.
  }
  try {
    return toCashAddress(address);
  } catch {
    throw new EventSubscriptionError(`Invalid bitcoincash address: ${address}`);
  }
}
