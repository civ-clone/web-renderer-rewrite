import { describe, expect, it } from 'vitest';
import {
  deserializeFromTransport,
  serializeForTransport,
  serializeTransportRequest,
  serializeTransportResponse,
} from '../../../src/transport/serde';

describe('transport serde abstraction', () => {
  it('serializes recursive/cyclic objects automatically', () => {
	const payload: Record<string, unknown> = {
	  id: 'player-1',
	};
	const city: Record<string, unknown> = {
	  id: 'city-1',
	  owner: payload,
	};

	payload['cities'] = [city];
	payload['self'] = payload;

	const serialized = serializeForTransport(payload);

	expect(serialized).not.toBe(payload);
	expect((serialized as Record<string, unknown>)['self']).toBe(serialized);

	const serializedCity = (
	  (serialized as Record<string, unknown>)['cities'] as Record<string, unknown>[]
	)[0];

	expect(serializedCity['owner']).toBe(serialized);
  });

  it('keeps request/response helpers transport-safe', () => {
	const requestPayload: Record<string, unknown> = { key: 'value' };
	requestPayload['self'] = requestPayload;

	const request = serializeTransportRequest({
	  correlationId: 'c-1',
	  type: 'choice-list',
	  payload: requestPayload,
	});

	expect(request.payload).not.toBe(requestPayload);
	expect((request.payload as Record<string, unknown>)['self']).toBe(
	  request.payload
	);

	const responsePayload: Record<string, unknown> = { result: 'ok' };
	responsePayload['self'] = responsePayload;

	const response = serializeTransportResponse({
	  correlationId: 'c-1',
	  payload: responsePayload,
	});
	const deserialized = deserializeFromTransport(response);

	expect(deserialized.payload).not.toBe(responsePayload);
	expect((deserialized.payload as Record<string, unknown>)['self']).toBe(
	  deserialized.payload
	);
  });
});

