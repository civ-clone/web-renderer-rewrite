export const elapsedMs = (startedAt: number, endedAt: number): number =>
  endedAt - startedAt;

export const expectUnderThreshold = (
  elapsed: number,
  threshold: number
): boolean => elapsed <= threshold;

