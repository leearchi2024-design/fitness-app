import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base: './' 讓網站放在 GitHub Pages 的子路徑（https://帳號.github.io/repo名/）也能正常載入
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
  },
});
