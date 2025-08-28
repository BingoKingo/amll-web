/**
 * ASS 格式解析器
 */

import type { LyricLine as RawLyricLine } from "@applemusic-like-lyrics/lyric";

// 用于解析ASS时间戳字符串 (H:MM:SS.CS)
const ASS_TIME_REGEX = /(\d+):(\d{2}):(\d{2})\.(\d{2})/;

// 用于解析ASS文本中的 K 标签，支持 \k, \K, \kf, \ko 等（单位：厘秒）
const KARAOKE_TAG_REGEX = /\{\\k(?:[fo])?(\d+)}/g;

// 用于解析ASS文件中 [Events] 部分的 Dialogue 或 Comment 行
// 默认 Aegisub 格式：Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
const ASS_LINE_REGEX = /^(?<Type>Comment|Dialogue):\s*(?<Layer>\d+)\s*,\s*(?<Start>\d+:\d{2}:\d{2}\.\d{2})\s*,\s*(?<End>\d+:\d{2}:\d{2}\.\d{2})\s*,\s*(?<Style>[^,]*?)\s*,\s*(?<Actor>[^,]*?)\s*,\s*[^,]*\s*,\s*[^,]*\s*,\s*[^,]*\s*,\s*(?<Effect>[^,]*?)\s*,\s*(?<Text>.*?)\s*$/;

function stripOverrideTags(
  text: string,
  options: { collapseSpaces?: boolean; trim?: boolean } = {}
): string {
  const { collapseSpaces = false, trim = false } = options;
  // 去除 {\...} 覆盖标签；将 \N 和 \n 转为空格；将 \h 视为不换行空格
  let cleaned = text
    .replace(/\{[^}]*\}/g, "")
    .replace(/\\[Nn]/g, " ")
    .replace(/\\h/g, " ");

  if (collapseSpaces) {
    cleaned = cleaned.replace(/[ \t]+/g, " ");
  }
  if (trim) {
    cleaned = cleaned.trim();
  }
  return cleaned;
}

/**
 * 解析 ASS 时间字符串 (H:MM:SS.CS) 并转换为毫秒。
 */
function parseAssTime(timeStr: string): number {
  const match = timeStr.match(ASS_TIME_REGEX);
  if (!match) {
    throw new Error(`无效的时间格式: ${timeStr}`);
  }
  
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const s = parseInt(match[3], 10);
  const cs = parseInt(match[4], 10);
  
  return h * 3_600_000 + m * 60_000 + s * 1000 + cs * 10;
}

/**
 * 判断文本是否看起来像 ASS 格式
 */
export function isAssFormat(content: string): boolean {
  if (!content) return false;
  const head = content.slice(0, 2048);
  if (/\[Script Info\]/i.test(head) && /\[Events\]/i.test(content)) return true;
  // 退化判断：包含 Aegisub 标识或对话行
  if (/Aegisub/i.test(head)) return true;
  const lines = head.split(/\r?\n/).filter(Boolean).slice(0, 30);
  return lines.some((l) => /^(Comment|Dialogue):/.test(l));
}

/**
 * 解析 ASS 内容为 RawLyricLine[]（逐词时间来自 \k 标签）
 */
export function parseAss(assContent: string): RawLyricLine[] {
  const result: RawLyricLine[] = [];

  const lines = assContent.split(/\r?\n/);
  for (const rawLine of lines) {
    const match = rawLine.match(ASS_LINE_REGEX);
    if (!match || !match.groups) continue;
    const type = match.groups["Type"];
    if (type === "Comment") continue;

    const startMs = parseAssTime(match.groups["Start"]);
    const endMs = parseAssTime(match.groups["End"]);
    const textWithTags = match.groups["Text"] ?? "";

    // 解析 \k 标签
    const words: { text: string; startTime: number; endTime: number }[] = [];
    let cursor = startMs;
    const tagMatches = [...textWithTags.matchAll(KARAOKE_TAG_REGEX)];

    if (tagMatches.length === 0) {
      // 无逐词时间时，也保留文本内的空格，不进行 trim/collapse
      const cleaned = stripOverrideTags(textWithTags, {
        collapseSpaces: false,
        trim: false,
      });
      if (cleaned) {
        words.push({ text: cleaned, startTime: startMs, endTime: endMs });
      }
    } else {
      for (let i = 0; i < tagMatches.length; i++) {
        const tag = tagMatches[i];
        const nextTag = tagMatches[i + 1];
        const durCs = parseInt(tag[1] || "0", 10);
        const segStart = tag.index! + tag[0].length;
        const segEnd = nextTag ? nextTag.index! : textWithTags.length;
        const segRaw = textWithTags.slice(segStart, segEnd);
        // 分段文本保留行内空格，不进行 trim/collapse，避免边界空格丢失
        const cleaned = stripOverrideTags(segRaw, {
          collapseSpaces: false,
          trim: false,
        });
        const durationMs = Math.max(0, durCs * 10);
        const segEndTime = cursor + durationMs;
        if (cleaned) {
          words.push({ text: cleaned, startTime: cursor, endTime: segEndTime });
        }
        cursor = segEndTime;
      }

      // 如果最后一个词结束时间小于该行 End，则可选择延长最后一个词到行结束
      if (words.length > 0 && words[words.length - 1].endTime < endMs) {
        words[words.length - 1].endTime = endMs;
      }
    }

    if (words.length > 0) {
      result.push({
        words,
        startTime: words[0].startTime,
        endTime: words[words.length - 1].endTime,
      });
    }
  }

  return result;
}

function formatTime(ms: number): string {
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
/**
 * 将 ASS 格式的歌词转换为 TTML 格式。
 */
export function assToTTML(assContent: string): string {
  const lines = parseAss(assContent);

  let ttml = `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:tts="http://www.w3.org/ns/ttml#styling" xml:lang="en">
  <head>
    <metadata>
      <ttm:title>Converted Lyrics</ttm:title>
    </metadata>
    <styling>
      <style xml:id="normal" tts:fontFamily="Arial" tts:fontSize="100%" tts:textAlign="center"/>
    </styling>
    <layout>
      <region xml:id="bottom" tts:origin="0% 0%" tts:extent="100% 100%" tts:textAlign="center" tts:displayAlign="after"/>
    </layout>
  </head>
  <body>
    <div>
`;

  for (const line of lines) {
    const startTime = formatTime(line.startTime);
    const endTime = formatTime(line.endTime);
    ttml += `      <p begin="${startTime}" end="${endTime}" region="bottom">`;
    const spans: string[] = [];
    for (const word of line.words) {
      spans.push(
        `<span begin="${formatTime(word.startTime)}" end="${formatTime(
          word.endTime
        )}">${escapeXml(word.text)}</span>`
      );
    }
    ttml += `${spans.join("")}`;
    ttml += `</p>\n`;
  }

  ttml += `    </div>
  </body>
</tt>`;

  return ttml;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}