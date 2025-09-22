import wasm from "vite-plugin-wasm";
import { viteStaticCopy } from "vite-plugin-static-copy";
import compression from 'vite-plugin-compression';

export default {
  // base: "/haruhikage", // Toggle or change this when build
  build: {
    target: ["esnext"],
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
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
      deleteOriginFile: false,
    })
  ],
};