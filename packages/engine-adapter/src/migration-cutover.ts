export type SubsystemName = "units" | "cities" | "research" | "diplomacy" | "world";
export type CutoverMode = "legacy" | "migrated" | "shadow";

export type MigrationCutoverConfig = Partial<Record<SubsystemName, CutoverMode>>;

export function cutoverMode(
  config: MigrationCutoverConfig | undefined,
  subsystem: SubsystemName
): CutoverMode {
  return config?.[subsystem] ?? "legacy";
}

export function shouldUseMigratedPath(
  config: MigrationCutoverConfig | undefined,
  subsystem: SubsystemName
): boolean {
  return cutoverMode(config, subsystem) === "migrated";
}

export function shouldShadowCompare(
  config: MigrationCutoverConfig | undefined,
  subsystem: SubsystemName
): boolean {
  return cutoverMode(config, subsystem) === "shadow";
}

