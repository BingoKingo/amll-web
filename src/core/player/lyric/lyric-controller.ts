import type { LyricPlayer } from '../../../lyrics/lyrics';
import type { DomCache } from '../dom/dom-cache';
import type { PlayerState } from '../../../app/types';

/**
 * LyricController 负责歌词控制和桥接
 * - 加载/解析/渲染控制
 * - 参数同步
 * - 区间/单行切换
 * - 与现有 LyricPlayer 的桥接
 */
export class LyricController {
  private domCache: DomCache;
  private state: PlayerState;
  private lyricPlayer: LyricPlayer;

  constructor(domCache: DomCache, state: PlayerState, lyricPlayer: LyricPlayer) {
    this.domCache = domCache;
    this.state = state;
    this.lyricPlayer = lyricPlayer;
  }

  // 初始化
  public init(): void {
    // 同步当前状态到歌词播放器
    this.syncLyricPlayerSettings();
    
    // 设置歌词播放器的回调函数
    this.setupLyricPlayerCallbacks();
  }

  // 加载歌词
  public async loadLyric(content: string, filename?: string): Promise<void> {
    try {
      await this.lyricPlayer.processLyricInput(content);
      // 歌词加载成功后的处理
      this.onLyricLoaded();
    } catch (error) {
      console.error('Failed to load lyric:', error);
      throw error;
    }
  }

  // 从URL加载歌词
  public async loadLyricFromUrl(url: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch lyric: ${response.status}`);
      }
      const content = await response.text();
      
      // 从URL中提取文件名
      const filename = url.split('/').pop()?.split('?')[0] || 'lyric';
      
      await this.loadLyric(content, filename);
    } catch (error) {
      console.error('Failed to load lyric from URL:', error);
      throw error;
    }
  }

  // 设置时间
  public setTime(time: number): void {
    this.lyricPlayer.setCurrentTime(time * 1000);
  }

  // 设置延迟
  public setDelay(delay: number): void {
    this.state.lyricDelay = delay;
    this.lyricPlayer.updateState({ lyricDelay: delay });
  }

  // 设置对齐位置
  public setAlignPosition(position: number): void {
    this.state.lyricAlignPosition = position;
    this.lyricPlayer.setAlignPosition(position);
  }

  // 设置对齐锚点
  public setAlignAnchor(anchor: 'center' | 'top' | 'bottom'): void {
    this.state.lyricAlignAnchor = anchor;
    this.lyricPlayer.setAlignAnchor(anchor);
  }

  // 切换隐藏已过歌词
  public toggleHidePassedLyrics(): void {
    this.state.hidePassedLyrics = !this.state.hidePassedLyrics;
    this.lyricPlayer.updateState({ hidePassedLyrics: this.state.hidePassedLyrics });
  }

  // 切换歌词模糊效果
  public toggleLyricBlur(): void {
    this.state.enableLyricBlur = !this.state.enableLyricBlur;
    this.lyricPlayer.setEnableBlur(this.state.enableLyricBlur);
  }

  // 切换歌词缩放效果
  public toggleLyricScale(): void {
    this.state.enableLyricScale = !this.state.enableLyricScale;
    this.lyricPlayer.setEnableScale(this.state.enableLyricScale);
  }

  // 切换歌词弹簧效果
  public toggleLyricSpring(): void {
    this.state.enableLyricSpring = !this.state.enableLyricSpring;
    this.lyricPlayer.setEnableSpring(this.state.enableLyricSpring);
  }

  // 设置单词淡入淡出宽度
  public setWordFadeWidth(width: number): void {
    this.state.wordFadeWidth = width;
    this.lyricPlayer.setWordFadeWidth(width);
  }

  // 切换显示剩余时间
  public toggleShowRemainingTime(): void {
    this.state.showRemainingTime = !this.state.showRemainingTime;
  }

  // 切换显示翻译歌词
  public toggleShowTranslatedLyric(): void {
    this.state.showTranslatedLyric = !this.state.showTranslatedLyric;
    this.lyricPlayer.updateState({ showTranslatedLyric: this.state.showTranslatedLyric });
  }

  // 切换显示罗马音歌词
  public toggleShowRomanLyric(): void {
    this.state.showRomanLyric = !this.state.showRomanLyric;
    this.lyricPlayer.updateState({ showRomanLyric: this.state.showRomanLyric });
  }

  // 切换歌词位置
  public toggleSwapLyricPositions(): void {
    this.state.swapLyricPositions = !this.state.swapLyricPositions;
    this.lyricPlayer.updateState({ swapLyricPositions: this.state.swapLyricPositions });
  }

  // 切换显示背景歌词
  public toggleShowBgLyric(): void {
    this.state.showbgLyric = !this.state.showbgLyric;
    this.lyricPlayer.updateState({ showbgLyric: this.state.showbgLyric });
  }

  // 切换二重唱位置
  public toggleSwapDuetsPositions(): void {
    this.state.swapDuetsPositions = !this.state.swapDuetsPositions;
    this.lyricPlayer.updateState({ swapDuetsPositions: this.state.swapDuetsPositions });
  }

  // 切换歌词提前计时
  public toggleAdvanceLyricTiming(): void {
    this.state.advanceLyricTiming = !this.state.advanceLyricTiming;
    this.lyricPlayer.updateState({ advanceLyricTiming: this.state.advanceLyricTiming });
  }

  // 切换单行歌词模式
  public toggleSingleLyrics(): void {
    this.state.singleLyrics = !this.state.singleLyrics;
    this.lyricPlayer.updateState({ singleLyrics: this.state.singleLyrics });
  }

  // 同步歌词播放器设置
  public syncLyricPlayerSettings(): void {
    // 使用updateState方法一次性更新所有歌词播放器设置
    this.lyricPlayer.updateState({
      lyricDelay: this.state.lyricDelay,
      lyricAlignPosition: this.state.lyricAlignPosition,
      lyricAlignAnchor: this.state.lyricAlignAnchor,
      hidePassedLyrics: this.state.hidePassedLyrics,
      enableLyricBlur: this.state.enableLyricBlur,
      enableLyricScale: this.state.enableLyricScale,
      enableLyricSpring: this.state.enableLyricSpring,
      wordFadeWidth: this.state.wordFadeWidth,
      showTranslatedLyric: this.state.showTranslatedLyric,
      showRomanLyric: this.state.showRomanLyric,
      swapLyricPositions: this.state.swapLyricPositions,
      showbgLyric: this.state.showbgLyric,
      swapDuetsPositions: this.state.swapDuetsPositions,
      advanceLyricTiming: this.state.advanceLyricTiming,
      singleLyrics: this.state.singleLyrics
    });
  }

  // 设置歌词播放器回调
  private setupLyricPlayerCallbacks(): void {
    // 这里可以设置歌词播放器的各种回调函数
  }

  // 歌词加载成功处理
  private onLyricLoaded(): void {
    // 歌词加载成功后的逻辑
  }

  // 清理资源
  public destroy(): void {
    // 清理歌词控制器资源
  }
}