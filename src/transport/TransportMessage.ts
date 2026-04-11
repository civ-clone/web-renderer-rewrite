/**
 * Discriminant union of all supported transport message types.
 */
export type TransportMessageType = 'mandatory-action' | 'choice-list';

/**
 * A structured-clone-safe request dispatched from the engine context to the
 * frontend. Every field must be a plain serialisable value.
 */
export interface TransportRequest {
  /** Unique identifier used to match a response back to this request. */
  correlationId: string;
  /** Discriminant indicating the kind of interaction required. */
  type: TransportMessageType;
  /** Serialisable payload (actions, choices, metadata). */
  payload: Record<string, unknown>;
}

/**
 * A structured-clone-safe response dispatched from the frontend back to the
 * engine. The correlationId MUST match the originating TransportRequest.
 */
export interface TransportResponse {
  /** Must equal the correlationId of the originating TransportRequest. */
  correlationId: string;
  /** The player's selected value — serialisable, transport-opaque. */
  payload: unknown;
}

/**
 * Recoverable error raised when a pending transport request receives no
 * matching response within the configured timeout window.
 */
export class TransportTimeoutError extends Error {
  readonly correlationId: string;

  constructor(correlationId: string) {
    super(`Transport request timed out (correlationId: ${correlationId})`);
    this.name = 'TransportTimeoutError';
    this.correlationId = correlationId;
  }
}
