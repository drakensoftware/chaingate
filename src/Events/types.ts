import type { Amount } from '../utils/Amount';

/**
 * Handle returned by every real-time event method (`onBlock`, `onBalance`, …).
 *
 * @example
 * ```ts
 * const sub = cg.explore(cg.networks.bitcoin).onBlock((block) => {
 *   console.log('New block', block.height);
 * });
 *
 * await sub.ready;   // optional: the server has confirmed the subscription
 * sub.unsubscribe(); // stop receiving events
 * ```
 */
export interface Subscription {
  /**
   * Stops receiving events. Safe to call more than once. When the last
   * subscription of a network is removed, the underlying connection is closed.
   */
  unsubscribe(): void;
  /**
   * Resolves once the server has confirmed the subscription (or as soon as the
   * subscription is cancelled). Rejects with {@link EventSubscriptionError} if
   * the server refuses it, or with {@link EventStreamError} if the connection
   * itself is rejected (for example an invalid API key).
   */
  readonly ready: Promise<void>;
  /**
   * The subscribed address, exactly as it was passed (or derived from the
   * wallet). `undefined` for whole-chain subscriptions such as `onBlock`. On
   * connector subscriptions it is set once the wallet address has been derived,
   * always before `ready` resolves.
   */
  readonly address?: string;
}

// ---------------------------------------------------------------------------
// UTXO events (Bitcoin, Litecoin, Dogecoin, Bitcoin Cash, Bitcoin Testnet)
// ---------------------------------------------------------------------------

/** A new block summary on a UTXO network. */
export interface UtxoBlockEvent {
  /** Block height. */
  height: number;
  /** Block hash. */
  hash: string;
  /** Hash of the previous block. */
  previousHash: string;
  /** Number of transactions in the block. */
  numTxs: number;
}

/** A transaction output inside a full block. */
export interface UtxoBlockOutput {
  /** Transaction that created the output. */
  txid: string;
  /** Output index within that transaction. */
  n: number;
  /** Output value. */
  amount: Amount;
}

/** A transaction input inside a full block, with the spent output resolved. */
export interface UtxoBlockInput {
  /** Transaction this input belongs to. */
  txid: string;
  /** Index of this input. */
  n: number;
  /** Transaction of the output being spent. All zeros for a coinbase input. */
  prevTxid: string;
  /** Output index being spent. */
  prevN: number;
  /** The output being spent, or `null` for a coinbase input. */
  prevOut: UtxoBlockOutput | null;
}

/** A transaction inside a full block. */
export interface UtxoBlockTransaction {
  /** Position of the transaction within the block (`0` = coinbase). */
  blockIndex: number;
  /** Transaction id. */
  txid: string;
  inputs: UtxoBlockInput[];
  outputs: UtxoBlockOutput[];
}

/** An entire new block on a UTXO network: every transaction, input and output. */
export interface UtxoFullBlockEvent extends UtxoBlockEvent {
  transactions: UtxoBlockTransaction[];
}

/** The confirmed balance of an address after a block that changed it. */
export interface UtxoBalanceEvent {
  /** The subscribed address. */
  address: string;
  /** New confirmed balance. */
  confirmed: Amount;
}

/** The pending (mempool) balance delta of an address. */
export interface UtxoPendingBalanceEvent {
  /** The subscribed address. */
  address: string;
  /**
   * Signed sum of the value moved by every pending transaction touching the
   * address — negative when the address is net-spending, zero when nothing is
   * pending.
   */
  pending: Amount;
}

/** A confirmed transaction that changed the balance of an address. */
export interface UtxoTransactionEvent {
  /** The subscribed address. */
  address: string;
  /** Transaction id. */
  txid: string;
  /** Block height where the transaction was confirmed. */
  height: number;
  /** Position of the transaction within the block. */
  blockIndex: number;
  /** `true` when the address received funds, `false` when it spent them. */
  received: boolean;
  /** Amount received or spent. */
  amount: Amount;
  /** Balance of the address right after this transaction. */
  addressBalance: Amount;
}

/** An input of a pending transaction. */
export interface UtxoMempoolInput {
  /** Transaction of the output being spent. */
  prevTxid: string;
  /** Output index being spent. */
  prevN: number;
  /** Value of the spent output, when it could be resolved. */
  prevAmount?: Amount;
}

/** An output of a pending transaction. */
export interface UtxoMempoolOutput {
  /** Output index within the transaction. */
  n: number;
  /** Output value. */
  amount: Amount;
}

/** A pending (unconfirmed) transaction seen in the mempool. */
export interface UtxoMempoolTransactionEvent {
  /** Transaction id. */
  txid: string;
  /** Unix seconds when the transaction was first seen. */
  seenAt: number;
  /** Virtual size, in vbytes. */
  vsize: number;
  /** Fee paid, or `null` when an input could not be resolved. */
  fee: Amount | null;
  /** Fee rate in satoshis per vbyte, or `null` when the fee is unknown. */
  feeRate: number | null;
  inputs: UtxoMempoolInput[];
  outputs: UtxoMempoolOutput[];
}

/** A pending transaction that touches a subscribed address. */
export interface UtxoPendingTransactionEvent extends UtxoMempoolTransactionEvent {
  /** The subscribed address. */
  address: string;
}

// ---------------------------------------------------------------------------
// EVM events (Ethereum, Avalanche)
// ---------------------------------------------------------------------------

/** A new block summary on an EVM network. */
export interface EvmBlockEvent {
  /** Block height (number). */
  height: number;
  /** Block hash. */
  hash: string;
  /** Hash of the parent block. */
  previousHash: string;
  /** Block timestamp, in unix seconds. */
  timestamp: number;
  /** Number of transactions in the block. */
  numTxs: number;
}

/**
 * A transaction inside a full EVM block, exactly as the chain returns it
 * (JSON-RPC encoding: quantities are `0x`-prefixed hex strings).
 */
export interface EvmFullBlockTransaction {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  input: string;
  blockNumber: string;
  transactionIndex: string;
  [key: string]: unknown;
}

/**
 * An entire new EVM block, exactly as the chain returns it — the standard
 * JSON-RPC `Block` object with full transaction objects. Unlike the other
 * events, quantities here are `0x`-prefixed hex strings.
 */
export interface EvmFullBlockEvent {
  number: string;
  hash: string;
  parentHash: string;
  timestamp: string;
  gasLimit: string;
  gasUsed: string;
  miner: string;
  transactions: EvmFullBlockTransaction[];
  [key: string]: unknown;
}

/** The confirmed balance of an address at a block in which it was active. */
export interface EvmBalanceEvent {
  /** The subscribed address. */
  address: string;
  /** New confirmed balance. */
  confirmed: Amount;
  /** Block height the balance corresponds to. */
  height: number;
}

/** The pending (mempool) native-balance delta of an address. */
export interface EvmPendingBalanceEvent {
  /** The subscribed address. */
  address: string;
  /**
   * Signed sum of the native value moved by every pending transaction touching
   * the address — negative when net-spending, zero when nothing is pending.
   * Gas is not included and token transfers are not visible until mined.
   */
  pending: Amount;
}

/**
 * A confirmed transaction the address appears in (as sender, recipient, or in
 * an emitted event). Use `getAddressHistory()` to load the transaction details.
 */
export interface EvmTransactionEvent {
  /** The subscribed address. */
  address: string;
  /** Block height where the transaction was confirmed. */
  height: number;
  /** Position of the transaction within the block. */
  blockIndex: number;
}

/** A pending (unconfirmed) transaction seen in the mempool. */
export interface EvmMempoolTransactionEvent {
  /** Transaction hash. */
  hash: string;
  /** Sender address. */
  from: string;
  /** Recipient address, or `null` for a contract creation. */
  to: string | null;
  /** Native value moved. */
  value: Amount;
  /** Sender nonce. */
  nonce: number;
  /** Calldata — `"0x"` for a plain native transfer. */
  input: string;
  /** Gas limit. */
  gas: bigint;
  /** Legacy gas price in wei, when present. */
  gasPrice: bigint | null;
  /** EIP-1559 max fee per gas in wei, when present. */
  maxFeePerGas: bigint | null;
  /** EIP-1559 priority fee per gas in wei, when present. */
  maxPriorityFeePerGas: bigint | null;
  /** Transaction type (`0` legacy, `1` EIP-2930, `2` EIP-1559), when reported. */
  type: number | null;
  /** Chain id, when reported. */
  chainId: number | null;
  /** Unix seconds when the transaction was first seen. */
  seenAt: number;
}

/** A pending transaction that touches a subscribed address. */
export interface EvmPendingTransactionEvent extends EvmMempoolTransactionEvent {
  /** The subscribed address. */
  address: string;
}

/** A subscribed address interacted with a contract for the first time. */
export interface EvmContractInteractionEvent {
  /** The subscribed address. */
  address: string;
  /** The contract the address interacted with. */
  contract: string;
  /** Block height where the interaction happened. */
  height: number;
}
