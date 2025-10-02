import type { LyricLine as RawLyricLine } from "@applemusic-like-lyrics/lyric";

// 检测是否为 SRT 格式：包含形如 00:00:01,000 --> 00:00:04,000 的时间轴
export function isSrtFormat(content: string): boolean {
  const lines = content.split(/\r?\n/).map((l) => l.trim());
  const timeRegex = /\d{2}:\d{2}:\d{2},\d{3}\s+-->\s+\d{2}:\d{2}:\d{2},\d{3}/;
  return lines.some((line) => timeRegex.test(line));
}

// 将 SRT 文本转换为 TTML（逐行，无逐字）
export function srtToTTML(content: string): string {
  const blocks = splitSrtBlocks(content);
  let ttml = `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:tts="http://www.w3.org/ns/ttml#styling" xml:lang="en">\n` +
    `  <head>\n` +
    `    <metadata>\n` +
    `      <ttm:title>SRT Converted</ttm:title>\n` +
    `    </metadata>\n` +
    `    <styling>\n` +
    `      <style xml:id="normal" tts:fontFamily="Arial" tts:fontSize="100%" tts:textAlign="center"/>\n` +
    `    </styling>\n` +
    `    <layout>\n` +
    `      <region xml:id="bottom" tts:origin="0% 0%" tts:extent="100% 100%" tts:textAlign="center" tts:displayAlign="after"/>\n` +
    `    </layout>\n` +
    `  </head>\n` +
    `  <body>\n` +
    `    <div>\n`;

  for (const b of blocks) {
    if (!b) continue;
    const { beginMs, endMs, text } = b;
    if (beginMs == null || endMs == null) continue;
    const begin = formatTtmlTime(beginMs);
    const end = formatTtmlTime(endMs);
    // 将多行文本用换行保留
    const safe = escapeXml(text).replace(/\n/g, "<br/>");
    ttml += `      <p begin="${begin}" end="${end}" region="bottom">`;
    ttml += `<span begin="${begin}" end="${end}">${safe}</span>`;
    ttml += `</p>\n`;
  }

  ttml += `    </div>\n  </body>\n</tt>`;
  return ttml;
}

// 简单解析为 RawLyricLine（不做逐字，同步到整行）
export function parseSrt(content: string): RawLyricLine[] {
  const blocks = splitSrtBlocks(content);
  const result: RawLyricLine[] = [] as unknown as RawLyricLine[];
  for (const b of blocks) {
    if (!b) continue;
    const { beginMs, endMs, text } = b;
    if (beginMs == null || endMs == null) continue;
    const line: any = {
      words: [
        {
          startTime: beginMs,
          endTime: endMs,
          word: text.replace(/\n+/g, " ").trim(),
        },
      ],
      startTime: beginMs,
      endTime: endMs,
      translatedLyric: "",
      romanLyric: "",
      isBG: false,
      isDuet: false,
    };
    result.push(line);
  }
  return result;
}

function splitSrtBlocks(content: string): { beginMs: number; endMs: number; text: string }[] {
  const normalized = content.replace(/\r\n/g, "\n");
  const rawBlocks = normalized.split(/\n\s*\n/);
  const timeRegex = /(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/;
  const blocks: { beginMs: number; endMs: number; text: string }[] = [];

  for (const block of rawBlocks) {
    const lines = block.split(/\n/).map((l) => l.trim());
    if (lines.length === 0) continue;
    // 跳过索引行（纯数字）
    let idx = 0;
    if (/^\d+$/.test(lines[0])) idx = 1;
    const timeLine = lines[idx] || "";
    const m = timeRegex.exec(timeLine);
    if (!m) continue;
    const beginMs = hmsToMs(m[1], m[2], m[3], m[4]);
    const endMs = hmsToMs(m[5], m[6], m[7], m[8]);
    const textLines = lines.slice(idx + 1).filter((l) => l.length > 0);
    const text = textLines.join("\n");
    blocks.push({ beginMs, endMs, text });
  }

  return blocks;
}

function hmsToMs(h: string, m: string, s: string, ms: string): number {
  const hours = parseInt(h, 10) || 0;
  const minutes = parseInt(m, 10) || 0;
  const seconds = parseInt(s, 10) || 0;
  const millis = parseInt(ms, 10) || 0;
  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis;
}

function formatTtmlTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milliseconds
    .toString()
    .padStart(3, "0")}`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}


