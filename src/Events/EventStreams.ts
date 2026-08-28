import { EventStream } from './EventStream';
import type { EventFamily, EventStreamOptions } from './EventStream';

/** Per-stream settings shared by every stream of a {@link ChainGate} instance. */
export type EventStreamsOptions = Pick<
  EventStreamOptions,
  'backoff' | 'pacing' | 'watchdog' | 'ackTimeoutMs'
>;

/**
 * Registry of real-time event connections, one per network, kept in
 * {@link ChainGateGlobal}. A stream is created the first time a network is
 * asked for and reused afterwards — the socket itself is opened and closed by
 * the stream as subscriptions come and go.
 *
 * @internal
 */
export class EventStreams {
  private readonly streams = new Map<string, EventStream>();
  private readonly options: EventStreamsOptions;

  constructor(options: EventStreamsOptions = {}) {
    this.options = options;
  }

  /** Returns the stream of a network, creating it on first use. */
  get(
    family: EventFamily,
    network: string,
    baseUrl: string,
    apiKey: string | undefined,
  ): EventStream {
    const id = `${family}/${network}`;
    let stream = this.streams.get(id);
    if (!stream) {
      stream = new EventStream({
        ...this.options,
        url: buildEventsUrl(baseUrl, family, network, apiKey),
        family,
        hasApiKey: Boolean(apiKey),
      });
      this.streams.set(id, stream);
    }
    return stream;
  }
}

/** Builds the WebSocket URL of a network's event stream from the API base URL. */
export function buildEventsUrl(
  baseUrl: string,
  family: EventFamily,
  network: string,
  apiKey: string | undefined,
): string {
  const wsBase = baseUrl.replace(/^http/i, 'ws').replace(/\/+$/, '');
  const query = apiKey ? `?api_key=${encodeURIComponent(apiKey)}` : '';
  return `${wsBase}/${family}/${network}/events${query}`;
}
