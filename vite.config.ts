import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // This allows us to use process.env in the browser code
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.GOOGLE_SCRIPT_URL': JSON.stringify(env.GOOGLE_SCRIPT_URL)
    },
    server: {
      port: 3000
    }
  };
});