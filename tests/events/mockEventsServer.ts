/**
 * A local WebSocket server that speaks the ChainGate event-stream protocol,
 * used to exercise the SDK's event client without touching the network.
 *
 * Every frame the client sends is recorded; subscribe / unsubscribe frames are
 * acknowledged automatically (unless `autoAck` is off) exactly like the
 * gateway does — flags echoed only when set, EVM addresses lowercased — and
 * `{ action: 'ping' }` gets a `pong`. Tests push events, error frames and
 * closes explicitly.
 */
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { WebSocketServer, WebSocket } from 'ws';

export type Json = Record<string, unknown>;

export interface ReceivedFrame {
  /** 1-based index of the connection the frame arrived on. */
  connection: number;
  frame: Json;
}

export async function waitFor(predicate: () => boolean, timeoutMs = 3_000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor: timed out');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockEventsServer {
  /** Every frame received, in order. */
  readonly frames: ReceivedFrame[] = [];
  /** Request URL of every upgrade attempt, in order. */
  readonly paths: string[] = [];
  /** Number of connections accepted so far. */
  connections = 0;
  /** Acknowledge subscribe / unsubscribe frames automatically. */
  autoAck = true;
  /** Answer application pings automatically. */
  autoPong = true;
  /** Reject upgrades with HTTP 404 (like an unknown network). */
  rejectUpgrades = false;

  private port = 0;
  private readonly sockets = new Map<number, WebSocket>();
  private readonly pathByConnection = new Map<number, string>();

  private constructor(
    private readonly server: http.Server,
    private readonly wss: WebSocketServer,
  ) {}

  static async start(): Promise<MockEventsServer> {
    const server = http.createServer((_req, res) => {
      res.writeHead(404);
      res.end();
    });
    const wss = new WebSocketServer({ noServer: true });
    const mock = new MockEventsServer(server, wss);

    server.on('upgrade', (req, socket, head) => {
      const path = req.url ?? '';
      mock.paths.push(path);
      if (mock.rejectUpgrades) {
        socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
        socket.destroy();
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) => {
        const id = ++mock.connections;
        mock.sockets.set(id, ws);
        mock.pathByConnection.set(id, path);
        ws.on('message', (raw) => mock.onMessage(id, ws, raw.toString()));
        ws.on('close', () => mock.sockets.delete(id));
      });
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    mock.port = (server.address() as AddressInfo).port;
    return mock;
  }

  /** HTTP base URL to hand to explorers (converted to ws:// by the SDK). */
  get baseUrl(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  /** Number of connections currently open. */
  get openSockets(): number {
    return [...this.sockets.values()].filter((s) => s.readyState === WebSocket.OPEN).length;
  }

  /** Frames received, optionally filtered by action. */
  received(action?: string): Json[] {
    return this.frames.map((f) => f.frame).filter((f) => !action || f.action === action);
  }

  /** Builds the acknowledgement the gateway would send for a frame. */
  ackFor(frame: Json, connection: number): Json {
    const type = frame.action === 'subscribe' ? 'subscribed' : 'unsubscribed';
    const ack: Json = { type, channel: frame.channel };
    if (frame.full === true) ack.full = true;
    if (frame.pending === true) ack.pending = true;
    if (typeof frame.address === 'string') {
      const isEvm = (this.pathByConnection.get(connection) ?? '').startsWith('/evm/');
      ack.address = isEvm ? frame.address.toLowerCase() : frame.address;
    }
    return ack;
  }

  /** Sends a frame to every open connection. */
  send(frame: Json): void {
    this.sendRaw(JSON.stringify(frame));
  }

  /** Sends raw text to every open connection. */
  sendRaw(text: string): void {
    for (const socket of this.sockets.values()) {
      if (socket.readyState === WebSocket.OPEN) socket.send(text);
    }
  }

  /** Closes every open connection with the given code and reason. */
  closeAll(code = 1011, reason = ''): void {
    for (const socket of this.sockets.values()) {
      if (socket.readyState === WebSocket.OPEN) socket.close(code, reason);
    }
  }

  /** Waits until at least `count` frames have been received. */
  async waitForFrames(count: number, timeoutMs?: number): Promise<void> {
    await waitFor(() => this.frames.length >= count, timeoutMs);
  }

  async stop(): Promise<void> {
    for (const socket of this.sockets.values()) socket.terminate();
    await new Promise<void>((resolve) => this.wss.close(() => resolve()));
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }

  private onMessage(connection: number, ws: WebSocket, raw: string): void {
    let frame: Json;
    try {
      frame = JSON.parse(raw) as Json;
    } catch {
      return;
    }
    this.frames.push({ connection, frame });

    if (frame.action === 'ping') {
      if (this.autoPong) ws.send(JSON.stringify({ type: 'pong' }));
      return;
    }
    if (this.autoAck && (frame.action === 'subscribe' || frame.action === 'unsubscribe')) {
      ws.send(JSON.stringify(this.ackFor(frame, connection)));
    }
  }
}
