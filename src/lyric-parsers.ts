/**
 * 解析器工具函数，用于解析 ESLyRiC 和 LyRiC A2 格式的歌词文件
 */

import type { LyricLine as RawLyricLine } from "@applemusic-like-lyrics/lyric";

/**
 * 检测是否为 ESLyRiC 格式
 * ESLyRiC 格式特征：每行以时间戳[xx:xx.xxx]开头，后面跟着逐字时间和歌词
 */
export function isESLyRiCFormat(content: string): boolean {
  const lines = content.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) return false;
  const sampleLines = lines.slice(0, Math.min(5, lines.length));
  return sampleLines.some((line) => {
    const lineRegex =
      /^\[\d{2}:\d{2}\.\d{3}\][\u4e00-\u9fa5a-zA-Z0-9]\[\d{2}:\d{2}\.\d{3}\]/;
    return lineRegex.test(line);
  });
}

/**
 * 检测是否为 LyRiC A2 格式
 * LyRiC A2 格式特征：每行以时间戳[xx:xx.xxx]开头，后面跟着<xx:xx.xxx>和逐字歌词
 */
export function isLyRiCA2Format(content: string): boolean {
  const lines = content.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) return false;
  const sampleLines = lines.slice(0, Math.min(5, lines.length));
  return sampleLines.some((line) => {
    const lineRegex = /^\[\d{2}:\d{2}\.\d{3}\]<\d{2}:\d{2}\.\d{3}>/;
    return lineRegex.test(line);
  });
}

/**
 * 解析 ESLyRiC 格式的歌词
 * 格式示例: [00:09.997]告[00:10.596]訴[00:11.645]我[00:12.647]
 */
export function parseESLyRiC(content: string): RawLyricLine[] {
  const lines = content.split("\n").filter((line) => line.trim().length > 0);
  const result: RawLyricLine[] = [];

  for (const line of lines) {
    const lineStartMatch = line.match(/^\[(\d{2}):(\d{2})\.(\d{3})\]/);
    if (!lineStartMatch) continue;

    const lineStartTime =
      parseInt(lineStartMatch[1]) * 60 * 1000 +
      parseInt(lineStartMatch[2]) * 1000 +
      parseInt(lineStartMatch[3]);

    let remainingLine = line.substring(lineStartMatch[0].length);

    const words: any[] = [];
    let lastTime = lineStartTime;

    // 检查行起始时间与第一个词起始时间是否一致，如果不一致，以后者为准
    const firstWordTimeMatch = remainingLine.match(/\[(\d{2}):(\d{2})\.(\d{3})\]/);
    if (firstWordTimeMatch) {
      const firstWordTime =
        parseInt(firstWordTimeMatch[1]) * 60 * 1000 +
        parseInt(firstWordTimeMatch[2]) * 1000 +
        parseInt(firstWordTimeMatch[3]);
      if (lineStartTime !== firstWordTime) {
        lastTime = firstWordTime;
      }
    }

    const wordTimeRegex = /([^\[]+)\[(\d{2}):(\d{2})\.(\d{3})\]/g;
    let match;

    while ((match = wordTimeRegex.exec(remainingLine)) !== null) {
      const text = match[1];
      const nextTime =
        parseInt(match[2]) * 60 * 1000 +
        parseInt(match[3]) * 1000 +
        parseInt(match[4]);

      words.push({
        word: text,
        startTime: lastTime,
        endTime: nextTime,
      });

      lastTime = nextTime;
    }

    const lastWordMatch = remainingLine.match(/([^\[]+)$/);
    if (lastWordMatch) {
      const cleanText = lastWordMatch[1].replace(/\d{2}:\d{2}\.\d{3}\]$/, "");

      words.push({
        word: cleanText,
        startTime: lastTime,
        endTime: lastTime,
      });
    }

    if (words.length > 0) {
      words[0].word = (words[0].word ?? words[0].text ?? "").replace(/^\s+/, "");
      words[words.length - 1].word = (words[words.length - 1].word ?? words[words.length - 1].text ?? "").replace(/\s+$/, "");
      result.push({
        words,
        startTime: words[0].startTime,
        endTime: words[words.length - 1].endTime,
        translatedLyric: "",
        romanLyric: "",
        isBG: false,
        isDuet: false,
      } as unknown as RawLyricLine);
    }
  }

  return result;
}

/**
 * 解析 LyRiC A2 格式的歌词
 * 格式示例: [00:09.997]<00:09.997>告<00:10.596>訴<00:11.645>我<00:12.647>
 */
export function parseLyRiCA2(content: string): RawLyricLine[] {
  const lines = content.split("\n").filter((line) => line.trim().length > 0);
  const result: RawLyricLine[] = [];

  for (const line of lines) {
    const lineStartMatch = line.match(
      /^\[(\d{2}):(\d{2})\.(\d{3})\]<(\d{2}):(\d{2})\.(\d{3})>/
    );
    if (!lineStartMatch) continue;

    const lineStartTime =
      parseInt(lineStartMatch[4]) * 60 * 1000 +
      parseInt(lineStartMatch[5]) * 1000 +
      parseInt(lineStartMatch[6]);

    let remainingLine = line.substring(lineStartMatch[0].length);

    const words: any[] = [];
    let lastTime = lineStartTime;

    // 检查行起始时间与第一个词起始时间是否一致，如果不一致，以后者为准
    const firstWordTimeMatch = remainingLine.match(/<(\d{2}):(\d{2})\.(\d{3})>/);
    if (firstWordTimeMatch) {
      const firstWordTime =
        parseInt(firstWordTimeMatch[1]) * 60 * 1000 +
        parseInt(firstWordTimeMatch[2]) * 1000 +
        parseInt(firstWordTimeMatch[3]);
      if (lineStartTime !== firstWordTime) {
        lastTime = firstWordTime;
      }
    }

    const wordTimeRegex = /([^<]+)<(\d{2}):(\d{2})\.(\d{3})>/g;
    let match;

    while ((match = wordTimeRegex.exec(remainingLine)) !== null) {
      const text = match[1];
      const nextTime =
        parseInt(match[2]) * 60 * 1000 +
        parseInt(match[3]) * 1000 +
        parseInt(match[4]);

      words.push({
        word: text,
        startTime: lastTime,
        endTime: nextTime,
      });

      lastTime = nextTime;
    }

    const lastWordMatch = remainingLine.match(/([^<]+)$/);
    if (lastWordMatch) {
      const cleanText = lastWordMatch[1].replace(/\d{2}:\d{2}\.\d{3}>$/, "");

      words.push({
        word: cleanText,
        startTime: lastTime,
        endTime: lastTime,
      });
    }

    if (words.length > 0) {
      words[0].word = (words[0].word ?? words[0].text ?? "").replace(/^\s+/, "");
      words[words.length - 1].word = (words[words.length - 1].word ?? words[words.length - 1].text ?? "").replace(/\s+$/, "");
      result.push({
        words,
        startTime: words[0].startTime,
        endTime: words[words.length - 1].endTime,
        translatedLyric: "",
        romanLyric: "",
        isBG: false,
        isDuet: false,
      } as unknown as RawLyricLine);
    }
  }

  return result;
}

/**
 * 将 ESLyRiC 或 LyRiC A2 格式转换为 TTML 格式
 */
export function convertToTTML(lines: RawLyricLine[]): string {
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
    if (!line.words || line.words.length === 0) {
      throw new Error(`Empty line: ${JSON.stringify(line)}`);
    }
    const lastWord = line.words[line.words.length - 1];
    if (!lastWord.endTime) {
      lastWord.endTime = lastWord.startTime;
    }
    const endTime = formatTime(lastWord.endTime);

    ttml += `      <p begin="${startTime}" end="${endTime}" region="bottom">`;

    const spans = [];
    for (let i = 0; i < line.words.length; i++) {
      const word = line.words[i];
      const wordStart = formatTime(word.startTime);
      const wordEnd = formatTime(word.endTime);
      let text = (word as any).word ?? (word as any).text ?? "";
      if (i === 0) text = text.replace(/^\s+/, "");
      if (i === line.words.length - 1) text = text.replace(/\s+$/, "");
      spans.push(
        `<span begin="${wordStart}" end="${wordEnd}">${escapeXml(
          text
        )}</span>`
      );
    }
    ttml += spans.join("");

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
