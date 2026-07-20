import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// 零改动阶段：app/ 是源码目录（当前与仓库根目录的 index.html 内容一致）
// 构建产物输出到仓库根目录下的 dist/，再由 CI 把 dist/index.html 拷回根目录 index.html
export default defineConfig({
  root: 'app',
  plugins: [viteSingleFile()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    assetsInlineLimit: 100000000,
    cssCodeSplit: false
  }
});
