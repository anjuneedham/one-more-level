import { App } from './app';
import { Analytics } from './services/analytics';
import { Ads } from './services/ads';
import { Audio } from './services/audio';
import './styles.css';

const root = document.getElementById('app');
if (!root) throw new Error('#app container is missing');

new App(root);

Analytics.track('session_started', { platform: navigator.userAgent.includes('Android') ? 'android' : 'web' });

// Ads warm up in the background; the game never waits on them.
void Ads.initialize();

// Browsers only allow audio after a gesture - unlock on the first touch.
const unlock = (): void => {
  void Audio.resume();
  window.removeEventListener('pointerdown', unlock);
};
window.addEventListener('pointerdown', unlock);

// Native chrome: dark status bar, splash hidden once the first frame is up.
requestAnimationFrame(() => {
  const plugins = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown> } })
    .Capacitor?.Plugins;
  const splash = plugins?.['SplashScreen'] as { hide?: () => Promise<void> } | undefined;
  void splash?.hide?.();
  const statusBar = plugins?.['StatusBar'] as
    | {
        setStyle?: (o: { style: string }) => Promise<void>;
        setBackgroundColor?: (o: { color: string }) => Promise<void>;
      }
    | undefined;
  void statusBar?.setStyle?.({ style: 'DARK' });
  void statusBar?.setBackgroundColor?.({ color: '#0B0E1A' });
});
