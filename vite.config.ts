import { defineConfig } from "vite";
import { resolve } from "path";
import wasm from "vite-plugin-wasm";
import { viteStaticCopy } from "vite-plugin-static-copy";
import compression from "vite-plugin-compression";
import { resolveAmlRoot } from "./scripts/project-paths.mjs";

const amllRoot = resolveAmlRoot(__dirname);

export default defineConfig({
  base: "/amll-web/",
  build: {
    target: ["esnext"],
  },
  resolve: {
    alias: [
      {
        find: /^@applemusic-like-lyrics\/core\/style\.css$/,
        replacement: resolve(amllRoot, "packages", "core", "dist", "amll-core.css"),
      },
      {
        find: /^@applemusic-like-lyrics\/core$/,
        replacement: resolve(amllRoot, "packages", "core", "dist", "amll-core.js"),
      },
      {
        find: /^@applemusic-like-lyrics\/lyric$/,
        replacement: resolve(amllRoot, "packages", "lyric", "pkg", "amll_lyric.js"),
      },
      {
        find: /^@applemusic-like-lyrics\/ttml$/,
        replacement: resolve(amllRoot, "packages", "ttml", "dist", "amll-ttml.js"),
      },
    ],
  },
  plugins: [
    wasm(),
    viteStaticCopy({
      targets: [
        {
          src: "./public/icons/*",
          dest: "assets",
        },
        {
          src: "./public/*",
          dest: "public",
        },
      ],
    }),
    compression({
      algorithm: "gzip",
      ext: ".gz",
      threshold: 1024,
      deleteOriginFile: false,
    }),
  ],
});
