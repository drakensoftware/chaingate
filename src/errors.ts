/** Thrown when a string is not valid hexadecimal. */
export class InvalidHexError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidHexError';
  }
}

/** Thrown when an input string cannot be recognized as any supported wallet format. */
export class UnrecognizedFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnrecognizedFormatError';
  }
}

/** Thrown when {@link importWallet} receives invalid parameters. */
export class InvalidWalletParamsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidWalletParamsError';
  }
}

/** Thrown when {@link deserializeWallet} receives invalid data. */
export class InvalidWalletExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidWalletExportError';
  }
}

/** Thrown when an operation is not supported for the given context (e.g. wrong wallet type, accessing token-only data on a native coin). */
export class UnsupportedOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedOperationError';
  }
}

/** Thrown when a transaction fails to broadcast. */
export class BroadcastError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BroadcastError';
  }
}

/** Thrown when a transaction has already been sent and cannot be modified. */
export class TransactionAlreadySentError extends Error {
  constructor() {
    super('Transaction has already been sent and cannot be modified.');
    this.name = 'TransactionAlreadySentError';
  }
}

/** Thrown when the wallet does not have enough funds to cover the transfer amount plus fees. */
export class NotEnoughFundsError extends Error {
  constructor() {
    super('Not enough funds to cover the transaction amount and fees.');
    this.name = 'NotEnoughFundsError';
  }
}

/**
 * Thrown when the keyless rate limit is exhausted (HTTP 429).
 *
 * ChainGate works without an API key for light usage. To raise the quota,
 * grab a free API key at {@link https://api.chaingate.dev} and pass it as
 * `new ChainGate({ apiKey })`.
 */
export class RateLimitError extends Error {
  constructor() {
    super(
      'ChainGate rate limit reached on the keyless tier. Get a free API key at ' +
        'https://api.chaingate.dev and pass it as `new ChainGate({ apiKey })` ' +
        'to raise your quota.',
    );
    this.name = 'RateLimitError';
  }
}

/**
 * Thrown when the API returns 429 Too Many Requests while using an API key.
 *
 * Upgrade your plan at {@link https://api.chaingate.dev} for a higher rate limit.
 */
export class RateLimitQuotaError extends Error {
  constructor() {
    super(
      'API key rate limit exceeded. Upgrade your plan at https://api.chaingate.dev for a higher quota.',
    );
    this.name = 'RateLimitQuotaError';
  }
}

/** Thrown when a keystore password is incorrect. */
export class IncorrectKeystorePasswordError extends Error {
  constructor() {
    super('Password provided is not correct');
    this.name = 'IncorrectKeystorePasswordError';
  }
}

/** Thrown when a keystore has an invalid or unrecognized format. */
export class InvalidKeystoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidKeystoreError';
  }
}

/** Thrown when a JSON-RPC call to an EVM node fails. */
export class RpcError extends Error {
  /** JSON-RPC error code, if provided by the node. */
  public readonly code?: number;

  constructor(message: string, code?: number) {
    super(message);
    this.name = 'RpcError';
    this.code = code;
  }
}

/**
 * Reported through `onError()` when a real-time event connection fails or is
 * closed by the server (network errors, an API key that was rejected, or a
 * connection dropped because events were not read fast enough).
 *
 * Rate-limit closures are reported as {@link RateLimitError} /
 * {@link RateLimitQuotaError} instead.
 */
export class EventStreamError extends Error {
  /** WebSocket close code, when the connection was closed. */
  public readonly code?: number;
  /** Close reason sent by the server, when available. */
  public readonly reason?: string;

  constructor(message: string, code?: number, reason?: string) {
    super(message);
    this.name = 'EventStreamError';
    this.code = code;
    this.reason = reason;
  }
}

/**
 * Thrown (synchronously) when subscribing to real-time events with an address
 * that is not valid for the network, and used to reject `subscription.ready`
 * when the server refuses a subscription.
 */
export class EventSubscriptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EventSubscriptionError';
  }
}
