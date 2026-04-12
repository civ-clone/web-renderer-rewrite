export interface InitializationModule {
  name: string;
  initialize: () => void | Promise<void>;
}

export interface InitializationProfile {
  modules: string[];
  versionTag?: string;
}

export interface InitializationResult {
  initializedAt: number;
}

export const createDefaultInitializationProfile = (): InitializationProfile => ({
  modules: ['core-world', 'core-rules', 'core-turn-loop'],
  versionTag: 'mvp',
});

export const initializeProfile = async (
  profile: InitializationProfile,
  modules: InitializationModule[],
  now: () => number = () => Date.now()
): Promise<InitializationResult> => {
  if (!profile.modules.length) {
    throw new Error('module_init: no required modules configured');
  }

  for (const required of profile.modules) {
    const module = modules.find((candidate) => candidate.name === required);

    if (!module) {
      throw new Error(`module_init: missing module ${required}`);
    }

    await Promise.resolve(module.initialize());
  }

  return {
    initializedAt: now(),
  };
};

