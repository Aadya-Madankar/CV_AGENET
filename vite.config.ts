import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // Point to new src structure
    root: '.',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    preview: {
      port: 3000,
    },
    plugins: [react()],
    define: {
      // Make VITE_ prefixed env vars available
      'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@backend': path.resolve(__dirname, './src/backend'),
        '@frontend': path.resolve(__dirname, './src/frontend'),
        '@utils': path.resolve(__dirname, './src/utils'),
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
});
