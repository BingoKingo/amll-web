import { t } from "../i18n";
import type { LyricLine as RawLyricLine } from "@applemusic-like-lyrics/lyric";
import type { LyricLine } from "@applemusic-like-lyrics/core";
import type { LyricLineMouseEvent } from "@applemusic-like-lyrics/core";
import { DomLyricPlayer as BaseDomLyricPlayer } from "@applemusic-like-lyrics/core";
import { parseLrc, parseTTML, parseYrc, parseLys, parseQrc } from "@applemusic-like-lyrics/lyric";
import {
  isESLyRiCFormat,
  isLyRiCA2Format,
  isSPLFormat,
  isWalaokeFormat,
  parseESLyRiC,
  parseLyRiCA2,
  parseSPL,
  parseWalaoke,
  convertToTTML
} from "./lyric-parsers";
import { isAssFormat, parseAss, assToTTML } from "./ass-parser";
import { isLqeFormat, parseLqe, lqeToTTML } from "./lqe-parser";
import { isLylFormat, parseLyl, lylToTTML } from "./lyl-parser";
import { isSrtFormat, parseSrt, srtToTTML } from "./srt-parser";

// 歌词播放器配置接口
export interface LyricPlayerConfig {
  playerContainer?: HTMLElement;
  lyricsPanel: HTMLElement;
  albumSidePanel: HTMLElement | null;
  audio: HTMLAudioElement;
  showStatus: (message: string, isError?: boolean) => void;
  updateFileInputDisplay: (inputId: string, file: File | string) => void;
  showTranslatedLyricCheckbox?: HTMLInputElement | null;
  showRomanLyricCheckbox?: HTMLInputElement | null;
  swapLyricPositionsCheckbox?: HTMLInputElement | null;
  swapDuetsPositionsCheckbox?: HTMLInputElement | null;
}

// 歌词相关状态接口
export interface LyricState {
  lyricUrl: string;
  lyricDelay: number;
  lyricAlignPosition: number;
  hidePassedLyrics: boolean;
  enableLyricBlur: boolean;
  enableLyricScale: boolean;
  enableLyricSpring: boolean;
  lyricAlignAnchor: 'center' | 'top' | 'bottom';
  showTranslatedLyric: boolean;
  showRomanLyric: boolean;
  swapLyricPositions: boolean;
  showbgLyric: boolean;
  swapDuetsPositions: boolean;
  advanceLyricTiming: boolean;
  singleLyrics: boolean;
  posYSpringMass: number;
  posYSpringDamping: number;
  posYSpringStiffness: number;
  posYSpringSoft: boolean;
  scaleSpringMass: number;
  scaleSpringDamping: number;
  scaleSpringStiffness: number;
  scaleSpringSoft: boolean;
  wordFadeWidth: number;
}

/**
 * 歌词播放器类，封装所有歌词相关的功能
 */
export class LyricPlayer {
  private lyricPlayer!: BaseDomLyricPlayer;
  private hasLyrics = false;
  private originalLyricLines: any[] = [];
  private processedLyricLines: LyricLine[] = [];
  private lyricFile: HTMLInputElement | null = null;
  private lyricFileBtn: HTMLElement | null = null;
  private lyricsPanel: HTMLElement;
  private lyricAlignPosition: HTMLInputElement | null = null;
  private lyricAlignPositionValue: HTMLElement | null = null;
  private hidePassedLyricsCheckbox: HTMLInputElement | null = null;
  private enableLyricBlur: HTMLInputElement | null = null;
  private enableLyricScale: HTMLInputElement | null = null;
  private enableLyricSpring: HTMLInputElement | null = null;
  private showbgLyricCheckbox: HTMLInputElement | null = null;
  private advanceLyricTimingCheckbox: HTMLInputElement | null = null;
  private singleLyricsCheckbox: HTMLInputElement | null = null;
  private lyricUrl: HTMLTextAreaElement | null = null;
  private lyricAlignAnchorSelect: HTMLSelectElement | null = null;
  private lyricDelayInput: HTMLInputElement | null = null;
  private amllLyricPlayer: HTMLElement | null = null;
  private lyricAreaHint: HTMLElement | null = null;
  private showTranslatedLyricCheckbox: HTMLInputElement | null = null;
  private showRomanLyricCheckbox: HTMLInputElement | null = null;
  private swapLyricPositionsCheckbox: HTMLInputElement | null = null;
  private swapDuetsPositionsCheckbox: HTMLInputElement | null = null;
  private posYSpringMassInput: HTMLInputElement | null = null;
  private posYSpringDampingInput: HTMLInputElement | null = null;
  private posYSpringStiffnessInput: HTMLInputElement | null = null;
  private posYSpringSoftCheckbox: HTMLInputElement | null = null;
  private scaleSpringMassInput: HTMLInputElement | null = null;
  private scaleSpringDampingInput: HTMLInputElement | null = null;
  private scaleSpringStiffnessInput: HTMLInputElement | null = null;
  private scaleSpringSoftCheckbox: HTMLInputElement | null = null;
  private wordFadeWidthInput: HTMLInputElement | null = null;
  private wordFadeWidthValue: HTMLElement | null = null;


  private audio: HTMLAudioElement;
  private albumSidePanel: HTMLElement | null;
  private showStatus: (message: string, isError?: boolean) => void;
  private updateFileInputDisplay: (inputId: string, file: File | string) => void;
  private state: LyricState;

  constructor(config: LyricPlayerConfig, initialState: LyricState) {
    this.lyricsPanel = config.lyricsPanel;
    this.audio = config.audio;
    this.albumSidePanel = config.albumSidePanel;
    this.showStatus = config.showStatus;
    this.updateFileInputDisplay = config.updateFileInputDisplay;
    this.state = initialState;

    this.initLyricPlayer();
    this.initElements();
    this.setupLyricEvents();
    this.initLyricDisplayControls();
  }

  /**
   * 初始化歌词播放器
   */
  private initLyricPlayer(): void {
    this.lyricPlayer = new BaseDomLyricPlayer();
    const element = this.lyricPlayer.getElement();
    this.lyricsPanel.appendChild(element);
    this.updateLyricAreaHint();
  }

  /**
   * 初始化DOM元素引用
   */
  private initElements(): void {
    this.lyricFile = document.getElementById('lyricFile') as HTMLInputElement;
    this.lyricFileBtn = document.getElementById('lyricFileBtn');
    this.lyricAlignPosition = document.getElementById('lyricAlignPosition') as HTMLInputElement;
    this.lyricAlignPositionValue = document.getElementById('lyricAlignPositionValue');
    this.hidePassedLyricsCheckbox = document.getElementById('hidePassedLyrics') as HTMLInputElement;
    this.enableLyricBlur = document.getElementById('enableLyricBlur') as HTMLInputElement;
    this.enableLyricScale = document.getElementById('enableLyricScale') as HTMLInputElement;
    this.enableLyricSpring = document.getElementById('enableLyricSpring') as HTMLInputElement;
    this.showbgLyricCheckbox = document.getElementById('showbgLyric') as HTMLInputElement;
    this.advanceLyricTimingCheckbox = document.getElementById('advanceLyricTiming') as HTMLInputElement;
    this.singleLyricsCheckbox = document.getElementById('singleLyrics') as HTMLInputElement;
    this.lyricUrl = document.getElementById('lyricUrl') as HTMLTextAreaElement;
    this.lyricAlignAnchorSelect = document.getElementById('lyricAlignAnchor') as HTMLSelectElement;
    this.lyricDelayInput = document.getElementById('lyricDelay') as HTMLInputElement;
    this.amllLyricPlayer = document.getElementById('amll-lyric-player');
    this.lyricAreaHint = document.getElementById('lyricAreaHint');
    this.showTranslatedLyricCheckbox = document.getElementById('showTranslatedLyric') as HTMLInputElement;
    this.showRomanLyricCheckbox = document.getElementById('showRomanLyric') as HTMLInputElement;
    this.swapLyricPositionsCheckbox = document.getElementById('swapLyricPositions') as HTMLInputElement;
    this.swapDuetsPositionsCheckbox = document.getElementById('swapDuetsPositions') as HTMLInputElement;
    this.posYSpringMassInput = document.getElementById('posYSpringMass') as HTMLInputElement;
    this.posYSpringDampingInput = document.getElementById('posYSpringDamping') as HTMLInputElement;
    this.posYSpringStiffnessInput = document.getElementById('posYSpringStiffness') as HTMLInputElement;
    this.posYSpringSoftCheckbox = document.getElementById('posYSpringSoft') as HTMLInputElement;
    this.scaleSpringMassInput = document.getElementById('scaleSpringMass') as HTMLInputElement;
    this.scaleSpringDampingInput = document.getElementById('scaleSpringDamping') as HTMLInputElement;
    this.scaleSpringStiffnessInput = document.getElementById('scaleSpringStiffness') as HTMLInputElement;
    this.scaleSpringSoftCheckbox = document.getElementById('scaleSpringSoft') as HTMLInputElement;
    this.wordFadeWidthInput = document.getElementById('wordFadeWidth') as HTMLInputElement;
    this.wordFadeWidthValue = document.getElementById('wordFadeWidthValue');
  }

  /**
   * 设置歌词相关事件监听
   */
  private setupLyricEvents(): void {
    this.lyricPlayer.addEventListener("line-click", (evt) => {
      const e = evt as LyricLineMouseEvent;
      const line = e.line;
      if (line && this.audio) {
        this.audio.currentTime = (line.startTime - this.state.lyricDelay) / 1000;
      }
    });

    // 歌词文件上传事件
    if (this.lyricFile) {
      this.lyricFile.addEventListener('change', (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          this.loadLyricFromFile(file);
          this.updateFileInputDisplay("lyricFile", file);
        }
      });
    }

    // 歌词文件按钮点击事件
    this.lyricFileBtn?.addEventListener("click", () => {
      if (this.lyricFile) {
        this.lyricFile.click();
      }
    });

    // 歌词URL输入事件
    if (this.lyricUrl) {
      this.lyricUrl.addEventListener("keydown", (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (this.lyricUrl) {
            this.processLyricInput(this.lyricUrl.value);
          }
        }
      });
    }

    // 歌词对齐位置控制
    this.lyricAlignPosition?.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.state.lyricAlignPosition = value;
      this.lyricPlayer.setAlignPosition(value);
      if (this.lyricAlignPositionValue) {
        this.lyricAlignPositionValue.textContent = value.toFixed(1);
      }
    });

    // 隐藏已播歌词控制
    this.hidePassedLyricsCheckbox?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      this.state.hidePassedLyrics = checked;
      this.updateLyricsDisplay();
    });

    // 歌词模糊效果控制
    this.enableLyricBlur?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      this.state.enableLyricBlur = checked;
      this.lyricPlayer.setEnableBlur(checked);
    });

    // 歌词缩放效果控制
    this.enableLyricScale?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      this.state.enableLyricScale = checked;
      this.lyricPlayer.setEnableScale(checked);
    });

    // 歌词弹簧效果控制
    this.enableLyricSpring?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      this.state.enableLyricSpring = checked;
      this.lyricPlayer.setEnableSpring(checked);
    });

    // 歌词延迟控制
    if (this.lyricDelayInput) {
      this.lyricDelayInput.addEventListener("input", (e) => {
        const value = parseInt((e.target as HTMLInputElement).value || "0");
        this.state.lyricDelay = value;
      });
    }

    // 歌词对齐锚点控制
    this.lyricAlignAnchorSelect?.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value as 'center' | 'top' | 'bottom';
      this.state.lyricAlignAnchor = value;
      this.lyricPlayer.setAlignAnchor(value);
    });

    // 拖拽上传歌词
    if (this.lyricsPanel) {
      this.lyricsPanel.addEventListener("dragover", (e) => {
        e.preventDefault();
        this.lyricsPanel!.style.border = "2px dashed rgba(255, 255, 255, 0.5)";
      });

      this.lyricsPanel.addEventListener("dragleave", () => {
        this.lyricsPanel!.style.border = "none";
      });

      this.lyricsPanel.addEventListener("drop", (e) => {
        e.preventDefault();
        this.lyricsPanel!.style.border = "none";

        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
          const file = files[0];
          this.loadLyricFromFile(file);
          this.updateFileInputDisplay("lyricFile", file);
        }
      });
    }
  }

  /**
   * 初始化歌词显示控制
   */
  private initLyricDisplayControls(): void {
    if (this.showTranslatedLyricCheckbox) {
      this.showTranslatedLyricCheckbox.checked = this.state.showTranslatedLyric;
      this.showTranslatedLyricCheckbox.addEventListener('change', (e) => {
        this.state.showTranslatedLyric = (e.target as HTMLInputElement).checked;
        this.updateLyricsDisplay();
      });
    }

    if (this.showRomanLyricCheckbox) {
      this.showRomanLyricCheckbox.checked = this.state.showRomanLyric;
      this.showRomanLyricCheckbox.addEventListener('change', (e) => {
        this.state.showRomanLyric = (e.target as HTMLInputElement).checked;
        this.updateLyricsDisplay();
      });
    }

    if (this.swapLyricPositionsCheckbox) {
      this.swapLyricPositionsCheckbox.checked = this.state.swapLyricPositions;
      this.swapLyricPositionsCheckbox.addEventListener('change', (e) => {
        this.state.swapLyricPositions = (e.target as HTMLInputElement).checked;
        this.updateLyricsDisplay();
      });
    }

    if (this.showbgLyricCheckbox) {
      this.showbgLyricCheckbox.checked = this.state.showbgLyric;
      this.showbgLyricCheckbox.addEventListener('change', (e) => {
        this.state.showbgLyric = (e.target as HTMLInputElement).checked;
        this.updateLyricsDisplay();
      });
    }

    if (this.swapDuetsPositionsCheckbox) {
      this.swapDuetsPositionsCheckbox.checked = this.state.swapDuetsPositions;
      this.swapDuetsPositionsCheckbox.addEventListener('change', (e) => {
        this.state.swapDuetsPositions = (e.target as HTMLInputElement).checked;

        const isPortrait = window.matchMedia("(orientation: portrait)").matches;

        if (this.albumSidePanel && this.lyricsPanel) {
          if (this.state.swapDuetsPositions) {
            const parent = this.albumSidePanel.parentElement;
            if (parent) {
              parent.insertBefore(this.lyricsPanel, this.albumSidePanel);
            }
          } else {
            const parent = this.lyricsPanel.parentElement;
            if (parent) {
              parent.insertBefore(this.albumSidePanel, this.lyricsPanel);
            }
          }
        }

        this.updateLyricsDisplay();
      });
    }

    if (this.hidePassedLyricsCheckbox) {
      this.hidePassedLyricsCheckbox.checked = this.state.hidePassedLyrics;
      this.hidePassedLyricsCheckbox.addEventListener('change', (e) => {
        this.state.hidePassedLyrics = (e.target as HTMLInputElement).checked;
        this.updateLyricsDisplay();
      });
    }

    if (this.advanceLyricTimingCheckbox) {
      this.advanceLyricTimingCheckbox.checked = this.state.advanceLyricTiming;
      this.advanceLyricTimingCheckbox.addEventListener('change', (e) => {
        this.state.advanceLyricTiming = (e.target as HTMLInputElement).checked;
        this.updateLyricsDisplay();
      });
    }

    if (this.singleLyricsCheckbox) {
      this.singleLyricsCheckbox.checked = this.state.singleLyrics;
      this.singleLyricsCheckbox.addEventListener('change', (e) => {
        this.state.singleLyrics = (e.target as HTMLInputElement).checked;
        this.updateLyricsDisplay();
      });
    }
  }

  /**
   * 从文件加载歌词
   */
  public async loadLyricFromFile(file: File): Promise<void> {
    try {
      // 检查文件类型，iOS Safari 可能会上传 text/plain 类型的文件
      const isValidExtension = /\.(lrc|ttml|yrc|lys|qrc|txt|ass|lqe|lyl|srt|spl)$/i.test(
        file.name
      );
      const isTextPlain = file.type === "text/plain" || file.type === "";

      if (!isValidExtension && !isTextPlain) {
        this.showStatus(t("lyricsLoadFailed"), true);
        return;
      }

      const text = await file.text();
      const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
      this.state.lyricUrl = url;
      await this.loadLyricContent(text, file.name);
      this.updateFileInputDisplay("lyricFile", file);
      this.showStatus(t("lyricsLoadSuccess"));
    } catch (error) {
      this.showStatus(t("lyricsLoadFailed"), true);
    }
  }

  /**
   * 处理歌词输入
   */
  public async processLyricInput(input: string): Promise<void> {
    if (!input.trim()) {
      this.hasLyrics = false;
      this.lyricPlayer.setLyricLines([]);
      this.updateLyricAreaHint();
      this.updateFileInputDisplay("lyricFile", "");
      this.state.lyricUrl = "";
      if (this.lyricUrl) {
        this.lyricUrl.value = "";
      }
      return;
    }

    const urlPattern = /^https?:\/\/.+/;
    if (urlPattern.test(input.trim())) {
      // URL处理逻辑由外部调用
      return;
    }

    const base64Pattern = /^data:([^;]+)(;charset=([^;]+))?;base64,([A-Za-z0-9+/=]+)$/;
    const base64Match = input.trim().match(base64Pattern);
    if (base64Match) {
      try {
        const contentType = base64Match[1] || 'text/plain';
        const charset = base64Match[3] || 'utf-8';
        const base64Content = base64Match[4];
        const binaryString = atob(base64Content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        let decodedContent;
        try {
          decodedContent = new TextDecoder(charset).decode(bytes);
        } catch (e) {
          decodedContent = new TextDecoder('utf-8').decode(bytes);
        }
        await this.loadLyricContent(decodedContent, "direct-input.txt");
        this.updateFileInputDisplay("lyricFile", `Base64 Encoded Input (${contentType})`);
        this.showStatus(t("lyricsParseSuccess"));
      } catch (error) {
        console.error("Base64 decoding error:", error);
        this.showStatus(t("lyricsParseFailed"), true);
      }
      return;
    }

    try {
      await this.loadLyricContent(input, "direct-input.txt");
      this.updateFileInputDisplay("lyricFile", "Direct Input");
      this.showStatus(t("lyricsParseSuccess"));
    } catch (error) {
      console.error("Direct lyric input error:", error);
      this.showStatus(t("lyricsParseFailed"), true);
    }
  }

  /**
   * 加载歌词内容
   */
  private async loadLyricContent(content: string, filename: string): Promise<void> {
    try {
      let lines: LyricLine[] = [];

      const isESFormat = isESLyRiCFormat(content);
      const isA2Format = isLyRiCA2Format(content);

      if (filename.endsWith(".ttml")) {
        lines = parseTTML(content).lines.map(this.mapTTMLLyric);
      } else if (filename.endsWith(".ass")) {
        const ttmlContent = assToTTML(content);
        lines = parseTTML(ttmlContent).lines.map(this.mapTTMLLyric);
      } else if (filename.endsWith(".lrc")) {
        if (isESFormat) {
          const rawLines = parseESLyRiC(content);
          const ttmlContent = convertToTTML(rawLines);
          lines = parseTTML(ttmlContent).lines.map(this.mapTTMLLyric);
        } else if (isA2Format) {
          const rawLines = parseLyRiCA2(content);
          const ttmlContent = convertToTTML(rawLines);
          lines = parseTTML(ttmlContent).lines.map(this.mapTTMLLyric);
        } else if (isWalaokeFormat(content)) {
          const ttmlContent = parseWalaoke(content);
          lines = parseTTML(ttmlContent).lines.map(this.mapTTMLLyric);
        } else if (isSPLFormat(content)) {
          const ttmlContent = parseSPL(content);
          lines = parseTTML(ttmlContent).lines.map(this.mapTTMLLyric);
        } else {
          lines = parseLrc(content).map(this.mapLyric);
        }
      } else if (filename.endsWith(".yrc")) {
        lines = parseYrc(content).map(this.mapLyric);
      } else if (filename.endsWith(".lys")) {
        lines = parseLys(content).map(this.mapLyric);
      } else if (filename.endsWith(".qrc")) {
        lines = parseQrc(content).map(this.mapLyric);
      } else if (filename.endsWith(".lqe")) {
        if (content.includes('[lyrics: format@Lyricify Syllable]')) {
          lines = parseLys(content).map(this.mapLyric);
        } else {
          const ttmlContent = lqeToTTML(content);
          lines = parseTTML(ttmlContent).lines.map(this.mapTTMLLyric);
        }
      } else if (filename.endsWith(".srt")) {
        const ttmlContent = srtToTTML(content);
        lines = parseTTML(ttmlContent).lines.map(this.mapTTMLLyric);
      } else if (filename.endsWith(".lyl")) {
        const ttmlContent = lylToTTML(content);
        lines = parseTTML(ttmlContent).lines.map(this.mapTTMLLyric);
      } else if (filename.endsWith(".spl")) {
        const ttmlContent = parseSPL(content);
        lines = parseTTML(ttmlContent).lines.map(this.mapTTMLLyric);
      } else {
        if (isESFormat) {
          const rawLines = parseESLyRiC(content);
          const ttmlContent = convertToTTML(rawLines);
          lines = parseTTML(ttmlContent).lines.map(this.mapTTMLLyric);
        } else if (isA2Format) {
          const rawLines = parseLyRiCA2(content);
          const ttmlContent = convertToTTML(rawLines);
          lines = parseTTML(ttmlContent).lines.map(this.mapTTMLLyric);
        } else if (isWalaokeFormat(content)) {
          const ttmlContent = parseWalaoke(content);
          lines = parseTTML(ttmlContent).lines.map(this.mapTTMLLyric);
        } else if (isSPLFormat(content)) {
          const ttmlContent = parseSPL(content);
          lines = parseTTML(ttmlContent).lines.map(this.mapTTMLLyric);
        } else if (isSrtFormat(content)) {
          const ttmlContent = srtToTTML(content);
          lines = parseTTML(ttmlContent).lines.map(this.mapTTMLLyric);
        } else if (isLqeFormat(content)) {
          const ttmlContent = lqeToTTML(content);
          lines = parseTTML(ttmlContent).lines.map(this.mapTTMLLyric);
        } else if (isAssFormat(content)) {
          const ttmlContent = assToTTML(content);
          lines = parseTTML(ttmlContent).lines.map(this.mapTTMLLyric);
        } else if (isLylFormat(content)) {
          const ttmlContent = lylToTTML(content);
          lines = parseTTML(ttmlContent).lines.map(this.mapTTMLLyric);
        } else {
          lines = parseLrc(content).map(this.mapLyric);
        }
      }

      this.originalLyricLines = JSON.parse(JSON.stringify(lines));
      this.hasLyrics = lines.length > 0;
      this.updateLyricsDisplay();

      if (this.lyricsPanel && this.hasLyrics) {
        if (this.lyricAreaHint) this.lyricAreaHint.remove();
      }
      this.updateLyricAreaHint();
      this.showStatus(`${t("lyricsParseSuccess")}${lines.length} 行`);
    } catch (error) {
      console.error("Lyric parsing error:", error);
      this.showStatus(t("lyricsParseFailed"), true);
    }
  }

  /**
   * 映射歌词行格式
   */
  private mapLyric(line: RawLyricLine): LyricLine {
    return {
      words: line.words.map((word) => ({ obscene: false, ...word })),
      startTime: line.words[0]?.startTime ?? 0,
      endTime:
        line.words[line.words.length - 1]?.endTime ?? Number.POSITIVE_INFINITY,
      translatedLyric: "",
      romanLyric: "",
      isBG: false,
      isDuet: false,
    };
  }

  /**
   * 映射TTML歌词行格式
   */
  private mapTTMLLyric(line: RawLyricLine): LyricLine {
    return {
      ...line,
      words: line.words.map((word) => ({ obscene: false, ...word })),
    };
  }

  /**
   * 查找下一行歌词的开始时间
   */
  private findNextLyricLineStartTime(currentTimeMs: number): number {
    if (!this.processedLyricLines || this.processedLyricLines.length === 0) {
      return currentTimeMs;
    }
    const adjustedTimeMs = currentTimeMs + this.state.lyricDelay;
    for (let i = 0; i < this.processedLyricLines.length; i++) {
      const line = this.processedLyricLines[i];
      if (line.startTime >= adjustedTimeMs) {
        return line.startTime;
      }
    }
    // 如果没有找到，返回最后一行的startTime
    return this.processedLyricLines[this.processedLyricLines.length - 1].startTime;
  }

  /**
   * 更新歌词显示
   */
  public updateLyricsDisplay(): void {
    if (!this.hasLyrics) return;
    const lines = this.originalLyricLines.map(line => ({ ...line }));
    const currentTime = this.audio.currentTime;

    const updatedLines = lines.map((line: any) => {
      const updatedLine = { ...line };

      if (!this.state.showTranslatedLyric) {
        updatedLine.translatedLyric = "";
      }
      if (!this.state.showRomanLyric) {
        updatedLine.romanLyric = "";
      }
      if (this.state.swapLyricPositions) {
        const temp = updatedLine.translatedLyric;
        updatedLine.translatedLyric = updatedLine.romanLyric;
        updatedLine.romanLyric = temp;
      }
      if (!this.state.showbgLyric && updatedLine.isBG) {
        updatedLine.lyric = '';
        updatedLine.translatedLyric = '';
        updatedLine.romanLyric = '';
        if (updatedLine.words && updatedLine.words.length > 0) {
          updatedLine.words = updatedLine.words.map((word: any) => ({ ...word, word: '' }));
        }
      }
      if (this.state.swapDuetsPositions) {
        updatedLine.isDuet = !line.isDuet;
        if (updatedLine.words && updatedLine.words.length > 0) {
          updatedLine.words = updatedLine.words.map((word: any) => ({
            ...word,
            isDuet: updatedLine.isDuet
          }));
        }
      }

      const isPassed = line.endTime <= currentTime;
      if (this.state.hidePassedLyrics && isPassed) {
        updatedLine.translatedLyric = "";
        updatedLine.romanLyric = "";
        updatedLine.lyric = '';
        if (updatedLine.words && updatedLine.words.length > 0) {
          updatedLine.words = updatedLine.words.map((word: any) => ({
            ...word,
            word: '',
            translated: '',
            roman: ''
          }));
        }
      }

      if (this.state.advanceLyricTiming) {
        updatedLine.startTime = Math.max(0, updatedLine.startTime - 0.4); // 减去400ms
        updatedLine.endTime = Math.max(0, updatedLine.endTime + 0.4); // 加上400ms
      }

      return updatedLine;
    });

    const filteredLines = !this.state.showbgLyric
      ? updatedLines.filter((line: any) => !line.isBG)
      : updatedLines;

    this.processedLyricLines = filteredLines as LyricLine[];
    this.lyricPlayer.setLyricLines(this.processedLyricLines);
    this.lyricPlayer.setHidePassedLines(this.state.hidePassedLyrics);
    const currentTimeMs = this.audio.currentTime * 1000;
    const nextLineStartTime = this.findNextLyricLineStartTime(currentTimeMs);
    this.lyricPlayer.setCurrentTime(nextLineStartTime);
    setTimeout(() => {
      const adjustedTime = currentTimeMs + this.state.lyricDelay;
      this.lyricPlayer.setCurrentTime(adjustedTime);
    }, 50);
  }

  /**
   * 调整歌词位置
   */
  public adjustLyricPosition(): void {
    const lyricElement = this.lyricPlayer.getElement();
    if (lyricElement) {
      const isLandscape = window.matchMedia(
        "(min-width: 769px), (orientation: landscape)"
      ).matches;

      if (isLandscape) {
        lyricElement.style.paddingTop = "20px";
      } else {
        lyricElement.style.paddingTop = "120px";
      }
      this.updateLyricAreaHint();
    }
  }

  /**
   * 更新歌词区域提示
   */
  private updateLyricAreaHint(): void {
    if (!this.lyricsPanel) return;

    // 移除现有提示
    if (this.lyricAreaHint) {
      this.lyricAreaHint.remove();
      this.lyricAreaHint = null;
    }

    if (!this.hasLyrics) {
      const hintElement = document.createElement('div');
      hintElement.id = "lyricAreaHint";
      this.lyricAreaHint = hintElement;

      hintElement.style.cssText = `
        position: absolute;
        top: 45%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: var(--dominant-color-light);
        font-size: 16px;
        text-align: center;
        pointer-events: auto;
        z-index: 30;
        width: 80%;
        padding: 30px;
        opacity: 0.7;
        transition: opacity 0.3s ease;
        cursor: pointer;
        user-select: none;
      `;

      hintElement.innerHTML = `
        <div style="margin-bottom: 15px; font-size: var(--amll-lp-font-size, max(max(4vh, 2vw), 12px));">${t(
        "clickToAddLyrics"
      )}</div>
        <div style="opacity: 0.6; line-height: 1.5; font-size: var(--amll-lp-font-size, max(max(3vh, 1.5vw), 12px));">*.ass, *.lqe, *.lrc, *.lyl, *.lys, *.qrc, *.spl, *.srt, *.ttml, *.yrc</div>
      `;

      hintElement.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.lyricFile) this.lyricFile.click();
      });

      hintElement.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.lyricFile) this.lyricFile.click();
      }, { passive: false });

      this.lyricsPanel.appendChild(hintElement);
    }
  }

  /**
   * 设置当前时间
   */
  public setCurrentTime(timeMs: number): void {
    const adjustedTime = timeMs + this.state.lyricDelay;
    this.lyricPlayer.setCurrentTime(adjustedTime);
  }

  /**
   * 暂停歌词播放
   */
  public pause(): void {
    this.lyricPlayer.pause();
  }

  /**
   * 恢复歌词播放
   */
  public resume(): void {
    this.lyricPlayer.resume();
  }

  /**
   * 获取歌词状态
   */
  public getState(): LyricState {
    return { ...this.state };
  }

  /**
   * 更新歌词状态
   */
  public updateState(newState: Partial<LyricState>): void {
    this.state = { ...this.state, ...newState };
    this.updateLyricsDisplay();
    this.adjustLyricPosition();
  }

  /**
   * 设置歌词对齐位置
   */
  public setAlignPosition(position: number): void {
    this.lyricPlayer.setAlignPosition(position);
  }

  /**
   * 设置是否启用模糊效果
   */
  public setEnableBlur(enable: boolean): void {
    this.lyricPlayer.setEnableBlur(enable);
  }

  /**
   * 设置是否启用缩放效果
   */
  public setEnableScale(enable: boolean): void {
    this.lyricPlayer.setEnableScale(enable);
  }

  /**
   * 设置是否启用弹簧效果
   */
  public setEnableSpring(enable: boolean): void {
    this.lyricPlayer.setEnableSpring(enable);
  }

  /**
   * 设置歌词淡出宽度
   */
  public setWordFadeWidth(width: number): void {
    this.lyricPlayer.setWordFadeWidth(width);
  }

  /**
   * 设置歌词位置弹簧参数
   */
  public setLinePosYSpringParams(params: { mass: number; damping: number; stiffness: number; soft: boolean }): void {
    this.lyricPlayer.setLinePosYSpringParams(params);
  }

  /**
   * 设置歌词缩放弹簧参数
   */
  public setLineScaleSpringParams(params: { mass: number; damping: number; stiffness: number; soft: boolean }): void {
    this.lyricPlayer.setLineScaleSpringParams(params);
  }

  /**
   * 获取内部歌词播放器元素
   */
  public getElement(): HTMLElement {
    return this.lyricPlayer.getElement();
  }

  /**
   * 设置歌词行
   */
  public setLyricLines(lines: LyricLine[]): void {
    this.lyricPlayer.setLyricLines(lines);
  }

  /**
   * 设置是否隐藏已播放的歌词行
   */
  public setHidePassedLines(hide: boolean): void {
    this.lyricPlayer.setHidePassedLines(hide);
  }

  /**
   * 更新歌词播放器
   */
  public update(deltaTime: number): void {
    this.lyricPlayer.update(deltaTime);
  }

  /**
   * 设置歌词对齐锚点
   */
  public setAlignAnchor(anchor: 'center' | 'top' | 'bottom'): void {
    this.lyricPlayer.setAlignAnchor(anchor);
  }

  /**
   * 添加事件监听器
   */
  public addEventListener(type: string, listener: (event: any) => void): void {
    this.lyricPlayer.addEventListener(type, listener);
  }

  /**
   * 获取底层歌词播放器实例（用于外部调用）
   */
  public getBaseLyricPlayer(): BaseDomLyricPlayer {
    return this.lyricPlayer;
  }
}