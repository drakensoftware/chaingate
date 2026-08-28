/** Shared builders for the real-time event tests. */
import { createClient, createConfig } from '../../src/Client/client';
import type { ClientOptions } from '../../src/Client';
import type { ChainGateGlobal } from '../../src/ChainGate/ChainGate';
import { TTLCache } from '../../src/utils/TTLCache';
import { UtxoLocalCache } from '../../src/utils/UtxoLocalCache';
import { EvmNonceCache } from '../../src/utils/EvmNonceCache';
import { EventStreams } from '../../src/Events/EventStreams';
import type { EventStreamsOptions } from '../../src/Events/EventStreams';
import { UtxoExplorer } from '../../src/Explorer/UtxoExplorer';
import type { UtxoNetwork } from '../../src/Explorer/UtxoExplorer';
import { EvmExplorer } from '../../src/Explorer/EvmExplorer';
import type { EvmNetwork } from '../../src/Explorer/EvmExplorer';

export const BTC_ADDR = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
export const BTC_ADDR_2 = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
export const BCH_CASHADDR = 'bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a';
export const BCH_LEGACY = '1BpEi6DfDAUFd7GtittLSdBeYJvcoaVggu';
export const EVM_ADDR = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

/** Fast, deterministic stream settings for tests. */
export const FAST_STREAMS: EventStreamsOptions = {
  backoff: () => 30,
  pacing: false,
  watchdog: false,
  ackTimeoutMs: false,
};

export function makeGlobal(options: EventStreamsOptions = {}): ChainGateGlobal {
  return {
    marketsCache: new TTLCache(async () => {
      throw new Error('Market data is not available in tests');
    }, 60_000),
    utxoCache: new UtxoLocalCache(),
    evmNonceCache: new EvmNonceCache(),
    eventStreams: new EventStreams({ ...FAST_STREAMS, ...options }),
  };
}

export function makeUtxoExplorer(
  baseUrl: string,
  global: ChainGateGlobal,
  network: UtxoNetwork = 'bitcoin',
  apiKey?: string,
): UtxoExplorer {
  const client = createClient(createConfig<ClientOptions>({ baseUrl, throwOnError: true }));
  return new UtxoExplorer(client, network, baseUrl, apiKey, global);
}

export function makeEvmExplorer(
  baseUrl: string,
  global: ChainGateGlobal,
  network: EvmNetwork = 'ethereum',
  apiKey?: string,
): EvmExplorer {
  const client = createClient(createConfig<ClientOptions>({ baseUrl, throwOnError: true }));
  return new EvmExplorer(client, network, baseUrl, apiKey, global);
}
