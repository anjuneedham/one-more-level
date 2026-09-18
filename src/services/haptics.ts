import { Save } from './storage';

export type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const WEB_PATTERNS: Record<HapticKind, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 35,
  success: [12, 40, 22],
  warning: [18, 60, 18],
  error: [30, 50, 30],
};

interface CapacitorHapticsPlugin {
  impact(options: { style: string }): Promise<void>;
  notification(options: { type: string }): Promise<void>;
}

function nativePlugin(): CapacitorHapticsPlugin | null {
  const cap = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown> } }).Capacitor;
  const plugin = cap?.Plugins?.['Haptics'] as CapacitorHapticsPlugin | undefined;
  return plugin ?? null;
}

class HapticsManager {
  private enabled = Save.get().hapticEnabled;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    Save.update({ hapticEnabled: enabled });
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** True when the device can actually produce feedback. */
  isSupported(): boolean {
    return Boolean(nativePlugin()) || typeof navigator.vibrate === 'function';
  }

  fire(kind: HapticKind): void {
    if (!this.enabled) return;
    const plugin = nativePlugin();
    try {
      if (plugin) {
        if (kind === 'success' || kind === 'warning' || kind === 'error') {
          void plugin.notification({ type: kind.toUpperCase() });
        } else {
          void plugin.impact({ style: kind.toUpperCase() });
        }
        return;
      }
      navigator.vibrate?.(WEB_PATTERNS[kind]);
    } catch {
      // Unsupported hardware or a blocked permission: silently skip.
    }
  }
}

export const Haptics = new HapticsManager();
