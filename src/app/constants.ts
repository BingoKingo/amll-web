import type { PlayerState } from "./types";

// 默认的PlayerState配置
export const DEFAULT_PLAYER_STATE: PlayerState = {
  musicUrl: "",
  lyricUrl: "",
  coverUrl: "",
  songTitle: "",
  songArtist: "",
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  loopPlay: false,
  autoPlay: false,
  lyricDelay: 0,
  backgroundType: "amll",
  backgroundDynamic: true,
  backgroundFlowSpeed: 100,
  backgroundColorMask: true,
  backgroundMaskColor: "#000000",
  invertColors: false,
  originalInvertColors: false,
  imageBlurLevel: 8,
  manualDominantColor: null,
  manualDominantColorLight: null,
  manualDominantColorDark: null,
  backgroundMaskOpacity: 0.6,
  showStats: false,
  marqueeEnabled: true,
  roundedCover: 10,
  coverRotationSpeed: 15,
  backgroundRenderScale: 1,
  backgroundFPS: 60,
  lyricAlignPosition: 50,
  hidePassedLyrics: false,
  enableLyricBlur: true,
  enableLyricScale: true,
  enableLyricSpring: true,
  wordFadeWidth: 10,
  lyricAlignAnchor: "center",
  showRemainingTime: false,
  showTranslatedLyric: false,
  showRomanLyric: false,
  swapLyricPositions: false,
  showbgLyric: true,
  swapDuetsPositions: false,
  advanceLyricTiming: false,
  singleLyrics: false,
  backgroundLowFreqVolume: 100,
  coverStyle: "normal",
  fftDataRangeMin: 0,
  fftDataRangeMax: 255,
  posYSpringMass: 0.5,
  posYSpringDamping: 12,
  posYSpringStiffness: 120,
  posYSpringSoft: true,
  scaleSpringMass: 0.5,
  scaleSpringDamping: 12,
  scaleSpringStiffness: 120,
  scaleSpringSoft: true,
  isRangeMode: false,
  rangeStartTime: 0,
  rangeEndTime: 0,
};

// 背景类型枚举
export const BACKGROUND_TYPES = {
  AMLL: "amll",
  CSS: "css",
  SOLID: "solid",
} as const;

// 封面样式枚举
export const COVER_STYLES = {
  NORMAL: "normal",
  INNER_SHADOW: "innerShadow",
  THREE_D_SHADOW: "threeDShadow",
  LONG_SHADOW: "longShadow",
  NEUMORPHISM_A: "neumorphismA",
  NEUMORPHISM_B: "neumorphismB",
  REFLECTION: "reflection",
  CD: "cd",
  VINYL: "vinyl",
  COLORED: "colored",
} as const;

// 对齐锚点枚举
export const ALIGN_ANCHORS = {
  CENTER: "center",
  TOP: "top",
  BOTTOM: "bottom",
} as const;

// 默认主色调
export const DEFAULT_DOMINANT_COLOR = "#fd9c9b";

// DOM选择器常量
export const DOM_SELECTORS = {
  PLAYER: ".player",
  PLAY_BUTTON: ".play-button",
  PROGRESS_BAR: ".progress-bar",
  PROGRESS_FILL: ".progress-fill",
  TIME_DISPLAY: ".time-display",
  SONG_TITLE: ".song-title",
  SONG_ARTIST: ".song-artist",
  ALBUM_COVER: ".album-cover-large",
  LYRICS_PANEL: ".lyrics-panel",
  // 更多选择器...
};

// 动画持续时间常量
export const ANIMATION_DURATIONS = {
  COVER_ROTATION: 60, // 秒
  FADE_IN: 300, // 毫秒
  FADE_OUT: 300, // 毫秒
  MARQUEE_SPEED: 300, // 毫秒
};

// 其他常量

export const MAX_ROUNDED_COVER = 100;
// 用于阈值判断的常量

// 存储相关常量
export const STORAGE_KEY = "amll-player-state";
export const STORAGE_VERSION = "1.0.0";

export function getDefaultState(): PlayerState {
  // 返回默认状态的深拷贝，避免引用问题
  return JSON.parse(JSON.stringify(DEFAULT_PLAYER_STATE));
}