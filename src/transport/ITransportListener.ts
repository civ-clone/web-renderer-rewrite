import type { TransportResponse } from './TransportMessage.js';

/**
 * Frontend-side receiver contract. Any class that can register a handler for
 * incoming TransportResponses satisfies this interface.
 */
export interface ITransportListener {
  /**
   * Register a handler to be called whenever a TransportResponse arrives.
   * Multiple handlers may be registered; implementations must call all of them.
   */
  onMessage(handler: (response: TransportResponse) => void): void;
}
