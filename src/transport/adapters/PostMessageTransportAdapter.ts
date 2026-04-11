import type { ITransport } from '../ITransport.js';
import type { ITransportListener } from '../ITransportListener.js';
import type {
  TransportRequest,
  TransportResponse,
} from '../TransportMessage.js';

/**
 * Production Web Worker / SharedWorker transport adapter.
 *
 * - `send()`: posts a structured-clone-safe message via `globalThis.postMessage`
 *   (available inside a Worker context).
 * - `onMessage()`: registers a `'message'` event listener on `globalThis`
 *   (the Worker's self) that forwards incoming MessageEvents to the handler.
 *
 * Because this adapter relies on Web Worker globals it is only intended for
 * use in an actual Worker context. Tests must either provide a mock or run
 * inside a Worker environment.
 */
export class PostMessageTransportAdapter
  implements ITransport, ITransportListener
{
  send(request: TransportRequest): void {
    // In a Worker context globalThis.postMessage sends to the main thread.
    (
      globalThis as unknown as { postMessage: (data: unknown) => void }
    ).postMessage(request);
  }

  onMessage(handler: (response: TransportResponse) => void): void {
    // In a Worker context globalThis fires 'message' events for messages from
    // the main thread.
    (
      globalThis as unknown as {
        addEventListener: (
          event: string,
          listener: (event: { data: unknown }) => void
        ) => void;
      }
    ).addEventListener('message', (event: { data: unknown }) => {
      handler(event.data as TransportResponse);
    });
  }
}
