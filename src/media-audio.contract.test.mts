/**
 * Parity checks for amll-web media-audio helpers (mirrors v2 contract tests).
 * Run: node --experimental-strip-types templates/amll-web/src/media-audio.contract.test.mts
 * or: npx tsx templates/amll-web/src/media-audio.contract.test.mts
 */
import {
  parseMediaAudioUrl,
  resolveSongRelativePath,
} from "./media-audio.ts";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

assert(resolveSongRelativePath("https://example.com/audio.mp3") === null, "external ext URL");
assert(resolveSongRelativePath("https://example.com/stream") === null, "external stream URL");
assert(
  resolveSongRelativePath("http://127.0.0.1:5000/songs/a/b.flac") === "a/b.flac",
  "local songs URL"
);

assert(
  resolveSongRelativePath("http://127.0.0.1:5000/songs/foo%20bar.mp3") === "foo bar.mp3",
  "direct /songs/ URL decodes %20 once"
);

assert(
  resolveSongRelativePath("songs/foo%2520bar.mp3") === "foo%20bar.mp3",
  "direct songs/ path keeps literal %20 after one decode"
);

{
  const signed =
    "http://127.0.0.1:5000/media/audio?file=100%2520song.mp3&exp=1&token=abc";
  const parsed = parseMediaAudioUrl(signed);
  assert(parsed?.file === "100%20song.mp3", `once-decode file, got ${parsed?.file}`);
  assert(resolveSongRelativePath(signed) === "100%20song.mp3", "resolve signed once");
}

console.log("amll-web media-audio contract checks passed");
