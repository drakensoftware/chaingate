/**
 * Mapping of raw EVM event frames to SDK types.
 * @internal
 */

import type { Amount } from '../utils/Amount';
import type { RawFrame } from './EventStream';
import type {
  EvmBalanceEvent,
  EvmBlockEvent,
  EvmContractInteractionEvent,
  EvmFullBlockEvent,
  EvmMempoolTransactionEvent,
  EvmPendingBalanceEvent,
  EvmPendingTransactionEvent,
  EvmTransactionEvent,
} from './types';
import { asObject, big, bigOrNull, num, numOrNull, str, strOrNull } from './parse';

/** Builds an {@link Amount} from a value in wei. */
export type WeiAmountFactory = (wei: bigint) => Amount;

export function mapEvmBlock(frame: RawFrame): EvmBlockEvent {
  const data = asObject(frame.data, 'block');
  return {
    height: num(data.height, 'block.height'),
    hash: str(data.hash, 'block.hash'),
    previousHash: str(data.previous_hash, 'block.previous_hash'),
    timestamp: num(data.timestamp, 'block.timestamp'),
    numTxs: num(data.num_txs, 'block.num_txs'),
  };
}

/** The full block is delivered exactly as the chain returns it. */
export function mapEvmFullBlock(frame: RawFrame): EvmFullBlockEvent {
  const data = asObject(frame.data, 'block_full');
  return data as unknown as EvmFullBlockEvent;
}

export function mapEvmBalance(
  frame: RawFrame,
  address: string,
  amount: WeiAmountFactory,
): EvmBalanceEvent {
  return {
    address,
    confirmed: amount(big(frame.confirmedWei, 'balance.confirmedWei')),
    height: num(frame.height, 'balance.height'),
  };
}

export function mapEvmPendingBalance(
  frame: RawFrame,
  address: string,
  amount: WeiAmountFactory,
): EvmPendingBalanceEvent {
  return { address, pending: amount(big(frame.pendingWei, 'pending_balance.pendingWei')) };
}

export function mapEvmTransaction(frame: RawFrame, address: string): EvmTransactionEvent {
  const data = asObject(frame.data, 'history');
  return {
    address,
    height: num(data.height, 'history.height'),
    blockIndex: num(data.block_n, 'history.block_n'),
  };
}

function mapMempoolPayload(value: unknown, amount: WeiAmountFactory): EvmMempoolTransactionEvent {
  const data = asObject(value, 'mempool');
  return {
    hash: str(data.hash, 'mempool.hash'),
    from: str(data.from, 'mempool.from'),
    to: strOrNull(data.to, 'mempool.to'),
    value: amount(big(data.value, 'mempool.value')),
    nonce: num(data.nonce, 'mempool.nonce'),
    input: str(data.input, 'mempool.input'),
    gas: big(data.gas, 'mempool.gas'),
    gasPrice: bigOrNull(data.gas_price, 'mempool.gas_price'),
    maxFeePerGas: bigOrNull(data.max_fee_per_gas, 'mempool.max_fee_per_gas'),
    maxPriorityFeePerGas: bigOrNull(
      data.max_priority_fee_per_gas,
      'mempool.max_priority_fee_per_gas',
    ),
    type: numOrNull(data.type, 'mempool.type'),
    chainId: numOrNull(data.chain_id, 'mempool.chain_id'),
    seenAt: num(data.seen_at, 'mempool.seen_at'),
  };
}

export function mapEvmMempoolTransaction(
  frame: RawFrame,
  amount: WeiAmountFactory,
): EvmMempoolTransactionEvent {
  return mapMempoolPayload(frame.data, amount);
}

export function mapEvmPendingTransaction(
  frame: RawFrame,
  address: string,
  amount: WeiAmountFactory,
): EvmPendingTransactionEvent {
  return { address, ...mapMempoolPayload(frame.data, amount) };
}

export function mapEvmContractInteraction(
  frame: RawFrame,
  address: string,
): EvmContractInteractionEvent {
  const data = asObject(frame.data, 'contract_interaction');
  return {
    address,
    contract: str(data.contract, 'contract_interaction.contract'),
    height: num(data.height, 'contract_interaction.height'),
  };
}
