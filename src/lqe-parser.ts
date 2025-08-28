/**
 * LQE 格式解析器
 */

import type { LyricLine as RawLyricLine } from "@applemusic-like-lyrics/lyric";
import { parseLrc } from "@applemusic-like-lyrics/lyric";

// 解析状态枚举
enum ParseState {
  Header,
  Lyrics,
  Translation,
  Pronunciation
}

// 歌词格式枚举
enum LyricFormat {
  Lrc,
  Lys,
}

// 解析 LQE 格式内容
export function parseLqe(content: string): RawLyricLine[] {
  if (!content.trim().startsWith("[Lyricify Quick Export]")) {
    throw new Error("文件缺少 [Lyricify Quick Export] 头部标记");
  }

  let mainLines: RawLyricLine[] = [];
  let translationLines: RawLyricLine[] = [];
  let pronunciationLines: RawLyricLine[] = [];
  const metadata: Record<string, string[]> = {};

  let currentState = ParseState.Header;
  let currentBlockContent = "";
  let currentBlockFormat = LyricFormat.Lrc;
  let currentBlockLang: string | null = null;

  const lines = content.split(/\r?\n/);
  
  // 检查是否存在歌词区块
  const hasLyricsBlock = lines.some(line => line.startsWith("[lyrics:"));
  if (!hasLyricsBlock) {
    console.warn("警告: LQE 文件中没有找到 [lyrics:] 区块，尝试作为普通 LRC 解析");
    // 如果没有明确的歌词区块，尝试将整个内容作为 LRC 解析
    try {
      const lrcLines = parseLrc(content);
      if (lrcLines.length > 0) {
        return lrcLines;
      }
    } catch (e) {
      console.error("作为普通 LRC 解析失败:", e);
    }
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 处理元数据
    if (line.startsWith("[") && line.endsWith("]")) {
      const match = line.match(/^\[(.*?):(.*)\]$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        
        if (!["lyrics", "translation", "pronunciation", "Lyricify Quick Export", "version"].includes(key)) {
          if (!metadata[key]) {
            metadata[key] = [];
          }
          metadata[key].push(value);
        }
      }
    }

    // 处理区块开始
    if (line.startsWith("[lyrics:") || line.startsWith("[translation:") || line.startsWith("[pronunciation:")) {
      
      // 处理前一个区块
      if (currentBlockContent.trim()) {
        const parsedLines = processBlock(currentBlockContent, currentBlockFormat);
        
        switch (currentState) {
          case ParseState.Lyrics:
            mainLines = parsedLines;
            break;
          case ParseState.Translation:
            translationLines = parsedLines;
            break;
          case ParseState.Pronunciation:
            pronunciationLines = parsedLines;
            break;
        }
      }
      
      // 重置并准备新区块
      currentBlockContent = "";
      const { format, lang } = parseSectionHeader(line);
      currentBlockFormat = format;
      currentBlockLang = lang;
      
      if (line.startsWith("[lyrics:")) {
        currentState = ParseState.Lyrics;
      } else if (line.startsWith("[translation:")) {
        currentState = ParseState.Translation;
      } else {
        currentState = ParseState.Pronunciation;
      }
    } else if (!line.startsWith("[Lyricify Quick Export]") && !line.startsWith("[version:")) {
      // 收集当前区块内容，忽略头部标记和版本信息
      currentBlockContent += line + "\n";
    }
  }

  // 处理最后一个区块
  if (currentBlockContent.trim()) {
    const parsedLines = processBlock(currentBlockContent, currentBlockFormat);
    
    switch (currentState) {
      case ParseState.Lyrics:
        mainLines = parsedLines;
        break;
      case ParseState.Translation:
        translationLines = parsedLines;
        break;
      case ParseState.Pronunciation:
        pronunciationLines = parsedLines;
        break;
    }
  }

  // 如果主歌词为空但有翻译或注音，将翻译或注音作为主歌词
  if (mainLines.length === 0) {
    if (translationLines.length > 0) {
      mainLines = translationLines;
      translationLines = [];
    } else if (pronunciationLines.length > 0) {
      mainLines = pronunciationLines;
      pronunciationLines = [];
    }
  }

  // 合并翻译和注音（简化版本，仅按时间匹配）
  if (translationLines.length > 0 || pronunciationLines.length > 0) {
    mainLines = mergeTracks(mainLines, translationLines, pronunciationLines);
  }

  return mainLines;
}

/**
 * 解析区块头部，获取格式和语言信息
 */
function parseSectionHeader(headerLine: string): { format: LyricFormat; lang: string | null } {
  let format = LyricFormat.Lrc;
  let lang = null;
  
  const match = headerLine.match(/^\[(.*?):(.*)\]$/);
  if (match) {
    const params = match[2].split(",").map(p => p.trim());
    
    for (const param of params) {
      const [key, value] = param.split("@").map(p => p.trim());
      
      if (key === "format") {
        switch (value.toLowerCase()) {
          case "lrc":
            format = LyricFormat.Lrc;
            break;
          case "ass":
            format = LyricFormat.Ass;
            break;
          case "yrc":
            format = LyricFormat.Yrc;
            break;
          case "lys":
            format = LyricFormat.Lys;
            break;
          case "qrc":
            format = LyricFormat.Qrc;
            break;
          default:
            console.warn(`未知的 LQE 区块格式 '${value}', 将回退到 LRC`);
            format = LyricFormat.Lrc;
        }
      } else if (key === "language") {
        lang = value;
      }
    }
  }
  
  return { format, lang };
}

/**
 * 处理区块内容，根据格式解析歌词
 */
function processBlock(content: string, format: LyricFormat): RawLyricLine[] {
  if (!content.trim()) {
    return [];
  }
  
  try {
    // 确保内容以换行符结尾，避免解析问题
    const normalizedContent = content.endsWith('\n') ? content : content + '\n';
    
    
    // 目前仅支持 LRC 格式，其他格式可以根据需要扩展
    switch (format) {
      case LyricFormat.Lrc:
        const lines = parseLrc(normalizedContent);
        
        // 检查解析结果是否有效
        if (lines.length === 0) {
          console.warn('LRC 解析结果为空，原始内容:', normalizedContent.substring(0, 200) + '...');
        } else {
          // 检查第一行是否有有效内容
          const firstLine = lines[0];
        }
        
        return lines;
      default:
        console.warn(`不支持的格式 ${format}，将尝试作为 LRC 解析`);
        return parseLrc(normalizedContent);
    }
  } catch (error) {
    console.error('处理歌词区块时出错:', error);
    return [];
  }
}

/**
 * 合并主歌词、翻译和注音
 * 增强版本，提高匹配精度和容错性
 */
function mergeTracks(
  mainLines: RawLyricLine[],
  translationLines: RawLyricLine[],
  pronunciationLines: RawLyricLine[]
): RawLyricLine[] {
  
  if (mainLines.length === 0) {
    console.warn("主歌词为空，无法合并轨道");
    // 如果主歌词为空但有翻译，将翻译作为主歌词
    if (translationLines.length > 0) {
      return translationLines;
    }
    // 如果主歌词为空但有注音，将注音作为主歌词
    if (pronunciationLines.length > 0) {
      return pronunciationLines;
    }
    return [];
  }
  
  // 创建结果数组
  const result: RawLyricLine[] = JSON.parse(JSON.stringify(mainLines)); // 深拷贝
  
  // 为每行添加翻译和注音属性
  for (let i = 0; i < result.length; i++) {
    const mainLine = result[i];
    const mainStartTime = mainLine.startTime;
    const mainEndTime = mainLine.endTime;
    
    // 确保每行都有 words 数组
    if (!mainLine.words || !Array.isArray(mainLine.words) || mainLine.words.length === 0) {
      console.warn(`第 ${i+1} 行缺少 words 数组，添加默认值`);
      mainLine.words = [{
        text: `[行 ${i+1}]`,
        startTime: mainStartTime,
        endTime: mainEndTime || (mainStartTime + 1000)
      }];
    }
    
    // 查找最接近的翻译
    if (translationLines.length > 0) {
      // 首先尝试精确匹配时间
      let exactMatch = translationLines.find(line => 
        Math.abs(line.startTime - mainStartTime) < 100 && 
        (Math.abs(line.endTime - mainEndTime) < 100 || !mainEndTime || !line.endTime)
      );
      
      if (exactMatch) {
        (mainLine as any).translatedLyric = exactMatch.words
          .map(w => w.text)
          .join("");
      } else {
        // 找不到精确匹配时，查找最接近的翻译
        let closestTranslation = translationLines[0];
        let minDiff = Math.abs(closestTranslation.startTime - mainStartTime);
        
        for (const transLine of translationLines) {
          const diff = Math.abs(transLine.startTime - mainStartTime);
          if (diff < minDiff) {
            minDiff = diff;
            closestTranslation = transLine;
          }
        }
        
        // 放宽时间差的接受范围（从1秒增加到2秒）
        if (minDiff < 2000) {
          console.log(`第 ${i+1} 行找到接近的翻译，时间差: ${minDiff}ms`);
          (mainLine as any).translatedLyric = closestTranslation.words
            .map(w => w.text)
            .join("");
        }
      }
    }
    
    // 查找最接近的注音
    if (pronunciationLines.length > 0) {
      // 首先尝试精确匹配时间
      let exactMatch = pronunciationLines.find(line => 
        Math.abs(line.startTime - mainStartTime) < 100 && 
        (Math.abs(line.endTime - mainEndTime) < 100 || !mainEndTime || !line.endTime)
      );
      
      if (exactMatch) {
        (mainLine as any).romanLyric = exactMatch.words
          .map(w => w.text)
          .join("");
      } else {
        // 找不到精确匹配时，查找最接近的注音
        let closestPronunciation = pronunciationLines[0];
        let minDiff = Math.abs(closestPronunciation.startTime - mainStartTime);
        
        for (const pronLine of pronunciationLines) {
          const diff = Math.abs(pronLine.startTime - mainStartTime);
          if (diff < minDiff) {
            minDiff = diff;
            closestPronunciation = pronLine;
          }
        }
        
        // 放宽时间差的接受范围（从1秒增加到2秒）
        if (minDiff < 2000) {
          (mainLine as any).romanLyric = closestPronunciation.words
            .map(w => w.text)
            .join("");
        }
      }
    }
    
    // 确保每个单词都有有效的开始和结束时间
    for (const word of mainLine.words) {
      if (isNaN(word.startTime) || word.startTime < 0) {
        console.warn(`单词 "${word.text}" 的开始时间无效，设为行的开始时间`);
        word.startTime = mainStartTime;
      }
      
      if (isNaN(word.endTime) || word.endTime <= word.startTime) {
        console.warn(`单词 "${word.text}" 的结束时间无效，设为开始时间 + 500ms`);
        word.endTime = word.startTime + 500;
      }
    }
  }
  
  return result;
}

/**
 * 判断文本是否看起来像 LQE 格式
 */
export function isLqeFormat(content: string): boolean {
  if (!content) return false;
  const head = content.slice(0, 2048);
  return head.includes("[Lyricify Quick Export]");
}

/**
 * 将 LQE 格式转换为 TTML 格式
 */
export function lqeToTTML(content: string): string {
  
  try {
    const lines = parseLqe(content);
    
    if (lines.length === 0) {
      console.warn("警告: 解析结果为空，尝试直接作为 LRC 解析");
      try {
        const lrcLines = parseLrc(content);
        if (lrcLines.length > 0) {
          return generateTTML(lrcLines);
        }
      } catch (e) {
        console.error("作为普通 LRC 解析失败:", e);
      }
    }
    
    return generateTTML(lines);
  } catch (error) {
    console.error("LQE 转换 TTML 时出错:", error);
    
    // 出错时尝试作为普通 LRC 解析
    try {
      const lrcLines = parseLrc(content);
      if (lrcLines.length > 0) {
        return generateTTML(lrcLines);
      }
    } catch (e) {
      console.error("作为普通 LRC 解析也失败:", e);
    }
    
    // 如果所有尝试都失败，返回一个空的但有效的 TTML
    return `<?xml version="1.0" encoding="utf-8"?>
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
      <p begin="00:00:00.000" end="00:00:01.000" region="bottom">
        <span begin="00:00:00.000" end="00:00:01.000">解析歌词失败</span>
      </p>
    </div>
  </body>
</tt>`;
  }
}

/**
 * 生成 TTML 内容
 */
function generateTTML(lines: RawLyricLine[]): string {
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
    // 确保行有有效的开始和结束时间
    if (isNaN(line.startTime) || line.startTime < 0) {
      console.warn("警告: 行的开始时间无效，设为默认值 0");
      line.startTime = 0;
    }
    
    // 如果结束时间无效，设置为开始时间后的 1 秒
    if (isNaN(line.endTime) || line.endTime <= line.startTime) {
      console.warn("警告: 行的结束时间无效，设为开始时间 + 1 秒");
      line.endTime = line.startTime + 1000;
    }
    
    const startTime = formatTime(line.startTime);
    const endTime = formatTime(line.endTime);
    
    ttml += `      <p begin="${startTime}" end="${endTime}" region="bottom">`;
    
    const spans = [];
    
    // 确保行有单词
    if (!line.words || line.words.length === 0) {
      console.warn("警告: 行没有单词，添加一个默认单词");
      // 添加一个默认单词，使用行的开始和结束时间
      spans.push(
        `<span begin="${startTime}" end="${endTime}">[无歌词]</span>`
      );
    } else {
      for (const word of line.words) {
        // 确保单词有有效的开始和结束时间
        const wordStartTime = isNaN(word.startTime) ? line.startTime : word.startTime;
        const wordEndTime = isNaN(word.endTime) || word.endTime <= wordStartTime ? 
                           (wordStartTime + 500) : word.endTime;
        
        // 确保单词有文本
        const wordText = word.text ? word.text : "[空]";
        
        spans.push(
          `<span begin="${formatTime(wordStartTime)}" end="${formatTime(wordEndTime)}">${escapeXml(wordText)}</span>`
        );
      }
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