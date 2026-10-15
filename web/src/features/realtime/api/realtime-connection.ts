import type {
  ConnectionError,
  ConnectionState,
  RealtimeSocketClient,
  SocketAuthErrorCode,
} from '../types';
import { createRealtimeSocket } from './socket-client';

const AUTH_ERROR_CODES: readonly string[] = [
  'AUTH_TOKEN_MISSING',
  'AUTH_TOKEN_EXPIRED',
  'AUTH_TOKEN_INVALID',
];

// Shorter than the server's heartbeat timeout, so a socket it may have dropped is never trusted.
const RESUME_RECONNECT_MS = 15_000;

type ConnectError = Error & { data?: { code?: unknown } };

function toConnectionError(error: ConnectError): ConnectionError {
  const code = error.data?.code;
  return typeof code === 'string' && AUTH_ERROR_CODES.includes(code)
    ? { kind: 'auth', code: code as SocketAuthErrorCode }
    : { kind: 'network', message: error.message };
}

/**
 * One signed-in session's socket, kept outside React: it connects with the latest token the shell
 * hands over and tells subscribers what state it is in.
 *
 * A dropped network is socket.io's to retry. A refused token is the session's: an expired one is
 * renewed once and the socket reconnects with what comes back; a renewed token refused as well,
 * an invalid one, or a renewal that fails leaves the socket waiting for the shell's next token.
 */
export class RealtimeConnection {
  private token: string;
  private readonly renew: (() => Promise<string>) | undefined;
  private readonly socket: RealtimeSocketClient;
  private state: ConnectionState = { status: 'connecting', socket: null, error: null };
  private readonly listeners = new Set<() => void>();
  private renewedToken: string | null = null;
  private hiddenAt: number | null = null;

  constructor(
    token: string,
    renew?: () => Promise<string>,
    createSocket: (getToken: () => string) => RealtimeSocketClient = createRealtimeSocket,
  ) {
    this.token = token;
    this.renew = renew;
    this.socket = createSocket(() => this.token);
  }

  readonly getState = (): ConnectionState => this.state;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  open(): () => void {
    this.socket.on('connect', this.connected);
    this.socket.on('connect_error', this.refused);
    this.socket.on('disconnect', this.dropped);
    document.addEventListener('visibilitychange', this.visibilityChanged);
    this.socket.connect();

    return () => {
      this.socket.off('connect', this.connected);
      this.socket.off('connect_error', this.refused);
      this.socket.off('disconnect', this.dropped);
      document.removeEventListener('visibilitychange', this.visibilityChanged);
      this.socket.disconnect();
    };
  }

  /** The shell's current token; a socket left waiting by a refused token tries again with it. */
  setToken(token: string): void {
    if (token === this.token) return;
    this.token = token;
    if (!this.socket.connected && !this.socket.active) this.socket.connect();
  }

  private readonly connected = () => {
    this.update({ status: 'connected', socket: this.socket, error: null });
  };

  private readonly refused = (error: ConnectError) => {
    const connectionError = toConnectionError(error);
    if (connectionError.kind === 'network') {
      this.update({ status: 'error', socket: this.socket, error: connectionError });
      return;
    }

    const waiting: ConnectionState = {
      status: 'error',
      socket: this.socket,
      error: connectionError,
    };
    const renewable =
      connectionError.code === 'AUTH_TOKEN_EXPIRED' && this.token !== this.renewedToken;
    if (!renewable || !this.renew) {
      this.update(waiting);
      return;
    }

    this.update({ ...waiting, status: 'reconnecting' });
    void this.renew().then(
      (renewed) => {
        this.renewedToken = renewed;
        if (renewed === this.token) this.update(waiting);
        else this.setToken(renewed);
      },
      () => this.update(waiting),
    );
  };

  private readonly dropped = (reason: string) => {
    // Our own cleanup calls disconnect() too, don't flag that as an outage.
    if (reason === 'io client disconnect') return;
    this.update({ ...this.state, status: 'reconnecting' });
  };

  // A page put away (a locked phone, a sleeping laptop) may come back to a socket the server
  // has already dropped while the client still reads it as connected, and the events missed
  // meanwhile never arrive. Coming back after a while, it reconnects, so everyone resyncs.
  private readonly visibilityChanged = () => {
    if (document.visibilityState === 'hidden') {
      this.hiddenAt = Date.now();
      return;
    }

    const awayLong = this.hiddenAt !== null && Date.now() - this.hiddenAt >= RESUME_RECONNECT_MS;
    this.hiddenAt = null;
    if (!awayLong || !this.socket.connected) return;

    this.update({ ...this.state, status: 'reconnecting' });
    this.socket.disconnect().connect();
  };

  private update(state: ConnectionState): void {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }
}
