import { describe, expect, it } from 'vitest';
import { classifyStartupFailure } from '../../../src/js/new-game/classifyStartupFailure';

describe('startup failure mapping', () => {
  it('maps known startup failure buckets', () => {
    expect(classifyStartupFailure(new Error('module init failed')).code).toBe(
      'module_init'
    );
    expect(classifyStartupFailure(new Error('participant bootstrap failed')).code).toBe(
      'participant_create'
    );
    expect(classifyStartupFailure(new Error('registry bind failed')).code).toBe(
      'registry_bind'
    );
    expect(classifyStartupFailure(new Error('transport unavailable')).code).toBe(
      'transport'
    );
    expect(classifyStartupFailure(new Error('totally different')).code).toBe(
      'unknown'
    );
  });
});

