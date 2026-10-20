import { SoundEffectsSettings } from '../types/audio';

export const DEFAULT_SFX_SETTINGS: SoundEffectsSettings = {
  enabled: true,
  volume: 0.7,
};

const SFX_STORAGE_KEY = 'minja_sfx_settings';

let memorySfxSettings: SoundEffectsSettings = { ...DEFAULT_SFX_SETTINGS };

/**
 * Retrieve sound effects configuration from localStorage (fast & synchronous-friendly)
 */
export async function getSoundEffectsSettings(): Promise<SoundEffectsSettings> {
  if (typeof window === 'undefined') {
    return { ...memorySfxSettings };
  }

  try {
    const raw = localStorage.getItem(SFX_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      memorySfxSettings = {
        enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_SFX_SETTINGS.enabled,
        volume: typeof parsed.volume === 'number' ? Math.max(0, Math.min(1, parsed.volume)) : DEFAULT_SFX_SETTINGS.volume,
      };
    }
  } catch (err) {
    console.warn('Gagal membaca pengaturan SFX dari storage:', err);
  }

  return { ...memorySfxSettings };
}

/**
 * Persist sound effects configuration to localStorage
 */
export async function saveSoundEffectsSettings(settings: SoundEffectsSettings): Promise<void> {
  memorySfxSettings = { ...settings };

  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SFX_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Gagal menyimpan pengaturan SFX ke storage:', err);
  }
}
