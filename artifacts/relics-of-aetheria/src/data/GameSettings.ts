/**
 * GameSettings
 *
 * M18: Persistent user preferences backed by localStorage.
 * All keys are namespaced under 'roa_settings'.
 *
 * Usage:
 *   const s = GameSettings.load();     // reads from localStorage
 *   s.sfxOn = false;
 *   GameSettings.save(s);             // persists to localStorage
 */

export interface GameSettingsData {
  musicOn:     boolean;
  sfxOn:       boolean;
  vibrationOn: boolean;
}

export class GameSettings {
  private static readonly STORAGE_KEY = 'roa_settings';

  static readonly defaults: Readonly<GameSettingsData> = {
    musicOn:     true,
    sfxOn:       true,
    vibrationOn: true,
  };

  /**
   * Load settings from localStorage, falling back to defaults for any
   * missing or invalid keys (graceful for first-run or corrupted data).
   */
  static load(): GameSettingsData {
    try {
      const raw = localStorage.getItem(GameSettings.STORAGE_KEY);
      if (!raw) return { ...GameSettings.defaults };
      const parsed = JSON.parse(raw) as Partial<GameSettingsData>;
      return {
        musicOn:     parsed.musicOn     ?? GameSettings.defaults.musicOn,
        sfxOn:       parsed.sfxOn       ?? GameSettings.defaults.sfxOn,
        vibrationOn: parsed.vibrationOn ?? GameSettings.defaults.vibrationOn,
      };
    } catch {
      return { ...GameSettings.defaults };
    }
  }

  /** Persist settings to localStorage. Silently ignores storage errors. */
  static save(data: GameSettingsData): void {
    try {
      localStorage.setItem(GameSettings.STORAGE_KEY, JSON.stringify(data));
    } catch {
      // localStorage unavailable (private mode, quota exceeded) — no-op.
    }
  }
}
