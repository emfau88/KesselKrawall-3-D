import { describe, expect, test } from "vitest";

import { DEFAULT_AUDIO_SETTINGS, normalizeAudioSettings } from "../../presentation/audio/audioDirector";

describe("audio settings", () => {
  test("fills missing values with the production mix", () => {
    expect(normalizeAudioSettings({ enabled: false })).toEqual({
      ...DEFAULT_AUDIO_SETTINGS,
      enabled: false,
    });
  });

  test("clamps persisted mixer values", () => {
    expect(normalizeAudioSettings({ master: 4, music: -1, sfx: Number.NaN })).toMatchObject({
      master: 1,
      music: 0,
      sfx: 0,
    });
  });
});

