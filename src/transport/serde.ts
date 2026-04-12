import type {
  TransportRequest,
  TransportResponse,
} from './TransportMessage.js';

function deepCloneWithCycles<T>(value: T, seen = new Map<unknown, unknown>()): T {
  if (typeof value !== 'object' || value === null) {
    return value;
  }

  if (seen.has(value)) {
    return seen.get(value) as T;
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as unknown as T;
  }

  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags) as unknown as T;
  }

  if (value instanceof Map) {
    const clone = new Map();
    seen.set(value, clone);
    value.forEach((mapValue, key) => {
      clone.set(
        deepCloneWithCycles(key, seen),
        deepCloneWithCycles(mapValue, seen)
      );
    });
    return clone as unknown as T;
  }

  if (value instanceof Set) {
    const clone = new Set();
    seen.set(value, clone);
    value.forEach((setValue) => {
      clone.add(deepCloneWithCycles(setValue, seen));
    });
    return clone as unknown as T;
  }

  if (Array.isArray(value)) {
    const clone: unknown[] = [];
    seen.set(value, clone);
    value.forEach((item, index) => {
      clone[index] = deepCloneWithCycles(item, seen);
    });
    return clone as unknown as T;
  }

  const clone = {} as Record<string, unknown>;
  seen.set(value, clone);
  Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
    clone[key] = deepCloneWithCycles(child, seen);
  });

  return clone as T;
}

function cloneTransportData<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return deepCloneWithCycles(value);
}

export const serializeForTransport = <T>(value: T): T =>
  cloneTransportData(value);

export const deserializeFromTransport = <T>(value: T): T =>
  cloneTransportData(value);

export const serializeTransportRequest = (
  request: TransportRequest
): TransportRequest => serializeForTransport(request);

export const serializeTransportResponse = (
  response: TransportResponse
): TransportResponse => serializeForTransport(response);

export const deserializeTransportResponse = (
  response: TransportResponse
): TransportResponse => deserializeFromTransport(response);

