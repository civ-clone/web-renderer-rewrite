export interface LatencyMeasurement {
  startedAt: number;
  finishedAt: number;
  durationMs: number;
}

export const measureLatency = async <T>(
  work: () => Promise<T>
): Promise<{
  result: T;
  measurement: LatencyMeasurement;
}> => {
  const startedAt = Date.now();
  const result = await work();
  const finishedAt = Date.now();

  return {
    result,
    measurement: {
      startedAt,
      finishedAt,
      durationMs: finishedAt - startedAt,
    },
  };
};
