/**
 * LYL (Lyricify Lines) 格式解析器
 */

import type { LyricLine as RawLyricLine } from "@applemusic-like-lyrics/lyric";

/**
 * 检测是否为 LYL 格式
 * LYL 格式特征：第一行为 [type:LyricifyLines]，后续每行以 [startMs,endMs]text 格式
 */
export function isLylFormat(content: string): boolean {
  const lines = content.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) return false;
  
  // 检查第一行是否包含 [type:LyricifyLines]
  if (!lines[0].includes("[type:LyricifyLines]")) return false;
  
  // 检查后续行是否符合 [startMs,endMs]text 格式
  const sampleLines = lines.slice(1, Math.min(5, lines.length));
  return sampleLines.some((line) => {
    const lineRegex = /^\[(\d+),(\d+)\]/;
    return lineRegex.test(line.trim());
  });
}

/**
 * 解析 LYL 格式的歌词
 * 格式示例: [9997,12647]告訴我
 */
export function parseLyl(content: string): RawLyricLine[] {
  const lines = content.split("\n").filter((line) => line.trim().length > 0);
  const result: RawLyricLine[] = [];
  const warnings: string[] = [];

  const lylLineRegex = /^\[(\d+),(\d+)\](.*)$/;

  for (const [i, line] of lines.entries()) {
    const trimmedLine = line.trim();
    
    // 跳过空行和类型声明行
    if (trimmedLine.length === 0 || trimmedLine.includes("[type:LyricifyLines]")) {
      continue;
    }

    const match = lylLineRegex.exec(trimmedLine);
    if (match) {
      const startMs = parseInt(match[1]);
      const endMs = parseInt(match[2]);
      const text = match[3].trim();

      // 跳过空文本行
      if (text.length === 0) {
        continue;
      }

      // 检查时间是否有效
      if (endMs < startMs) {
        warnings.push(`第 ${i + 1} 行: 结束时间 ${endMs}ms 在开始时间 ${startMs}ms 之前。`);
      }

      // 创建一个单词，包含整行文本
      const words = [{
        text,
        startTime: startMs,
        endTime: endMs
      }];

      result.push({
        words,
        startTime: startMs,
        endTime: endMs
      });
    } else {
      warnings.push(`第 ${i + 1} 行: 未能识别的行格式。`);
    }
  }

  if (warnings.length > 0) {
    console.warn("LYL 解析警告:", warnings);
  }

  return result;
}

/**
 * 将 LYL 格式转换为 TTML 格式
 */
export function lylToTTML(content: string): string {
  const lines = parseLyl(content);
  
  let ttml = `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:tts="http://www.w3.org/ns/ttml#styling" xml:lang="en">
  <head>
    <metadata>
      <ttm:title>Converted LYL Lyrics</ttm:title>
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

    const spans = [];
    for (const word of line.words) {
      spans.push(
        `<span>${escapeXml(word.text)}</span>`
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

/**
 * 格式化时间为 TTML 格式 (HH:MM:SS.SSS)
 */
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
 * 转义 XML 特殊字符
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}