import type { ITransport } from '../../src/transport/ITransport';
import type { ITransportListener } from '../../src/transport/ITransportListener';
import type { TransportRequest, TransportResponse } from '../../src/transport/TransportMessage';

// ---------------------------------------------------------------------------
// InProcessTransport — synchronous in-process stub used by most unit and
// integration tests. Responses must be triggered manually by the test.
// ---------------------------------------------------------------------------

export class InProcessTransport implements ITransport, ITransportListener {
  public readonly sentRequests: TransportRequest[] = [];
  private readonly handlers: ((response: TransportResponse) => void)[] = [];

  send(request: TransportRequest): void {
    this.sentRequests.push(request);
  }

  onMessage(handler: (response: TransportResponse) => void): void {
    this.handlers.push(handler);
  }

  /** Deliver a response to all registered handlers. */
  respond(response: TransportResponse): void {
    this.handlers.forEach((h) => h(response));
  }

  /** Respond to the most-recently sent request with the supplied payload. */
  respondToLast(payload: unknown): void {
    const last = this.sentRequests[this.sentRequests.length - 1];
    if (!last) {
      throw new Error('InProcessTransport: no pending requests to respond to');
    }
    this.respond({ correlationId: last.correlationId, payload });
  }

  /** Respond to a specific request by correlationId. */
  respondTo(correlationId: string, payload: unknown): void {
    this.respond({ correlationId, payload });
  }
}

// ---------------------------------------------------------------------------
// MockElectronIpcTransport — simulates Electron IPC channels using in-process
// callbacks. Behaviour is identical to InProcessTransport; the distinction is
// semantic (different concrete class = different adapter under test).
// ---------------------------------------------------------------------------

export class MockElectronIpcTransport implements ITransport, ITransportListener {
  public readonly sentRequests: TransportRequest[] = [];
  private readonly handlers: ((response: TransportResponse) => void)[] = [];

  send(request: TransportRequest): void {
    // Simulate sending over an IPC channel (synchronous in-process)
    this.sentRequests.push(request);
  }

  onMessage(handler: (response: TransportResponse) => void): void {
    this.handlers.push(handler);
  }

  respond(response: TransportResponse): void {
    this.handlers.forEach((h) => h(response));
  }

  respondToLast(payload: unknown): void {
    const last = this.sentRequests[this.sentRequests.length - 1];
    if (!last) {
      throw new Error('MockElectronIpcTransport: no pending requests to respond to');
    }
    this.respond({ correlationId: last.correlationId, payload });
  }

  respondTo(correlationId: string, payload: unknown): void {
    this.respond({ correlationId, payload });
  }
}

// ---------------------------------------------------------------------------
// MockWebSocketTransport — simulates a WebSocket channel with configurable
// artificial latency. Responses are delivered after `latencyMs` milliseconds.
// ---------------------------------------------------------------------------

export class MockWebSocketTransport implements ITransport, ITransportListener {
  public readonly sentRequests: TransportRequest[] = [];
  private readonly handlers: ((response: TransportResponse) => void)[] = [];
  public readonly latencyMs: number;

  constructor(latencyMs = 0) {
    this.latencyMs = latencyMs;
  }

  send(request: TransportRequest): void {
    this.sentRequests.push(request);
  }

  onMessage(handler: (response: TransportResponse) => void): void {
    this.handlers.push(handler);
  }

  respond(response: TransportResponse): void {
    if (this.latencyMs > 0) {
      setTimeout(() => this.handlers.forEach((h) => h(response)), this.latencyMs);
    } else {
      this.handlers.forEach((h) => h(response));
    }
  }

  respondToLast(payload: unknown): void {
    const last = this.sentRequests[this.sentRequests.length - 1];
    if (!last) {
      throw new Error('MockWebSocketTransport: no pending requests to respond to');
    }
    this.respond({ correlationId: last.correlationId, payload });
  }

  respondTo(correlationId: string, payload: unknown): void {
    this.respond({ correlationId, payload });
  }
}

