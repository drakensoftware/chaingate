/**
 * Mapping of raw UTXO event frames to SDK types.
 * @internal
 */

import type { Amount } from '../utils/Amount';
import type { RawFrame } from './EventStream';
import type {
  UtxoBalanceEvent,
  UtxoBlockEvent,
  UtxoBlockInput,
  UtxoBlockOutput,
  UtxoBlockTransaction,
  UtxoFullBlockEvent,
  UtxoMempoolInput,
  UtxoMempoolOutput,
  UtxoMempoolTransactionEvent,
  UtxoPendingBalanceEvent,
  UtxoPendingTransactionEvent,
  UtxoTransactionEvent,
} from './types';
import { asObject, asArray, num, str, big } from './parse';

/** Builds an {@link Amount} from a value in the smallest unit (satoshis). */
export type SatAmountFactory = (sat: bigint) => Amount;

export function mapUtxoBlock(frame: RawFrame): UtxoBlockEvent {
  const data = asObject(frame.data, 'block');
  return {
    height: num(data.height, 'block.height'),
    hash: str(data.hash, 'block.hash'),
    previousHash: str(data.previous_hash, 'block.previous_hash'),
    numTxs: num(data.num_txs, 'block.num_txs'),
  };
}

function mapBlockOutput(value: unknown, amount: SatAmountFactory): UtxoBlockOutput {
  const output = asObject(value, 'output');
  return {
    txid: str(output.txid, 'output.txid'),
    n: num(output.n, 'output.n'),
    amount: amount(big(output.amount, 'output.amount')),
  };
}

function mapBlockInput(value: unknown, amount: SatAmountFactory): UtxoBlockInput {
  const input = asObject(value, 'input');
  return {
    txid: str(input.txid, 'input.txid'),
    n: num(input.n, 'input.n'),
    prevTxid: str(input.prev_txid, 'input.prev_txid'),
    prevN: num(input.prev_n, 'input.prev_n'),
    prevOut: input.prev_out == null ? null : mapBlockOutput(input.prev_out, amount),
  };
}

function mapBlockTransaction(value: unknown, amount: SatAmountFactory): UtxoBlockTransaction {
  const tx = asObject(value, 'transaction');
  return {
    blockIndex: num(tx.block_n, 'transaction.block_n'),
    txid: str(tx.txid, 'transaction.txid'),
    inputs: asArray(tx.vin, 'transaction.vin').map((v) => mapBlockInput(v, amount)),
    outputs: asArray(tx.vout, 'transaction.vout').map((v) => mapBlockOutput(v, amount)),
  };
}

export function mapUtxoFullBlock(frame: RawFrame, amount: SatAmountFactory): UtxoFullBlockEvent {
  const data = asObject(frame.data, 'block_full');
  return {
    height: num(data.height, 'block_full.height'),
    hash: str(data.hash, 'block_full.hash'),
    previousHash: str(data.previous_hash, 'block_full.previous_hash'),
    numTxs: num(data.num_txs, 'block_full.num_txs'),
    transactions: asArray(data.tx, 'block_full.tx').map((tx) => mapBlockTransaction(tx, amount)),
  };
}

export function mapUtxoBalance(
  frame: RawFrame,
  address: string,
  amount: SatAmountFactory,
): UtxoBalanceEvent {
  return { address, confirmed: amount(big(frame.confirmedSat, 'balance.confirmedSat')) };
}

export function mapUtxoPendingBalance(
  frame: RawFrame,
  address: string,
  amount: SatAmountFactory,
): UtxoPendingBalanceEvent {
  return { address, pending: amount(big(frame.pendingSat, 'pending_balance.pendingSat')) };
}

export function mapUtxoTransaction(
  frame: RawFrame,
  address: string,
  amount: SatAmountFactory,
): UtxoTransactionEvent {
  const data = asObject(frame.data, 'history');
  return {
    address,
    txid: str(data.txid, 'history.txid'),
    height: num(data.height, 'history.height'),
    blockIndex: num(data.block_n, 'history.block_n'),
    received: data.add === true,
    amount: amount(big(data.amount, 'history.amount')),
    addressBalance: amount(big(data.addressBalance, 'history.addressBalance')),
  };
}

function mapMempoolInput(value: unknown, amount: SatAmountFactory): UtxoMempoolInput {
  const input = asObject(value, 'input');
  const mapped: UtxoMempoolInput = {
    prevTxid: str(input.prev_txid, 'input.prev_txid'),
    prevN: num(input.prev_n, 'input.prev_n'),
  };
  if (input.prev_amount != null)
    mapped.prevAmount = amount(big(input.prev_amount, 'input.prev_amount'));
  return mapped;
}

function mapMempoolOutput(value: unknown, amount: SatAmountFactory): UtxoMempoolOutput {
  const output = asObject(value, 'output');
  return { n: num(output.n, 'output.n'), amount: amount(big(output.amount, 'output.amount')) };
}

function mapMempoolPayload(value: unknown, amount: SatAmountFactory): UtxoMempoolTransactionEvent {
  const data = asObject(value, 'mempool');
  return {
    txid: str(data.txid, 'mempool.txid'),
    seenAt: num(data.seen_at, 'mempool.seen_at'),
    vsize: num(data.vsize, 'mempool.vsize'),
    fee: data.fee == null ? null : amount(big(data.fee, 'mempool.fee')),
    feeRate: data.feerate == null ? null : num(data.feerate, 'mempool.feerate'),
    inputs: asArray(data.vin, 'mempool.vin').map((v) => mapMempoolInput(v, amount)),
    outputs: asArray(data.vout, 'mempool.vout').map((v) => mapMempoolOutput(v, amount)),
  };
}

export function mapUtxoMempoolTransaction(
  frame: RawFrame,
  amount: SatAmountFactory,
): UtxoMempoolTransactionEvent {
  return mapMempoolPayload(frame.data, amount);
}

export function mapUtxoPendingTransaction(
  frame: RawFrame,
  address: string,
  amount: SatAmountFactory,
): UtxoPendingTransactionEvent {
  return { address, ...mapMempoolPayload(frame.data, amount) };
}
