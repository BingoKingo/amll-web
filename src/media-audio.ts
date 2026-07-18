export interface ParsedMediaAudioUrl {
  file: string;
  exp: number;
  token: string;
  mode: string | null;
}

export interface MediaSignResponse {
  url: string;
  exp: number;
  file: string;
}

function normalizeInputUrl(input: string): string {
  if (!input) {
    return "";
  }
  if (input[0] === ":") {
    const match = /^:(\d+)(\/.*)?$/.exec(input);
    if (match) {
      const [, port, rest = ""] = match;
      const protocol = window.location?.protocol || "http:";
      const hostname = window.location?.hostname || "127.0.0.1";
      return `${protocol}//${hostname}:${port}${rest}`;
    }
  }
  return input;
}

/** Decode direct /songs/ path segments once; signed query params must not be decoded again. */
function decodeDirectSongsRelative(relative: string): string {
  if (!relative) {
    return relative;
  }
  try {
    return decodeURIComponent(relative);
  } catch {
    return relative;
  }
}

export function parseMediaAudioUrl(input: string): ParsedMediaAudioUrl | null {
  const normalized = normalizeInputUrl(input.trim());
  if (!normalized) {
    return null;
  }

  let pathname = normalized;
  let search = "";
  try {
    const parsed = new URL(normalized, window.location.origin);
    pathname = parsed.pathname;
    search = parsed.search;
  } catch {
    const queryIndex = normalized.indexOf("?");
    if (queryIndex >= 0) {
      pathname = normalized.slice(0, queryIndex);
      search = normalized.slice(queryIndex);
    }
  }

  if (!pathname.replace(/\/+$/, "").endsWith("/media/audio")) {
    return null;
  }

  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const file = (params.get("file") || "").trim();
  const expRaw = (params.get("exp") || "").trim();
  const token = (params.get("token") || "").trim();
  const mode = params.get("mode");
  const exp = Number.parseInt(expRaw, 10);
  if (!file || !token || !Number.isFinite(exp)) {
    return null;
  }

  return { file, exp, token, mode };
}

export function isMediaAudioUrl(input: string): boolean {
  return parseMediaAudioUrl(input) !== null;
}

export function isMediaTokenExpired(input: string, bufferSec = 60): boolean {
  const parsed = parseMediaAudioUrl(input);
  if (!parsed) {
    return false;
  }
  const nowSec = Math.floor(Date.now() / 1000);
  return parsed.exp <= nowSec + Math.max(0, bufferSec);
}

export function resolveSongRelativePath(input: string): string | null {
  const trimmed = normalizeInputUrl((input || "").trim());
  if (!trimmed) {
    return null;
  }

  const mediaParsed = parseMediaAudioUrl(trimmed);
  if (mediaParsed?.file) {
    return mediaParsed.file;
  }

  const isHttp = /^https?:\/\//i.test(trimmed);
  let path = trimmed;
  if (isHttp) {
    try {
      path = new URL(trimmed).pathname || trimmed;
    } catch {
      path = trimmed;
    }
  }

  path = path.split("?")[0].split("#")[0].replace(/\\/g, "/");
  if (path.startsWith("/songs/")) {
    return decodeDirectSongsRelative(path.slice("/songs/".length).replace(/^\/+/, ""));
  }
  if (path.startsWith("songs/")) {
    return decodeDirectSongsRelative(path.slice("songs/".length).replace(/^\/+/, ""));
  }

  // External HTTP(S) outside /songs/ and /media/audio is not a local relative path.
  if (isHttp) {
    return null;
  }

  if (!path.includes("/") && /\.(mp3|wav|ogg|flac|m4a|aac|opus|webm|mp4)$/i.test(path)) {
    return decodeDirectSongsRelative(path.replace(/^\/+/, ""));
  }

  return null;
}

export type MusicUrlKind = "empty" | "signed-media" | "local-songs" | "unknown";

export function classifyMusicUrl(input: string): MusicUrlKind {
  const trimmed = normalizeInputUrl((input || "").trim());
  if (!trimmed) {
    return "empty";
  }
  if (isMediaAudioUrl(trimmed)) {
    return "signed-media";
  }
  if (resolveSongRelativePath(trimmed)) {
    return "local-songs";
  }
  return "unknown";
}

export function isLocalSongMusicUrl(input: string): boolean {
  const kind = classifyMusicUrl(input);
  return kind === "signed-media" || kind === "local-songs";
}

export async function refreshMediaAudioUrl(input: {
  file?: string | null;
  url?: string | null;
  mode?: string | null;
}): Promise<MediaSignResponse | null> {
  const payload: Record<string, string> = {};
  if (input.file) {
    payload.file = input.file;
  } else if (input.url) {
    payload.url = input.url;
  } else {
    return null;
  }
  if (input.mode) {
    payload.mode = input.mode;
  }

  const response = await fetch("/media/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => null);
  if (!response) {
    return null;
  }
  if (!response.ok) {
    return null;
  }
  const data = await response.json().catch(() => null);
  if (!data || typeof data.url !== "string" || typeof data.file !== "string") {
    return null;
  }
  return {
    url: data.url,
    exp: Number(data.exp) || 0,
    file: data.file,
  };
}

export async function ensurePlayableMusicUrl(
  input: string,
  options?: {
    songFileRelative?: string | null;
    allowCachedFile?: boolean;
    bufferSec?: number;
    forceRefresh?: boolean;
  }
): Promise<{ url: string; file: string | null }> {
  const trimmed = (input || "").trim();
  const kind = classifyMusicUrl(trimmed);
  if (kind === "empty") {
    const cachedFile = options?.allowCachedFile ? (options.songFileRelative || null) : null;
    return { url: "", file: cachedFile };
  }

  if (kind === "unknown") {
    return { url: trimmed, file: null };
  }

  const inputFile = resolveSongRelativePath(trimmed);
  const bufferSec = options?.bufferSec ?? 60;
  const forceRefresh = options?.forceRefresh ?? false;

  if (kind === "signed-media") {
    const parsed = parseMediaAudioUrl(trimmed)!;
    const fileForSign = inputFile || parsed.file || null;
    if (!forceRefresh && !isMediaTokenExpired(trimmed, bufferSec)) {
      return { url: trimmed, file: fileForSign };
    }
    const refreshed = await refreshMediaAudioUrl({
      file: fileForSign || undefined,
      url: fileForSign ? undefined : trimmed,
      mode: parsed.mode || undefined,
    });
    if (refreshed) {
      return { url: refreshed.url, file: refreshed.file };
    }
    return { url: trimmed, file: fileForSign };
  }

  if (forceRefresh && inputFile) {
    const refreshed = await refreshMediaAudioUrl({ file: inputFile });
    if (refreshed) {
      return { url: refreshed.url, file: refreshed.file };
    }
  }

  return { url: trimmed, file: inputFile };
}
