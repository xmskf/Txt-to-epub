import { defineConfig } from "vite";

// 用 Vite 的 SSR 构建生成 CLI 单入口文件；jszip/jschardet 作为运行时依赖
// 保持外部化，从项目 node_modules 解析，避免打包 CJS 依赖时的兼容问题
export default defineConfig({
  publicDir: false,
  build: {
    ssr: "src/cli/index.ts",
    outDir: "dist-cli",
    emptyOutDir: true,
    copyPublicDir: false,
    target: "node20",
    minify: false,
    rollupOptions: {
      output: {
        entryFileNames: "txt-to-epub.js",
        banner: "#!/usr/bin/env node",
      },
    },
  },
});
