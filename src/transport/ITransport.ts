import type { TransportRequest } from './TransportMessage.js';

/**
 * Engine-side sender contract. Any class that can dispatch a TransportRequest
 * to the frontend satisfies this interface.
 */
export interface ITransport {
  /**
   * Dispatch a structured-clone-safe request to the frontend.
   * Implementations must not block; the caller awaits a matching
   * TransportResponse via ITransportListener.
   */
  send(request: TransportRequest): void;
}
