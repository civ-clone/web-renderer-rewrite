import type { StartupFailure, StartupFailureCode } from './contracts.js';

const keywordToCode: Array<[RegExp, StartupFailureCode]> = [
  [/module/i, 'module_init'],
  [/participant/i, 'participant_create'],
  [/registry|bind/i, 'registry_bind'],
  [/transport|message|postmessage/i, 'transport'],
];

export const classifyStartupFailure = (
  error: unknown,
  now: number = Date.now()
): StartupFailure => {
  const message = error instanceof Error ? error.message : String(error);
  const code =
    keywordToCode.find(([regex]) => regex.test(message))?.[1] ?? 'unknown';

  return {
    code,
    message,
    recoverable: true,
    detectedAt: now,
  };
};

