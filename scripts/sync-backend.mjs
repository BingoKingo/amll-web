import { promises as fs } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { resolveBackendRoot } from "./project-paths.mjs";

console.error(
  "[DEPRECATED] Do not run templates/amll-web/scripts/sync-backend.mjs anymore. The backend now serves templates/amll-web/dist directly; this script must not be executed."
);
process.exit(1);

const __dirname = dirname(fileURLToPath(import.meta.url));

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function ensureCleanDir(target) {
  await fs.rm(target, { recursive: true, force: true });
  await fs.mkdir(target, { recursive: true });
}

async function copyDirectory(src, dest) {
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

async function findLatestAsset(dir, pattern) {
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

async function copyStableAsset(dir, pattern, targetName) {
  const latest = await findLatestAsset(dir, pattern);
  if (!latest) {
    return;
  }

  const from = resolve(dir, latest);
  const to = resolve(dir, targetName);
  await fs.copyFile(from, to);
}

function toStaticUrl(filename, namespace) {
  return `{{ url_for('static', filename='${namespace}/${filename}') }}`;
}

function transformIndexHtml(html) {
  let output = html;

  output = output.replace(/href=\"\.\/assets\/([^\"]+)\"/g, (_, file) => `href=\"${toStaticUrl(file, "assets")}\"`);
  output = output.replace(/href=\"\/assets\/([^\"]+)\"/g, (_, file) => `href=\"${toStaticUrl(file, "assets")}\"`);
  output = output.replace(/src=\"\.\/assets\/([^\"]+)\"/g, (_, file) => `src=\"${toStaticUrl(file, "assets")}\"`);
  output = output.replace(/src=\"\/assets\/([^\"]+)\"/g, (_, file) => `src=\"${toStaticUrl(file, "assets")}\"`);

  output = output.replace(/href=\"\.\/icons\/([^\"]+)\"/g, (_, file) => `href=\"${toStaticUrl(file, "icons")}\"`);
  output = output.replace(/href=\"\/icons\/([^\"]+)\"/g, (_, file) => `href=\"${toStaticUrl(file, "icons")}\"`);
  output = output.replace(/src=\"\.\/icons\/([^\"]+)\"/g, (_, file) => `src=\"${toStaticUrl(file, "icons")}\"`);
  output = output.replace(/src=\"\/icons\/([^\"]+)\"/g, (_, file) => `src=\"${toStaticUrl(file, "icons")}\"`);

  output = output.replace(/href=\"\.\/public\/([^\"]+)\"/g, (_, file) => `href=\"${toStaticUrl(file, "public")}\"`);
  output = output.replace(/href=\"\/public\/([^\"]+)\"/g, (_, file) => `href=\"${toStaticUrl(file, "public")}\"`);
  output = output.replace(/src=\"\.\/public\/([^\"]+)\"/g, (_, file) => `src=\"${toStaticUrl(file, "public")}\"`);
  output = output.replace(/src=\"\/public\/([^\"]+)\"/g, (_, file) => `src=\"${toStaticUrl(file, "public")}\"`);

  output = output.replace(/\.register\(\"\.\/public\/([^\"]+)\"\)/g, (_, file) => `.register(\"${toStaticUrl(file, "public")}\")`);
  output = output.replace(/\.register\('\.\/public\/([^\']+)'\)/g, (_, file) => `.register('${toStaticUrl(file, "public")}')`);

  output = output.replace(/url_for\('static', filename='assets\/index-[^']+\.js'\)/g, "url_for('static', filename='assets/amll-player.js')");
  output = output.replace(/url_for\('static', filename='assets\/index-[^']+\.css'\)/g, "url_for('static', filename='assets/amll-player.css')");

  return output;
}

async function main() {
  const backendRoot = resolveBackendRoot(__dirname);
  const distDir = resolve(__dirname, "..", "dist");

  if (!(await pathExists(distDir))) {
    console.error("dist directory not found:", distDir);
    process.exit(1);
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
}

main().catch((error) => {
  console.error("sync-backend failed:", error);
  process.exit(1);
});
