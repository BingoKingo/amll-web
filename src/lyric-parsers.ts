/**
 * 解析器工具函数，用于解析多种歌词格式，包括 ESLyRiC、LyRiC A2、SPL 和 Walaoke
 */

import type { LyricLine as RawLyricLine } from "@applemusic-like-lyrics/lyric";

/**
 * 临时结构，用于在解析时暂存一个逻辑块的信息。
 */
interface SplBlock {
  startTimes: number[];
  mainText: string;
  translations: string[];
  explicitEndMs?: number;
}

/**
 * 解析时间戳字符串（例如 "05:20.22"）到毫秒。
 */
function parseTimestampMs(tsStr: string): number {
  const parts: string[] = tsStr.split(/[:.]/);
  if (parts.length < 2 || parts.length > 3) {
    throw new Error(`Invalid timestamp format: ${tsStr}`);
  }
  
  let minutes: number, seconds: number, milliseconds: number;
  
  if (parts.length === 3) {
    minutes = parseInt(parts[0]);
    seconds = parseInt(parts[1]);
    
    // 处理毫秒部分
    const fractionStr = parts[2];
    milliseconds = 0;
    
    switch (fractionStr.length) {
      case 1:
        milliseconds = parseInt(fractionStr) * 100;
        break;
      case 2:
        milliseconds = parseInt(fractionStr) * 10;
        break;
      case 3:
        milliseconds = parseInt(fractionStr);
        break;
      default:
        // 对于超过3位的小数，只取前三位
        milliseconds = parseInt(fractionStr.substring(0, 3));
        break;
    }
  } else {
    // 只有分钟和秒
    minutes = parseInt(parts[0]);
    seconds = parseInt(parts[1]);
    milliseconds = 0;
  }
  
  return (minutes * 60 + seconds) * 1000 + milliseconds;
}

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
 * 检测是否为 SPL (Salt Player Lyrics) 格式
 * SPL 格式特征：每行以多个时间戳[...]开头，支持尖括号<>内的时间戳
 */
export function isSPLFormat(content: string): boolean {
  const lines = content.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) return false;
  const sampleLines = lines.slice(0, Math.min(5, lines.length));
  return sampleLines.some((line) => {
    const lineRegex = /^((\[\d{1,3}:\d{1,2}(?:\.\d{1,6})?\])+)(.*)$/;
    return lineRegex.test(line.trim());
  });
}

/**
 * 检测是否为 Walaoke 格式
 * Walaoke 格式特征：行首包含多人对唱标记（W:、F:、D: 或 v1:、v2:）
 */
export function isWalaokeFormat(content: string): boolean {
  const lines = content.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) return false;
  const sampleLines = lines.slice(0, Math.min(5, lines.length));
  return sampleLines.some((line) => {
    // 检测两种Walaoke格式：
    // 1. 歌手标记在前：v1:[00:00.629]
    // 2. 时间戳在前：[00:00.629]v1:
    const lineRegex1 = /^(W|F|D|v1|v2):\s*\[\d{2}:\d{2}\.\d{3}\]/;
    const lineRegex2 = /^\[\d{2}:\d{2}\.\d{3}\]\s*(W|F|D|v1|v2):/;
    return lineRegex1.test(line.trim()) || lineRegex2.test(line.trim());
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
 * 解析 SPL 格式的歌词
 * SPL (Salt Player Lyrics) 格式支持多个时间戳和逐字歌词
 */
export function parseSPL(content: string): string {
  const lines = content.split("\n").filter((line) => line.trim().length > 0);
  const result: RawLyricLine[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    // 匹配行首时间戳
    const lineStartMatch = trimmedLine.match(/^\[(\d{1,3}):(\d{1,2})(?:\.(\d{1,6}))?\]/);
    if (!lineStartMatch) continue;
    
    // 计算行起始时间
    const minutes = parseInt(lineStartMatch[1]);
    const seconds = parseInt(lineStartMatch[2]);
    const milliseconds = lineStartMatch[3] ? parseInt(lineStartMatch[3].padEnd(3, '0').slice(0, 3)) : 0;
    let lineStartTime = minutes * 60000 + seconds * 1000 + milliseconds;
    
    // 提取行首时间戳后的内容
    let remainingLine = trimmedLine.substring(lineStartMatch[0].length);
    
    const words: any[] = [];
    let lastTime = lineStartTime;
    
    // 检查是否有行间时间戳格式 <00:00.00> 或 [00:00.00]
    const hasInlineTimestamps = remainingLine.includes('<') || remainingLine.includes('[');
    
    if (hasInlineTimestamps) {
      // 处理行间时间戳格式
      
      // 方法1：先尝试匹配所有的文字-时间戳组合，支持尖括号和方括号两种格式
      const inlineMatchRegex = /([^<\[]+?)[<\[](\d{2}):(\d{2})\.(\d{2,3})[>\]]/g;
      let inlineMatch;
      let hasMatches = false;
      
      // 记录所有匹配结果
      const matches: Array<{word: string, time: number}> = [];
      
      while ((inlineMatch = inlineMatchRegex.exec(remainingLine)) !== null) {
        hasMatches = true;
        const word = inlineMatch[1].trim();
        const time = parseTimestampMs(`${inlineMatch[2]}:${inlineMatch[3]}.${inlineMatch[4]}`);
        
        matches.push({ word, time });
      }
      
      if (hasMatches && matches.length > 0) {
        // 处理所有匹配到的词
        for (let i = 0; i < matches.length; i++) {
          const match = matches[i];
          const nextTime = i < matches.length - 1 ? matches[i + 1].time : match.time + 1000; // 默认持续时间
          
          words.push({
            word: match.word,
            startTime: lastTime,
            endTime: match.time
          });
          
          lastTime = match.time;
        }
        
        // 检查行尾是否有额外的时间戳 (例如 <00:00.00> 或 [00:00.00])
        const endTimestampMatch = remainingLine.match(/[<\[](\d{2}):(\d{2})\.(\d{2,3})[>\]]$/);
        if (endTimestampMatch) {
          const endTime = parseTimestampMs(`${endTimestampMatch[1]}:${endTimestampMatch[2]}.${endTimestampMatch[3]}`);
          
          // 如果最后一个词存在，更新其结束时间
          if (words.length > 0) {
            words[words.length - 1].endTime = endTime;
          }
        }
      } else {
        // 方法2：如果没有匹配到完整的文字-时间戳组合，尝试另一种解析方式
        // 先匹配第一个可能的时间戳，支持尖括号和方括号两种格式
        const firstInlineMatch = remainingLine.match(/[<\[](\d{2}):(\d{2})\.(\d{2,3})[>\]]/);
        if (firstInlineMatch && firstInlineMatch.index !== undefined) {
          // 提取第一个字和时间
          const firstWord = remainingLine.substring(0, firstInlineMatch.index).trim();
          if (firstWord) {
            words.push({
              word: firstWord,
              startTime: lastTime,
              endTime: parseTimestampMs(`${firstInlineMatch[1]}:${firstInlineMatch[2]}.${firstInlineMatch[3]}`)
            });
            lastTime = words[words.length - 1].endTime;
          }
          
          // 继续处理剩余的时间戳和文本
          remainingLine = remainingLine.substring(firstInlineMatch.index + firstInlineMatch[0].length);
          
          // 再次尝试匹配后续的文字和时间戳组合
          let subsequentMatch;
          while ((subsequentMatch = inlineMatchRegex.exec(remainingLine)) !== null) {
            const word = subsequentMatch[1].trim();
            const time = parseTimestampMs(`${subsequentMatch[2]}:${subsequentMatch[3]}.${subsequentMatch[4]}`);
            
            words.push({
              word,
              startTime: lastTime,
              endTime: time
            });
            
            lastTime = time;
          }
        }
        
        // 处理最后一个时间戳后的文本
        const lastTextMatch = remainingLine.match(/([^<]+)$/);
        if (lastTextMatch) {
          const lastWord = lastTextMatch[1].trim();
          if (lastWord) {
            words.push({
              word: lastWord,
              startTime: lastTime,
              endTime: lastTime + 1000 // 为最后一个词设置默认持续时间
            });
          }
        }
      }
    } else {
      // 没有行间时间戳，按整行处理
      const text = remainingLine.trim();
      if (text) {
        words.push({
          word: text,
          startTime: lineStartTime,
          endTime: lineStartTime + 1000 // 为整行设置默认持续时间
        });
      }
    }
    
    // 如果有解析出的歌词词元，添加到结果中
    if (words.length > 0) {
      // 清理首尾空格
      words[0].word = (words[0].word ?? '').replace(/^\s+/, '');
      words[words.length - 1].word = (words[words.length - 1].word ?? '').replace(/\s+$/, '');
      
      result.push({
        words,
        startTime: words[0].startTime,
        endTime: words[words.length - 1].endTime,
        translatedLyric: "",
        romanLyric: "",
        isBG: false,
        isDuet: false
      } as unknown as RawLyricLine);
    }
  }
  
  // 按时间排序
  result.sort((a, b) => a.startTime - b.startTime);
  
  // 转换为TTML
  return convertToTTML(result);
}

/**
 * 解析 Walaoke 格式的歌词
 * Walaoke 格式支持多人对唱标记（W:、F:、D: 或 v1:、v2:）
 */
export function parseWalaoke(content: string): string {
  const lines = content.split("\n").filter((line) => line.trim().length > 0);
  const result: RawLyricLine[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    // 匹配两种Walaoke格式，支持尖括号和方括号时间戳：
    // 1. 歌手标记在前：v1:[00:00.629]<00:00.629>ずっ<00:00.950>と <00:01.564>
    // 2. 时间戳在前：[00:00.629]v1:<00:00.629>ずっ<00:00.950>と <00:01.564>
    // 3. 支持方括号时间戳：v1:[00:00.629][00:00.629]ずっ[00:00.950]と [00:01.564]
    // 4. 支持两位毫秒：v1:[00:00.62]<00:00.62>ずっ<00:00.95>と <00:01.56>
    const match1 = trimmedLine.match(/^(W|F|D|v1|v2):\s*[<\[](\d{2}):(\d{2})\.(\d{2,3})[>\]](.*)$/);
    const match2 = trimmedLine.match(/^[<\[](\d{2}):(\d{2})\.(\d{2,3})[>\]]\s*(W|F|D|v1|v2):(.*)$/);
    
    let match = match1;
    let isTimestampFirstFormat = false;
    
    if (match2) {
      match = match2;
      isTimestampFirstFormat = true;
    }
    
    if (match) {
      let singerTag, minutes, seconds, milliseconds, text;
      
      if (isTimestampFirstFormat) {
        // match2格式：[, minutes, seconds, milliseconds, singerTag, text]
        [, minutes, seconds, milliseconds, singerTag, text] = match;
      } else {
        // match1格式：[, singerTag, minutes, seconds, milliseconds, text]
        [, singerTag, minutes, seconds, milliseconds, text] = match;
      }
      const lineStartTime = parseInt(minutes) * 60000 + parseInt(seconds) * 1000 + parseInt(milliseconds);
      
      // 处理行内时间戳格式 <00:00.000>
      let remainingText = text;
      const words: any[] = [];
      let lastTime = lineStartTime;
      
      // 检查是否有行内时间戳（支持尖括号和方括号格式）
      const hasInlineTimestamps = remainingText.includes('<') || remainingText.includes('[');
      
      if (hasInlineTimestamps) {
        // 解析行内时间戳格式，支持：<00:00.629> 或 [00:00.629]
        // 首先检查开头是否有时间戳
        const firstTimestampMatch = remainingText.match(/^[<\[](\d{2}):(\d{2})\.(\d{2,3})[>\]]/);
        if (firstTimestampMatch) {
          // 设置第一个词的开始时间
          lastTime = parseTimestampMs(`${firstTimestampMatch[1]}:${firstTimestampMatch[2]}.${firstTimestampMatch[3]}`);
          remainingText = remainingText.substring(firstTimestampMatch[0].length);
        }
        
        // 解析文字和时间戳组合，包括行尾时间戳（支持尖括号和方括号）
        const inlineMatchRegex = /([^<\[]*?)[<\[](\d{2}):(\d{2})\.(\d{2,3})[>\]]/g;
        let inlineMatch;
        let lastMatchEnd = 0;
        
        while ((inlineMatch = inlineMatchRegex.exec(remainingText)) !== null) {
          const wordText = inlineMatch[1].trim();
          const wordTime = parseTimestampMs(`${inlineMatch[2]}:${inlineMatch[3]}.${inlineMatch[4]}`);
          
          // 如果有文本内容，添加到words数组
          if (wordText) {
            words.push({
              word: wordText,
              startTime: lastTime,
              endTime: wordTime
            });
            lastTime = wordTime;
          }
          
          lastMatchEnd = inlineMatch.index + inlineMatch[0].length;
        }
        
        // 处理最后一个时间戳后的文本（如果有）
        let remainingAfterLastMatch = remainingText.substring(lastMatchEnd).trim();
        
        // 检查剩余文本是否包含行尾时间戳（支持尖括号和方括号）
        const endTimestampMatch = remainingAfterLastMatch.match(/^(.*)[<\[](\d{2}):(\d{2})\.(\d{2,3})[>\]]$/);
        
        if (endTimestampMatch) {
          // 有行尾时间戳的情况
          const lastWord = endTimestampMatch[1].trim();
          const endTime = parseTimestampMs(`${endTimestampMatch[2]}:${endTimestampMatch[3]}.${endTimestampMatch[4]}`);
          
          if (lastWord) {
            words.push({
              word: lastWord,
              startTime: lastTime,
              endTime: endTime
            });
          } else if (words.length > 0) {
            // 如果没有文本但有时间戳，更新最后一个词的结束时间
            words[words.length - 1].endTime = endTime;
          }
        } else {
          // 没有行尾时间戳的情况
          if (remainingAfterLastMatch) {
            words.push({
              word: remainingAfterLastMatch,
              startTime: lastTime,
              endTime: lastTime + 1000
            });
          }
        }
      } else {
        // 没有行内时间戳，按整行处理
        const cleanText = text.trim();
        if (cleanText) {
          words.push({
            word: cleanText,
            startTime: lineStartTime,
            endTime: lineStartTime + 1000
          });
        }
      }
      
      // 根据歌手标记设置isDuet标志和agent信息
      let isDuet = false;
      let agent = '';
      
      switch (singerTag) {
        case 'W':
          // W: 添加第一声部标记
          if (words.length > 0) {
            words[0].word = `[第一声部] ${words[0].word}`;
          }
          break;
        case 'F':
          // F: 添加第二声部标记
          if (words.length > 0) {
            words[0].word = `[第二声部] ${words[0].word}`;
          }
          break;
        case 'D':
          // D: 添加合唱标记
          if (words.length > 0) {
            words[0].word = `[合唱] ${words[0].word}`;
          }
          break;
        case 'v1':
          // v1: 设置为Duet歌词，agent为v1
          isDuet = true;
          agent = 'v1';
          break;
        case 'v2':
          // v2: 设置为Duet歌词，agent为v2
          isDuet = true;
          agent = 'v2';
          break;
      }
      
      // 如果有解析出的歌词词元，添加到结果中
      if (words.length > 0) {
        // 清理首尾空格
        words[0].word = (words[0].word ?? '').replace(/^\s+/, '');
        words[words.length - 1].word = (words[words.length - 1].word ?? '').replace(/\s+$/, '');
        
        result.push({
          words,
          startTime: words[0].startTime,
          endTime: words[words.length - 1].endTime,
          translatedLyric: "",
          romanLyric: "",
          isBG: false,
          isDuet: isDuet,
          agent: agent
        } as unknown as RawLyricLine);
      }
    }
  }
  
  // 按时间排序
  result.sort((a, b) => a.startTime - b.startTime);
  
  // 转换为TTML
  return convertToTTML(result);
}

/**
 * 解析 LyRiC A2 格式的歌词
 * 格式示例: [00:12.345]<00:12.345>歌词内容<00:13.456>更多歌词
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

    // 检查是否有agent属性（用于对唱标记）
    const agentAttr = (line as any).agent ? ` ttm:agent="${(line as any).agent}"` : '';
    ttml += `      <p begin="${startTime}" end="${endTime}" region="bottom"${agentAttr}>`;

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