import type { LyricLine } from "@applemusic-like-lyrics/core";
import type { spring } from "@applemusic-like-lyrics/core";
import type { LyricPlayer } from "../lyrics/lyrics";

export type SpringParams = spring.SpringParams;

export interface PlayerState {
  musicUrl: string;
  lyricUrl: string;
  coverUrl: string;
  songTitle: string;
  songArtist: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  loopPlay: boolean;
  autoPlay: boolean;
  lyricDelay: number;
  backgroundType: "amll" | "css" | "solid";
  backgroundDynamic: boolean;
  backgroundFlowSpeed: number;
  backgroundColorMask: boolean;
  backgroundMaskColor: string;
  invertColors: boolean;
  originalInvertColors: boolean;
  imageBlurLevel: number;
  manualDominantColor: string | null;
  manualDominantColorLight: string | null;
  manualDominantColorDark: string | null;
  backgroundMaskOpacity: number;
  showStats: boolean;
  marqueeEnabled: boolean;
  roundedCover: number;
  coverRotationSpeed: number;
  backgroundRenderScale: number;
  backgroundFPS: number;
  lyricAlignPosition: number;
  hidePassedLyrics: boolean;
  enableLyricBlur: boolean;
  enableLyricScale: boolean;
  enableLyricSpring: boolean;
  wordFadeWidth: number;
  lyricAlignAnchor: "center" | "top" | "bottom";
  showRemainingTime: boolean;
  showTranslatedLyric: boolean;
  showRomanLyric: boolean;
  swapLyricPositions: boolean;
  showbgLyric: boolean;
  swapDuetsPositions: boolean;
  advanceLyricTiming: boolean;
  singleLyrics: boolean;
  backgroundLowFreqVolume: number;
  coverStyle:
    | "normal"
    | "innerShadow"
    | "threeDShadow"
    | "longShadow"
    | "neumorphismA"
    | "neumorphismB"
    | "reflection"
    | "cd"
    | "vinyl"
    | "colored";
  fftDataRangeMin: number;
  fftDataRangeMax: number;
  posYSpringMass: number;
  posYSpringDamping: number;
  posYSpringStiffness: number;
  posYSpringSoft: boolean;
  scaleSpringMass: number;
  scaleSpringDamping: number;
  scaleSpringStiffness: number;
  scaleSpringSoft: boolean;
  isRangeMode: boolean;
  rangeStartTime: number;
  rangeEndTime: number;
}

export interface IDomCache {
  // DOM元素缓存接口
  getElement<T extends HTMLElement>(key: string): T | null;
}

export interface IDomUpdate {
  // UI更新接口
  updateTimeDisplay(
    currentTime: number,
    duration: number,
    showRemaining: boolean
  ): void;
  updateProgressBar(currentTime: number, duration: number): void;
  updatePlayButton(isPlaying: boolean): void;
  updateTitleAndArtist(title: string, artist: string): void;
  // 更多UI更新方法...
}

export interface IAudioController {
  // 音频控制接口
  play(): void;
  pause(): void;
  seek(time: number): void;
  setVolume(volume: number): void;
  setPlaybackRate(rate: number): void;
  setLoop(loop: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  isPlaying(): boolean;
}

export interface ILyricController {
  // 歌词控制接口
  loadLyric(content: string, filename?: string): Promise<void>;
  setTime(time: number): void;
  setDelay(delay: number): void;
  setShowTranslatedLyric(show: boolean): void;
  setShowRomanLyric(show: boolean): void;
  // 更多歌词控制方法...
}

export interface IBackgroundController {
  // 背景控制接口
  setType(type: "amll" | "css" | "solid"): void;
  setDynamic(dynamic: boolean): void;
  setFlowSpeed(speed: number): void;
  setRenderScale(scale: number): void;
  setFPS(fps: number): void;
  updateColors(
    dominantColor: string,
    lightColor: string | null,
    darkColor: string | null
  ): void;
}

export interface IColorExtractor {
  // 颜色抽取接口
  extractFromImage(image: HTMLImageElement): Promise<[number, number, number]>;
  setManualColor(color: string | null): void;
  getCurrentColors(): {
    dominantColor: string;
    lightColor: string | null;
    darkColor: string | null;
  };
}
