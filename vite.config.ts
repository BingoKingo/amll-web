import { defineConfig } from "vite";
import { resolve } from "path";
import { promises as fs } from "fs";
import wasm from "vite-plugin-wasm";
import { viteStaticCopy } from "vite-plugin-static-copy";
import compression from "vite-plugin-compression";

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function ensureCleanDir(target: string): Promise<void> {
  await fs.rm(target, { recursive: true, force: true });
  await fs.mkdir(target, { recursive: true });
}

async function copyDirectory(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const from = resolve(src, entry.name);
      const to = resolve(dest, entry.name);

      if (entry.isDirectory()) {
        await copyDirectory(from, to);
        return;
      }

      await fs.copyFile(from, to);
    })
  );
}

async function findLatestAsset(dir: string, pattern: RegExp): Promise<string | null> {
  try {
    const entries = await fs.readdir(dir);
    const candidates = await Promise.all(
      entries
        .filter((name) => pattern.test(name))
        .map(async (name) => {
          const stats = await fs.stat(resolve(dir, name));
          return { name, mtime: stats.mtimeMs };
        })
    );

    if (!candidates.length) {
      return null;
    }

    candidates.sort((a, b) => b.mtime - a.mtime);
    return candidates[0].name;
  } catch {
    return null;
  }
}

async function copyStableAsset(dir: string, pattern: RegExp, targetName: string): Promise<void> {
  const latest = await findLatestAsset(dir, pattern);
  if (!latest) {
    return;
  }

  const from = resolve(dir, latest);
  const to = resolve(dir, targetName);
  await fs.copyFile(from, to);
}

function toStaticUrl(filename: string, namespace: "assets" | "icons" | "public"): string {
  return `{{ url_for('static', filename='${namespace}/${filename}') }}`;
}

function toServiceWorkerUrl(): string {
  return "{{ url_for('service_worker') }}";
}

function transformIndexHtml(html: string): string {
  let output = html;

  output = output.replace(/href="\.\/assets\/([^\"]+)"/g, (_, file: string) => `href="${toStaticUrl(file, "assets")}"`);
  output = output.replace(/href="\/assets\/([^\"]+)"/g, (_, file: string) => `href="${toStaticUrl(file, "assets")}"`);
  output = output.replace(/src="\.\/assets\/([^\"]+)"/g, (_, file: string) => `src="${toStaticUrl(file, "assets")}"`);
  output = output.replace(/src="\/assets\/([^\"]+)"/g, (_, file: string) => `src="${toStaticUrl(file, "assets")}"`);

  output = output.replace(/href="\.\/icons\/([^\"]+)"/g, (_, file: string) => `href="${toStaticUrl(file, "icons")}"`);
  output = output.replace(/href="\/icons\/([^\"]+)"/g, (_, file: string) => `href="${toStaticUrl(file, "icons")}"`);
  output = output.replace(/src="\.\/icons\/([^\"]+)"/g, (_, file: string) => `src="${toStaticUrl(file, "icons")}"`);
  output = output.replace(/src="\/icons\/([^\"]+)"/g, (_, file: string) => `src="${toStaticUrl(file, "icons")}"`);

  output = output.replace(/href="\.\/public\/([^\"]+)"/g, (_, file: string) => `href="${toStaticUrl(file, "public")}"`);
  output = output.replace(/href="\/public\/([^\"]+)"/g, (_, file: string) => `href="${toStaticUrl(file, "public")}"`);
  output = output.replace(/src="\.\/public\/([^\"]+)"/g, (_, file: string) => `src="${toStaticUrl(file, "public")}"`);
  output = output.replace(/src="\/public\/([^\"]+)"/g, (_, file: string) => `src="${toStaticUrl(file, "public")}"`);

  output = output.replace(
    /\.register\(\s*"\.\/service-worker\.js"\s*(?:,\s*\{[^)]*\})?\s*\)/g,
    () => `.register("${toServiceWorkerUrl()}", { scope: "/amll-web/" })`
  );
  output = output.replace(
    /\.register\(\s*'\.\/service-worker\.js'\s*(?:,\s*\{[^)]*\})?\s*\)/g,
    () => `.register('${toServiceWorkerUrl()}', { scope: "/amll-web/" })`
  );
  output = output.replace(
    /\.register\(\s*"\.\/public\/([^\"]+)"\s*(?:,\s*(\{[^)]*\}))?\s*\)/g,
    (_, file: string, options?: string) =>
      `.register("${toStaticUrl(file, "public")}"${options ? `, ${options}` : ""})`
  );
  output = output.replace(
    /\.register\(\s*'\.\/public\/([^\']+)'\s*(?:,\s*(\{[^)]*\}))?\s*\)/g,
    (_, file: string, options?: string) =>
      `.register('${toStaticUrl(file, "public")}'${options ? `, ${options}` : ""})`
  );

  output = output.replace(/url_for\('static', filename='assets\/index-[^']+\.js'\)/g, "url_for('static', filename='assets/amll-player.js')");
  output = output.replace(/url_for\('static', filename='assets\/index-[^']+\.css'\)/g, "url_for('static', filename='assets/amll-player.css')");

  return output;
}

function backendIntegrationPlugin() {
  return {
    name: "backend-integration",
    async writeBundle() {
      const backendRoot = resolve(__dirname, "..");
      const distDir = resolve(__dirname, "dist");

      if (!(await pathExists(distDir))) {
        return;
      }

      const staticTargets = [
        { src: resolve(distDir, "assets"), dest: resolve(backendRoot, "static", "assets") },
        { src: resolve(distDir, "icons"), dest: resolve(backendRoot, "static", "icons") },
        { src: resolve(distDir, "public"), dest: resolve(backendRoot, "static", "public") },
      ];

      for (const { src, dest } of staticTargets) {
        if (await pathExists(src)) {
          await ensureCleanDir(dest);
          await copyDirectory(src, dest);
        } else {
          await fs.rm(dest, { recursive: true, force: true });
        }
      }

      const indexPath = resolve(distDir, "index.html");

      if (await pathExists(indexPath)) {
        const html = await fs.readFile(indexPath, "utf8");
        const transformed = transformIndexHtml(html);
        const templateTarget = resolve(backendRoot, "templates", "amll_web_player.html");

        await fs.mkdir(resolve(backendRoot, "templates"), { recursive: true });
        await fs.writeFile(templateTarget, transformed, "utf8");
      }

      const backendAssetsDir = resolve(backendRoot, "static", "assets");
      if (await pathExists(backendAssetsDir)) {
        await copyStableAsset(backendAssetsDir, /^index-.*\.js$/, "amll-player.js");
        await copyStableAsset(backendAssetsDir, /^index-.*\.css$/, "amll-player.css");
      }
    },
  };
}

export default defineConfig({
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
      algorithm: "gzip",
      ext: ".gz",
      threshold: 1024,
      deleteOriginFile: false,
    }),
    backendIntegrationPlugin(),
  ],
});
