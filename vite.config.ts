import { defineConfig } from 'vite';

// Web build doubles as the Capacitor webDir (`dist`), so keep paths relative:
// Android loads the bundle from the local file system / capacitor:// scheme.
export default defineConfig({
  base: './',
  server: { host: true, port: 5173 },
  build: {
    target: 'es2019',
    outDir: 'dist',
    assetsInlineLimit: 8192,
    sourcemap: false,
  },
});
