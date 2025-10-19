import type { PlayerState } from '../../../app/types';

/**
 * Timing 负责歌词计时相关功能
 * - 延迟/提前调整
 * - 对齐锚点/对齐位置
 * - 单行模式处理
 */
export class Timing {
  private state: PlayerState;
  private lyricPlayer: any; // LyricPlayer 实例
  private baseTime: number = 0;
  private adjustedTime: number = 0;

  constructor(state: PlayerState, lyricPlayer: any) {
    this.state = state;
    this.lyricPlayer = lyricPlayer;
  }

  // 初始化
  public init(): void {
    // 初始化计时相关设置
  }

  // 计算调整后的时间
  public getAdjustedTime(originalTime: number): number {
    // 应用延迟
    let adjustedTime = originalTime + this.state.lyricDelay / 1000;
    
    // 如果启用了歌词提前计时，额外提前一点时间
    if (this.state.advanceLyricTiming) {
      adjustedTime += 0.1; // 提前0.1秒
    }
    
    // 确保时间不为负数
    return Math.max(0, adjustedTime);
  }

  // 设置基础时间
  public setBaseTime(time: number): void {
    this.baseTime = time;
    this.adjustedTime = this.getAdjustedTime(time);
  }

  // 增加延迟
  public increaseDelay(amount: number = 50): void {
    this.state.lyricDelay += amount;
    this.syncDelayToLyricPlayer();
  }

  // 减少延迟
  public decreaseDelay(amount: number = 50): void {
    this.state.lyricDelay -= amount;
    this.syncDelayToLyricPlayer();
  }

  // 重置延迟
  public resetDelay(): void {
    this.state.lyricDelay = 0;
    this.syncDelayToLyricPlayer();
  }

  // 同步延迟到歌词播放器
  private syncDelayToLyricPlayer(): void {
    if (this.lyricPlayer && typeof this.lyricPlayer.setDelay === 'function') {
      this.lyricPlayer.setDelay(this.state.lyricDelay);
    }
  }

  // 设置对齐位置
  public setAlignPosition(position: number): void {
    this.state.lyricAlignPosition = position;
    this.syncAlignToLyricPlayer();
  }

  // 设置对齐锚点
  public setAlignAnchor(anchor: 'center' | 'top' | 'bottom'): void {
    this.state.lyricAlignAnchor = anchor;
    this.syncAlignToLyricPlayer();
  }

  // 同步对齐设置到歌词播放器
  private syncAlignToLyricPlayer(): void {
    if (this.lyricPlayer) {
      if (typeof this.lyricPlayer.setAlignPosition === 'function') {
        this.lyricPlayer.setAlignPosition(this.state.lyricAlignPosition);
      }
      if (typeof this.lyricPlayer.setAlignAnchor === 'function') {
        this.lyricPlayer.setAlignAnchor(this.state.lyricAlignAnchor);
      }
    }
  }

  // 切换单行歌词模式
  public toggleSingleLyrics(): boolean {
    this.state.singleLyrics = !this.state.singleLyrics;
    this.syncSingleLyricsToLyricPlayer();
    return this.state.singleLyrics;
  }

  // 设置单行歌词模式
  public setSingleLyrics(enabled: boolean): void {
    this.state.singleLyrics = enabled;
    this.syncSingleLyricsToLyricPlayer();
  }

  // 同步单行歌词模式到歌词播放器
  private syncSingleLyricsToLyricPlayer(): void {
    if (this.lyricPlayer && typeof this.lyricPlayer.setSingleLyrics === 'function') {
      this.lyricPlayer.setSingleLyrics(this.state.singleLyrics);
    }
  }

  // 根据对齐设置计算歌词Y位置
  public calculateLyricPosition(containerHeight: number, lyricHeight: number): number {
    let position = 0;
    
    switch (this.state.lyricAlignAnchor) {
      case 'top':
        position = this.state.lyricAlignPosition / 100 * containerHeight;
        break;
      case 'center':
        position = (this.state.lyricAlignPosition / 100 * containerHeight) - (lyricHeight / 2);
        break;
      case 'bottom':
        position = (this.state.lyricAlignPosition / 100 * containerHeight) - lyricHeight;
        break;
    }
    
    // 确保位置在有效范围内
    return Math.max(0, Math.min(containerHeight - lyricHeight, position));
  }

  // 获取当前有效时间
  public getCurrentEffectiveTime(currentTime: number): number {
    return this.getAdjustedTime(currentTime);
  }

  // 计算歌词显示提前量
  public calculateAdvanceAmount(): number {
    let advance = 0;
    
    // 根据不同的设置计算提前量
    if (this.state.advanceLyricTiming) {
      advance = 0.1; // 基础提前0.1秒
      
      // 如果启用了歌词弹簧效果，可以适当增加提前量
      if (this.state.enableLyricSpring) {
        advance += 0.05;
      }
    }
    
    return advance;
  }

  // 调整歌词时间以匹配音频
  public adjustLyricToAudio(lyricTime: number, audioTime: number): number {
    // 计算歌词时间与音频时间的差值
    const difference = lyricTime - audioTime;
    
    // 如果差值超过一定阈值，可以进行调整
    if (Math.abs(difference) > 0.5) { // 如果差值超过0.5秒
      // 可以在这里实现自动调整逻辑
    }
    
    return lyricTime;
  }
}