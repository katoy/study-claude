import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  root: 'src',
  plugins: [viteSingleFile()],
  build: {
    target: 'es2022',
    outDir: '../dist',
    emptyOutDir: true,
  },
});
