import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.onemorelevel.myapp',
  appName: 'One More Level',
  webDir: 'dist',
  android: {
    // Keeps rendering predictable on low-end devices.
    backgroundColor: '#0B0E1A',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: '#0B0E1A',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
