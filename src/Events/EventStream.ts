/**
 * Client for the ChainGate real-time event streams.
 *
 * One `EventStream` manages the single WebSocket connection of a network:
 * it opens the socket on the first subscription, multiplexes every
 * subscription over it (one server-side subscription per distinct channel /
 * flags / address, no matter how many listeners), reconnects silently with
 * exponential backoff, paces outbound frames so the server's per-frame rate
 * limits are never hit, and closes the socket once the last listener leaves.
 *
 * It only deals with raw frames — mapping them into SDK types is done by the
 * explorers.
 *
 * @internal
 */

import {
  EventStreamError,
  EventSubscriptionError,
  RateLimitError,
  RateLimitQuotaError,
  UnsupportedOperationError,
} from '../errors';

export type EventFamily = 'utxo' | 'evm';

export type EventChannel = 'blocks' | 'balance' | 'history' | 'mempool' | 'contract_interactions';

const CHANNELS: ReadonlySet<string> = new Set<EventChannel>([
  'blocks',
  'balance',
  'history',
  'mempool',
  'contract_interactions',
]);

/** A subscription request as sent to the server. `address` must be canonical. */
export interface SubscribeRequest {
  channel: EventChannel;
  pending?: boolean;
  full?: boolean;
  address?: string;
}

/** A frame received from the server, parsed but not interpreted. */
export type RawFrame = Record<string, unknown>;

export interface StreamListener {
  /** Called for every event matching the subscription. */
  onEvent(frame: RawFrame): void;
  /**
   * Called after the subscription has been re-established following a
   * reconnection (not for the initial acknowledgement).
   */
  onResubscribed?(): void;
}

export interface StreamSubscription {
  unsubscribe(): void;
  readonly ready: Promise<void>;
}

export interface PacingOptions {
  /** Frames that can be sent immediately. */
  capacity: number;
  /** Milliseconds to earn one more frame. */
  refillMs: number;
}

export interface WatchdogOptions {
  /** Silence (no frame received) after which an application ping is sent. */
  silenceMs: number;
  /** Time to wait for the pong before the connection is considered dead. */
  pongTimeoutMs: number;
}

export interface EventStreamOptions {
  url: string;
  family: EventFamily;
  hasApiKey: boolean;
  /** Reconnection delay for the given attempt (1-based). Defaults to {@link defaultBackoff}. */
  backoff?: (attempt: number) => number;
  /** Outbound frame pacing. Defaults to {@link DEFAULT_PACING}; `false` disables it. */
  pacing?: PacingOptions | false;
  /** Liveness watchdog. Defaults depend on `hasApiKey`; `false` disables it. */
  watchdog?: WatchdogOptions | false;
  /** Time to wait for a subscribe/unsubscribe acknowledgement before reconnecting. `false` disables it. */
  ackTimeoutMs?: number | false;
}

/** Five frames right away, then one every four seconds — fits every server tier. */
export const DEFAULT_PACING: PacingOptions = { capacity: 5, refillMs: 4_000 };
export const DEFAULT_ACK_TIMEOUT_MS = 30_000;
export const WATCHDOG_KEYED: WatchdogOptions = { silenceMs: 5 * 60_000, pongTimeoutMs: 30_000 };
export const WATCHDOG_KEYLESS: WatchdogOptions = { silenceMs: 60 * 60_000, pongTimeoutMs: 30_000 };

const MAX_BACKOFF_MS = 30_000;
const RATE_LIMIT_PENALTY_MS = 60_000;
const DAILY_QUOTA_PENALTY_MS = 15 * 60_000;

/** Upstream errors are relayed by the gateway with this generic message. */
const UPSTREAM_ERROR_MESSAGE = 'invalid subscription request';

/** Exponential backoff capped at 30 s, with equal jitter. */
export function defaultBackoff(attempt: number): number {
  const base = Math.min(MAX_BACKOFF_MS, 1_000 * 2 ** Math.max(0, attempt - 1));
  return base / 2 + Math.random() * (base / 2);
}

/** Identity of a server-side subscription. */
export function subscriptionKey(request: SubscribeRequest): string {
  const variant = request.pending ? 'pending' : request.full ? 'full' : '';
  return `${request.channel}|${variant}|${request.address ?? ''}`;
}

type StreamState = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'failed';
type Timer = ReturnType<typeof setTimeout>;

interface Waiter {
  resolve(): void;
  reject(error: Error): void;
}

interface KeyEntry {
  request: SubscribeRequest;
  listeners: Set<StreamListener>;
  /** Last acknowledged server state on the current connection. */
  server: 'subscribed' | 'unsubscribed';
  /** Operation sent (or queued) and not yet acknowledged. */
  inflight: 'subscribe' | 'unsubscribe' | null;
  waiters: Waiter[];
  /** Whether the server acknowledged this key at least once. */
  wasSubscribed: boolean;
}

type OpAction = 'subscribe' | 'unsubscribe';

interface OutboundOp {
  action: OpAction | 'ping';
  key?: string;
  request?: SubscribeRequest;
}

interface InflightOp {
  action: OpAction;
  key: string;
  request: SubscribeRequest;
  sentAt: number;
}

interface CloseVerdict {
  error: Error;
  terminal: boolean;
  minDelayMs: number;
}

function isObject(value: unknown): value is RawFrame {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

function requestToFrame(request: SubscribeRequest): RawFrame {
  const frame: RawFrame = { channel: request.channel };
  if (request.address !== undefined) frame.address = request.address;
  if (request.pending) frame.pending = true;
  if (request.full) frame.full = true;
  return frame;
}

/** Rebuilds the request a subscribe/unsubscribe acknowledgement refers to. */
function requestFromAck(frame: RawFrame): SubscribeRequest | null {
  const channel = frame.channel;
  if (typeof channel !== 'string' || !CHANNELS.has(channel)) return null;
  const request: SubscribeRequest = { channel: channel as EventChannel };
  if (frame.pending === true) request.pending = true;
  if (frame.full === true) request.full = true;
  if (typeof frame.address === 'string') request.address = frame.address;
  return request;
}

/** Maps an event frame to the key of the subscription it belongs to. */
function eventKey(frame: RawFrame, family: EventFamily): string | null {
  const canonical = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined;
    return family === 'evm' ? value.toLowerCase() : value;
  };
  const data = isObject(frame.data) ? frame.data : undefined;
  const withAddress = (
    channel: EventChannel,
    address: string | undefined,
    pending?: boolean,
  ): string | null =>
    address === undefined ? null : subscriptionKey({ channel, pending, address });

  switch (frame.type) {
    case 'block':
      return subscriptionKey({ channel: 'blocks' });
    case 'block_full':
      return subscriptionKey({ channel: 'blocks', full: true });
    case 'balance':
      return withAddress('balance', canonical(frame.address));
    case 'pending_balance':
      return withAddress('balance', canonical(frame.address), true);
    case 'history':
      return withAddress('history', canonical(data?.address));
    case 'pending':
      return withAddress('history', canonical(frame.address), true);
    case 'mempool':
      return subscriptionKey({ channel: 'mempool' });
    case 'contract_interaction':
      return withAddress('contract_interactions', canonical(data?.address));
    default:
      return null;
  }
}

/** Whether an error message could refer to the given request. */
function errorMatchesRequest(message: string, request: SubscribeRequest): boolean {
  if (message === UPSTREAM_ERROR_MESSAGE) return true;
  if (/^(invalid address|missing 'address')/.test(message)) return request.address !== undefined;
  const unknownChannel = /^unknown channel '([^']*)'/.exec(message);
  if (unknownChannel) return request.channel === unknownChannel[1];
  return true;
}

function classifyClose(
  code: number,
  reason: string,
  socketError: string | null,
  hasApiKey: boolean,
): CloseVerdict {
  if (code === 1008) {
    if (/unauthorized/i.test(reason)) {
      return {
        error: new EventStreamError('The API key was rejected by the server.', code, reason),
        terminal: true,
        minDelayMs: 0,
      };
    }
    if (/daily websocket message limit/i.test(reason)) {
      return {
        error: new RateLimitQuotaError(),
        terminal: false,
        minDelayMs: DAILY_QUOTA_PENALTY_MS,
      };
    }
    if (/rate limit exceeded|usage limit/i.test(reason)) {
      return {
        error: hasApiKey ? new RateLimitQuotaError() : new RateLimitError(),
        terminal: false,
        minDelayMs: RATE_LIMIT_PENALTY_MS,
      };
    }
  }
  const detail = reason || socketError;
  const message = detail ? `Event stream closed: ${detail}` : `Event stream closed (code ${code})`;
  return { error: new EventStreamError(message, code, reason), terminal: false, minDelayMs: 0 };
}

export class EventStream {
  readonly url: string;
  readonly family: EventFamily;

  private readonly hasApiKey: boolean;
  private readonly backoff: (attempt: number) => number;
  private readonly pacing: PacingOptions | null;
  private readonly watchdog: WatchdogOptions | null;
  private readonly ackTimeoutMs: number | null;

  private socket: WebSocket | null = null;
  /** Bumped every time a socket is abandoned; stale socket events are ignored. */
  private generation = 0;
  private _state: StreamState = 'idle';
  private attempt = 0;
  private lastSocketError: string | null = null;

  private readonly keys = new Map<string, KeyEntry>();
  private readonly errorListeners = new Set<(error: Error) => void>();

  private outbound: OutboundOp[] = [];
  private inflight: InflightOp[] = [];
  private tokens: number;
  private lastRefill: number;

  private reconnectTimer: Timer | null = null;
  private sendTimer: Timer | null = null;
  private ackTimer: Timer | null = null;
  private watchdogTimer: Timer | null = null;
  private pongTimer: Timer | null = null;

  constructor(options: EventStreamOptions) {
    this.url = options.url;
    this.family = options.family;
    this.hasApiKey = options.hasApiKey;
    this.backoff = options.backoff ?? defaultBackoff;
    this.pacing = options.pacing === false ? null : (options.pacing ?? DEFAULT_PACING);
    this.watchdog =
      options.watchdog === false
        ? null
        : (options.watchdog ?? (options.hasApiKey ? WATCHDOG_KEYED : WATCHDOG_KEYLESS));
    this.ackTimeoutMs =
      options.ackTimeoutMs === false ? null : (options.ackTimeoutMs ?? DEFAULT_ACK_TIMEOUT_MS);
    this.tokens = this.pacing ? this.pacing.capacity : Number.POSITIVE_INFINITY;
    this.lastRefill = Date.now();
  }

  /** Connection state, for diagnostics and tests. */
  get state(): StreamState {
    return this._state;
  }

  /** Number of listeners across every subscription. */
  get listenerCount(): number {
    let total = 0;
    for (const entry of this.keys.values()) total += entry.listeners.size;
    return total;
  }

  /**
   * Registers a listener for a server-side subscription, opening the
   * connection if needed. Throws synchronously when no `WebSocket`
   * implementation is available in the runtime.
   */
  subscribe(request: SubscribeRequest, listener: StreamListener): StreamSubscription {
    if (typeof WebSocket === 'undefined') {
      throw new UnsupportedOperationError(
        'Real-time events need a WebSocket implementation (Node.js >= 22 or a browser).',
      );
    }

    const key = subscriptionKey(request);
    let entry = this.keys.get(key);
    if (!entry) {
      entry = {
        request: { ...request },
        listeners: new Set(),
        server: 'unsubscribed',
        inflight: null,
        waiters: [],
        wasSubscribed: false,
      };
      this.keys.set(key, entry);
    }
    entry.listeners.add(listener);

    // An unsubscribe that was queued but never sent is no longer wanted.
    if (entry.inflight === 'unsubscribe' && this.dropQueued(key, 'unsubscribe')) {
      entry.inflight = null;
    }

    let resolveReady!: () => void;
    let rejectReady!: (error: Error) => void;
    const ready = new Promise<void>((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });
    // Nobody is forced to await `ready`; a refused subscription must not
    // surface as an unhandled rejection.
    ready.catch(() => {});
    const waiter: Waiter = { resolve: resolveReady, reject: rejectReady };

    if (this._state === 'failed') this._state = 'idle';
    this.ensureConnected();
    this.reconcile(key);

    if (entry.server === 'subscribed' && entry.inflight === null) {
      waiter.resolve();
    } else {
      entry.waiters.push(waiter);
    }

    let removed = false;
    const unsubscribe = (): void => {
      if (removed) return;
      removed = true;
      const current = this.keys.get(key);
      const target = current === entry ? entry : null;
      if (target) {
        target.listeners.delete(listener);
        const index = target.waiters.indexOf(waiter);
        if (index !== -1) target.waiters.splice(index, 1);
      }
      waiter.resolve();
      if (target) this.afterListenerRemoved(key);
    };

    return { unsubscribe, ready };
  }

  /** Registers a listener for connection-level errors. Returns a remover. */
  onError(listener: (error: Error) => void): () => void {
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  // ---------------------------------------------------------------------------
  // Desired-state reconciliation
  // ---------------------------------------------------------------------------

  private reconcile(key: string): void {
    const entry = this.keys.get(key);
    if (!entry) return;
    if (this._state !== 'open' || entry.inflight !== null) return;

    const wanted = entry.listeners.size > 0;
    if (wanted && entry.server === 'unsubscribed') {
      entry.inflight = 'subscribe';
      this.enqueue({ action: 'subscribe', key, request: entry.request });
    } else if (!wanted && entry.server === 'subscribed') {
      entry.inflight = 'unsubscribe';
      this.enqueue({ action: 'unsubscribe', key, request: entry.request });
    } else if (!wanted) {
      this.keys.delete(key);
    }
  }

  private afterListenerRemoved(key: string): void {
    if (this.listenerCount === 0) {
      this.shutdown();
      return;
    }
    const entry = this.keys.get(key);
    // A subscribe that was queued but never sent is no longer wanted.
    if (entry && entry.listeners.size === 0 && entry.inflight === 'subscribe') {
      if (this.dropQueued(key, 'subscribe')) entry.inflight = null;
    }
    this.reconcile(key);
  }

  private ensureConnected(): void {
    if (this._state === 'idle') this.connect();
  }

  // ---------------------------------------------------------------------------
  // Connection lifecycle
  // ---------------------------------------------------------------------------

  private connect(): void {
    const generation = ++this.generation;
    this._state = 'connecting';
    this.lastSocketError = null;

    let socket: WebSocket;
    try {
      socket = new WebSocket(this.url);
    } catch (error) {
      this.socket = null;
      this.handleClose(1006, toError(error).message);
      return;
    }
    this.socket = socket;

    socket.onopen = () => {
      if (generation !== this.generation) return;
      this._state = 'open';
      this.armWatchdog();
      for (const key of [...this.keys.keys()]) this.reconcile(key);
      this.flushOutbound();
    };
    socket.onmessage = (event: MessageEvent) => {
      if (generation !== this.generation) return;
      if (typeof event.data === 'string') this.handleMessage(event.data);
    };
    socket.onerror = (event: Event) => {
      if (generation !== this.generation) return;
      const message = (event as { message?: unknown }).message;
      this.lastSocketError = typeof message === 'string' && message ? message : null;
      // While the handshake is pending an error is always fatal, yet not every
      // runtime follows it with a `close` event (Node 22's undici never does
      // for a rejected upgrade). Fail the attempt from here; the generation
      // bump turns a late `close`, when one does arrive, into a no-op.
      if (this._state === 'connecting') this.forceReconnect('');
    };
    socket.onclose = (event: CloseEvent) => {
      if (generation !== this.generation) return;
      this.socket = null;
      this.handleClose(event.code, event.reason);
    };
  }

  private handleClose(code: number, reason: string): void {
    this.clearConnectionTimers();
    this.outbound = [];
    this.inflight = [];
    for (const [key, entry] of this.keys) {
      entry.inflight = null;
      entry.server = 'unsubscribed';
      if (entry.listeners.size === 0) this.keys.delete(key);
    }

    if (this.listenerCount === 0) {
      this._state = 'idle';
      return;
    }

    const verdict = classifyClose(code, reason, this.lastSocketError, this.hasApiKey);
    this.lastSocketError = null;
    this.emitError(verdict.error);

    if (verdict.terminal) {
      this._state = 'failed';
      for (const entry of this.keys.values()) {
        const waiters = entry.waiters;
        entry.waiters = [];
        for (const waiter of waiters) waiter.reject(verdict.error);
      }
      return;
    }

    this.attempt += 1;
    const delay = Math.max(this.backoff(this.attempt), verdict.minDelayMs);
    this._state = 'reconnecting';
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  /** Abandons the current socket and goes through the reconnection path. */
  private forceReconnect(reason: string): void {
    const socket = this.socket;
    this.generation += 1;
    this.socket = null;
    if (socket) {
      try {
        socket.close(1000, reason);
      } catch {
        // Ignore — the socket is abandoned either way.
      }
    }
    this.handleClose(1006, reason);
  }

  /** Closes everything once no listener is left. The stream can be reused. */
  private shutdown(): void {
    this.generation += 1;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.clearConnectionTimers();
    this.outbound = [];
    this.inflight = [];
    this.keys.clear();
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      try {
        socket.close(1000, 'No active subscriptions');
      } catch {
        // Ignore — the socket is abandoned either way.
      }
    }
    this._state = 'idle';
    this.attempt = 0;
  }

  private clearConnectionTimers(): void {
    if (this.sendTimer) {
      clearTimeout(this.sendTimer);
      this.sendTimer = null;
    }
    if (this.ackTimer) {
      clearTimeout(this.ackTimer);
      this.ackTimer = null;
    }
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Outbound frames (paced)
  // ---------------------------------------------------------------------------

  private enqueue(op: OutboundOp): void {
    this.outbound.push(op);
    this.flushOutbound();
  }

  /** Removes a queued (not yet sent) operation. Returns whether one was removed. */
  private dropQueued(key: string, action: OpAction): boolean {
    const index = this.outbound.findIndex((op) => op.key === key && op.action === action);
    if (index === -1) return false;
    this.outbound.splice(index, 1);
    return true;
  }

  private refillTokens(): void {
    if (!this.pacing) return;
    const now = Date.now();
    if (this.tokens >= this.pacing.capacity) {
      this.lastRefill = now;
      return;
    }
    const refills = Math.floor((now - this.lastRefill) / this.pacing.refillMs);
    if (refills > 0) {
      this.tokens = Math.min(this.pacing.capacity, this.tokens + refills);
      this.lastRefill += refills * this.pacing.refillMs;
    }
  }

  private flushOutbound(): void {
    const socket = this.socket;
    if (this._state !== 'open' || !socket) return;

    this.refillTokens();
    while (this.outbound.length > 0 && this.tokens >= 1) {
      const op = this.outbound.shift()!;
      this.tokens -= 1;
      const frame: RawFrame =
        op.action === 'ping'
          ? { action: 'ping' }
          : { action: op.action, ...requestToFrame(op.request!) };
      try {
        socket.send(JSON.stringify(frame));
      } catch (error) {
        this.emitError(toError(error));
        continue;
      }
      if (op.action !== 'ping') {
        this.inflight.push({
          action: op.action,
          key: op.key!,
          request: op.request!,
          sentAt: Date.now(),
        });
        this.rearmAckTimer();
      }
    }

    if (this.outbound.length > 0 && this.pacing && !this.sendTimer) {
      const wait = Math.max(1, this.lastRefill + this.pacing.refillMs - Date.now());
      this.sendTimer = setTimeout(() => {
        this.sendTimer = null;
        this.flushOutbound();
      }, wait);
    }
  }

  private rearmAckTimer(): void {
    if (this.ackTimer) {
      clearTimeout(this.ackTimer);
      this.ackTimer = null;
    }
    const timeout = this.ackTimeoutMs;
    if (timeout === null || this.inflight.length === 0) return;
    const wait = Math.max(1, this.inflight[0].sentAt + timeout - Date.now());
    this.ackTimer = setTimeout(() => {
      this.ackTimer = null;
      const oldest = this.inflight[0];
      if (oldest && Date.now() - oldest.sentAt >= timeout) {
        this.forceReconnect('No acknowledgement from the server');
      } else {
        this.rearmAckTimer();
      }
    }, wait);
  }

  // ---------------------------------------------------------------------------
  // Watchdog
  // ---------------------------------------------------------------------------

  private armWatchdog(): void {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    const watchdog = this.watchdog;
    if (!watchdog || this._state !== 'open') return;
    this.watchdogTimer = setTimeout(() => {
      this.watchdogTimer = null;
      this.sendPing(watchdog);
    }, watchdog.silenceMs);
  }

  private sendPing(watchdog: WatchdogOptions): void {
    if (this._state !== 'open' || this.pongTimer) return;
    this.enqueue({ action: 'ping' });
    this.pongTimer = setTimeout(() => {
      this.pongTimer = null;
      this.forceReconnect('No response from the server');
    }, watchdog.pongTimeoutMs);
  }

  /** Any inbound frame proves the connection is alive. */
  private noteActivity(): void {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
    this.armWatchdog();
  }

  // ---------------------------------------------------------------------------
  // Inbound frames
  // ---------------------------------------------------------------------------

  private handleMessage(data: string): void {
    this.noteActivity();

    let frame: unknown;
    try {
      frame = JSON.parse(data);
    } catch {
      return;
    }
    if (!isObject(frame) || typeof frame.type !== 'string') return;

    switch (frame.type) {
      case 'subscribed':
      case 'unsubscribed':
        this.handleAck(frame);
        return;
      case 'error':
        this.handleErrorFrame(frame);
        return;
      case 'pong':
        return;
      default:
        this.dispatch(frame);
    }
  }

  private handleAck(frame: RawFrame): void {
    const request = requestFromAck(frame);
    if (!request) return;
    const key = subscriptionKey(request);
    const action: OpAction = frame.type === 'subscribed' ? 'subscribe' : 'unsubscribe';

    const index = this.inflight.findIndex((op) => op.key === key && op.action === action);
    if (index !== -1) this.inflight.splice(index, 1);
    this.rearmAckTimer();

    const entry = this.keys.get(key);
    if (!entry || entry.inflight !== action) return;
    entry.inflight = null;

    if (action === 'subscribe') {
      entry.server = 'subscribed';
      this.attempt = 0;
      const waiters = entry.waiters;
      entry.waiters = [];
      for (const waiter of waiters) waiter.resolve();
      if (entry.wasSubscribed) {
        for (const listener of [...entry.listeners]) {
          this.safely(() => listener.onResubscribed?.());
        }
      }
      entry.wasSubscribed = true;
    } else {
      entry.server = 'unsubscribed';
    }
    this.reconcile(key);
  }

  private handleErrorFrame(frame: RawFrame): void {
    const message =
      typeof frame.message === 'string' && frame.message ? frame.message : UPSTREAM_ERROR_MESSAGE;

    let target: InflightOp | undefined;
    if (this.inflight.length === 1) {
      target = this.inflight[0];
    } else if (this.inflight.length > 1) {
      const candidates = this.inflight.filter((op) => errorMatchesRequest(message, op.request));
      if (candidates.length > 0) {
        // Upstream errors arrive in request order; gateway validation errors
        // are answered right away, so they refer to the latest request.
        target =
          message === UPSTREAM_ERROR_MESSAGE ? candidates[0] : candidates[candidates.length - 1];
      }
    }

    if (!target) {
      this.emitError(new EventStreamError(message));
      return;
    }

    this.inflight.splice(this.inflight.indexOf(target), 1);
    this.rearmAckTimer();

    const error = new EventSubscriptionError(message);
    const entry = this.keys.get(target.key);
    if (entry) {
      entry.inflight = null;
      if (target.action === 'subscribe') {
        const waiters = entry.waiters;
        entry.waiters = [];
        for (const waiter of waiters) waiter.reject(error);
        // Do not keep re-sending a request the server refuses.
        this.keys.delete(target.key);
      } else {
        entry.server = 'unsubscribed';
        this.reconcile(target.key);
      }
    }
    this.emitError(error);

    if (this.listenerCount === 0) this.shutdown();
  }

  private dispatch(frame: RawFrame): void {
    const key = eventKey(frame, this.family);
    if (!key) return;
    const entry = this.keys.get(key);
    if (!entry) return;
    for (const listener of [...entry.listeners]) {
      this.safely(() => listener.onEvent(frame));
    }
  }

  private safely(fn: () => void): void {
    try {
      fn();
    } catch (error) {
      this.emitError(toError(error));
    }
  }

  private emitError(error: Error): void {
    for (const listener of [...this.errorListeners]) {
      try {
        listener(error);
      } catch {
        // Errors thrown by error listeners are swallowed to avoid recursion.
      }
    }
  }
}
