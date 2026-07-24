import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
      },
    },
    build: {
      outDir: 'dist/electron/main',
      rollupOptions: {
        input: resolve(__dirname, 'electron/main/index.ts'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
      },
    },
    build: {
      outDir: 'dist/electron/preload',
      rollupOptions: {
        input: resolve(__dirname, 'electron/preload/index.ts'),
        // Electron's sandboxed preload context cannot execute ESM `import`
        // syntax, regardless of the root package.json's "type": "module" —
        // force CommonJS output (and a .cjs extension, so Node doesn't
        // reinterpret it as ESM based on the root package.json).
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs',
        },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    // Required for Electron's loadFile()/file:// loading — without this,
    // Vite emits root-absolute asset paths (/assets/...) that don't resolve
    // under the file:// protocol.
    base: './',
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
      },
    },
    plugins: [react()],
    build: {
      // Nested under dist/electron/ as a sibling of main/preload, matching
      // the single-level '../renderer' relative reference used in
      // electron/main/index.ts.
      outDir: resolve(__dirname, 'dist/electron/renderer'),
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html'),
      },
    },
  },
});
