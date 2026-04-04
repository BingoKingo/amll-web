import { existsSync } from "fs";
import { resolve, dirname } from "path";

function hasAmlMarkers(dir) {
  return (
    existsSync(resolve(dir, "pnpm-workspace.yaml")) &&
    existsSync(resolve(dir, "packages", "core", "package.json")) &&
    existsSync(resolve(dir, "packages", "lyric", "package.json")) &&
    existsSync(resolve(dir, "packages", "ttml", "package.json"))
  );
}

function hasBackendMarkers(dir) {
  return (
    existsSync(resolve(dir, "backend.py")) &&
    existsSync(resolve(dir, "templates")) &&
    existsSync(resolve(dir, "static"))
  );
}

function normalizeCandidate(dir) {
  return dir ? resolve(dir) : null;
}

function findMatchingDirectory(startDir, matcher) {
  let currentDir = resolve(startDir);

  while (true) {
    if (matcher(currentDir)) {
      return currentDir;
    }

    const siblingCandidate = resolve(currentDir, "applemusic-like-lyrics");
    if (matcher(siblingCandidate)) {
      return siblingCandidate;
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }

    currentDir = parentDir;
  }
}

function resolveConfiguredOrDiscoveredRoot(envName, startDir, matcher, label) {
  const configuredRoot = normalizeCandidate(process.env[envName]);
  if (configuredRoot) {
    if (!matcher(configuredRoot)) {
      throw new Error(
        `${envName} points to an invalid ${label} root: ${configuredRoot}`
      );
    }

    return configuredRoot;
  }

  const discoveredRoot = findMatchingDirectory(startDir, matcher);
  if (!discoveredRoot) {
    throw new Error(`Unable to locate ${label} root from ${resolve(startDir)}`);
  }

  return discoveredRoot;
}

export function resolveAmlRoot(startDir) {
  return resolveConfiguredOrDiscoveredRoot(
    "AMLL_ROOT",
    startDir,
    hasAmlMarkers,
    "applemusic-like-lyrics"
  );
}

export function resolveBackendRoot(startDir) {
  return resolveConfiguredOrDiscoveredRoot(
    "AMLL_WEB_BACKEND_ROOT",
    startDir,
    hasBackendMarkers,
    "backend"
  );
}
