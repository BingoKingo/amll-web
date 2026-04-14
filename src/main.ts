import * as lyrics from "@applemusic-like-lyrics/lyric";
import "@applemusic-like-lyrics/core/style.css";
import {
  type LyricLine as RawLyricLine,
  parseLrc,
  parseLys,
  parseQrc,
  parseTTML,
  parseYrc,
} from "@applemusic-like-lyrics/lyric";
import {
  isESLyRiCFormat,
  isLyRiCA2Format,
  isSPLFormat,
  isWalaokeFormat,
  parseESLyRiC,
  parseLyRiCA2,
  parseSPL,
  parseWalaoke,
  convertToTTML,
} from "./lyric/lyric-parsers";
import { isAssFormat, parseAss, assToTTML } from "./lyric/ass-parser";
import { isLqeFormat, parseLqe, lqeToTTML } from "./lyric/lqe-parser";
import { isLylFormat, parseLyl, lylToTTML } from "./lyric/lyl-parser";
import { isSrtFormat, parseSrt, srtToTTML } from "./lyric/srt-parser";

// 导入测试脚本（仅在开发环境中使用）
import { getCurrentLanguage, setCurrentLanguage, t } from "./i18n";
import GUI from "lil-gui";
import Stats from "stats.js";
import ColorThief from 'colorthief';
import type { LyricLine } from "@applemusic-like-lyrics/core";
import {
  BackgroundRender,
  MeshGradientRenderer,
  PixiRenderer,
} from "@applemusic-like-lyrics/core";
import {
  DomLyricPlayer as BaseDomLyricPlayer,
  type LyricLineMouseEvent,
} from "@applemusic-like-lyrics/core";
import type { spring } from "@applemusic-like-lyrics/core";
type SpringParams = spring.SpringParams;
(window as any).lyrics = lyrics;
import { SpeedInsights } from "@vercel/speed-insights/next"

declare global {
  interface Window {
    __AMLL_DEFAULT_ALBUM__?: string;
  }
}

const DEFAULT_AMLL_COVER_URL = (() => {
  if (typeof window !== "undefined") {
    const override = window.__AMLL_DEFAULT_ALBUM__;
    if (typeof override === "string" && override.trim()) {
      return override;
    }
  }
  return "./icons/icon-512x512.png";
})();

const FAMYLIAM_SEEN_APP_VERSION_KEY = "famyliam_seen_app_version";
const FAMYLIAM_UPDATE_RETURN_URL_KEY = "famyliam_update_return_url";
const FAMYLIAM_UPDATE_LAST_CHECK_AT_KEY = "famyliam_update_last_check_at";
const FAMYLIAM_UPDATE_CONFIRM_PARAM = "famyliam_update_confirm";

function normalizeAppVersion(value: unknown): string {
  const text = String(value ?? "").trim();
  return text || "0.0.0-dev";
}

async function shouldBlockWithVersionGate(): Promise<boolean> {
  try {
    const response = await fetch("/api/runtime/version", {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      return false;
    }

    const payload = await response.json();
    const serverVersion = normalizeAppVersion(payload?.app_version);
    const currentUrl = new URL(window.location.href);
    const rawConfirmVersion = currentUrl.searchParams.get(FAMYLIAM_UPDATE_CONFIRM_PARAM);
    const hasConfirmVersion = rawConfirmVersion !== null && rawConfirmVersion.trim() !== "";
    const confirmVersion = hasConfirmVersion ? normalizeAppVersion(rawConfirmVersion) : "";
    if (hasConfirmVersion && confirmVersion === serverVersion) {
      window.localStorage.setItem(FAMYLIAM_SEEN_APP_VERSION_KEY, serverVersion);
      window.localStorage.setItem(FAMYLIAM_UPDATE_LAST_CHECK_AT_KEY, new Date().toISOString());
      currentUrl.searchParams.delete(FAMYLIAM_UPDATE_CONFIRM_PARAM);
      window.history.replaceState({}, "", currentUrl.toString());
      return false;
    }

    const cachedRaw = window.localStorage.getItem(FAMYLIAM_SEEN_APP_VERSION_KEY);
    const cachedVersion = normalizeAppVersion(cachedRaw);
    const mismatch = !cachedRaw || cachedVersion !== serverVersion;
    if (!mismatch) {
      window.localStorage.setItem(FAMYLIAM_UPDATE_LAST_CHECK_AT_KEY, new Date().toISOString());
      return false;
    }

    window.localStorage.setItem(FAMYLIAM_UPDATE_RETURN_URL_KEY, window.location.href);
    window.localStorage.setItem(FAMYLIAM_UPDATE_LAST_CHECK_AT_KEY, new Date().toISOString());
    const nextUrl = new URL("/update-screen", window.location.origin);
    nextUrl.searchParams.set("target", serverVersion);
    window.location.replace(nextUrl.toString());
    return true;
  } catch {
    return false;
  }
}

const originalFetch = typeof window !== "undefined" ? window.fetch.bind(window) : null;

function normalizeBackendUrl(input: string): string {
  if (!input || input[0] !== ":") {
    return input;
  }

  const match = /^:(\d+)(\/.*)?$/.exec(input);
  if (!match) {
    return input;
  }

  const [, port, rest = ""] = match;
  const protocol = window.location?.protocol || "http:";
  const hostname = window.location?.hostname || "127.0.0.1";
  return `${protocol}//${hostname}:${port}${rest}`;
}

if (originalFetch) {
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string") {
      input = normalizeBackendUrl(input);
    }
    return originalFetch(input, init);
  }) as typeof window.fetch;
}

function resolveDefaultCover(input?: string | null): string {
  const candidate = typeof input === "string" ? input.trim() : "";
  return candidate ? candidate : DEFAULT_AMLL_COVER_URL;
}

interface PlayerState {
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
  playbackRate: number;
  volume: number;
  lyricDelay: number;
  backgroundType: 'fluid' | 'cover' | 'solid';
  backgroundDynamic: boolean;
  backgroundFlowSpeed: number;
  backgroundColorMask: boolean;
  backgroundMaskColor: string;
  invertColors: boolean;
  originalInvertColors: boolean;
  coverBlurLevel: number;
  manualDominantColor: string | null;
  manualDominantColorLight: string | null;
  manualDominantColorDark: string | null;
  backgroundMaskOpacity: number;
  showFPS: boolean;
  marqueeEnabled: boolean;
  roundedCover: number;
  coverRotationSpeed: number;
  backgroundRenderScale: number;
  backgroundFPS: number;
  lyricAlignPosition: number;
  lyricFontSize: number;
  hidePassedLyrics: boolean;
  enableLyricBlur: boolean;
  enableLyricScale: boolean;
  enableLyricSpring: boolean;
  wordFadeWidth: number;
  lyricAlignAnchor: 'center' | 'top' | 'bottom';
  showRemainingTime: boolean;
  showTranslatedLyric: boolean;
  showRomanLyric: boolean;
  swapLyricPositions: boolean;
  showbgLyric: boolean;
  swapDuetsPositions: boolean;
  advanceLyricTiming: boolean;
  singleLyrics: boolean;
  backgroundLowFreqVolume: number;
  backgroundBeatEnabled: boolean;
  coverStyle: 'normal' | 'innerShadow' | 'threeDShadow' | 'longShadow' | 'neumorphismA' | 'neumorphismB' | 'reflection' | 'cd' | 'vinyl' | 'colored';
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

const SETTINGS_STORAGE_KEY = 'amll_background_settings';

const DEFAULT_PLAYER_STATE: PlayerState = {
  musicUrl: "",
  lyricUrl: "",
  coverUrl: "",
  songTitle: "",
  songArtist: "",
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  loopPlay: true,
  autoPlay: true,
  playbackRate: 1.0,
  volume: 50,
  lyricDelay: 0,
  backgroundType: 'fluid',
  backgroundDynamic: true,
  backgroundFlowSpeed: 4,
  backgroundColorMask: true,
  backgroundMaskColor: '#FFFFFF',
  invertColors: false,
  originalInvertColors: false,
  coverBlurLevel: 100,
  manualDominantColor: null,
  manualDominantColorLight: null,
  manualDominantColorDark: null,
  backgroundMaskOpacity: 70,
  showFPS: false,
  marqueeEnabled: true,
  roundedCover: 55,
  coverRotationSpeed: 0,
  backgroundRenderScale: 1,
  backgroundFPS: 60,
  lyricAlignPosition: 0.4,
  lyricFontSize: 100,
  hidePassedLyrics: false,
  enableLyricBlur: true,
  enableLyricScale: true,
  enableLyricSpring: true,
  wordFadeWidth: 0.50,
  lyricAlignAnchor: 'center',
  showRemainingTime: false,
  showTranslatedLyric: true,
  showRomanLyric: true,
  swapLyricPositions: false,
  showbgLyric: true,
  swapDuetsPositions: false,
  advanceLyricTiming: false,
  singleLyrics: false,
  backgroundLowFreqVolume: 1,
  backgroundBeatEnabled: false,
  coverStyle: 'normal',
  posYSpringMass: 1,
  posYSpringDamping: 15,
  posYSpringStiffness: 100,
  posYSpringSoft: false,
  scaleSpringMass: 1,
  scaleSpringDamping: 20,
  scaleSpringStiffness: 100,
  scaleSpringSoft: false,
  isRangeMode: false,
  rangeStartTime: 0,
  rangeEndTime: 0,
};

const cloneDefaultState = (): PlayerState => JSON.parse(JSON.stringify(DEFAULT_PLAYER_STATE));

const readStoredSettings = (): Record<string, unknown> => {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const BOOLEAN_TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const BOOLEAN_FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);

const AMLL_PALETTE_PIXELATE = 10;
const AMLL_PALETTE_TARGET = 16;
const AMLL_LIGHTNESS_MIN_DELTA = -25;
const AMLL_LIGHTNESS_MAX_DELTA = 100;
const AMLL_NOISE_SCALE = 15;
const AMLL_DARKEN_MAX = 40;
const AMLL_BEAT_CURVE_MAGIC = 'AMBG';
const AMLL_BEAT_CURVE_MAGIC_LEVELS = 'AMBC';
const AMLL_GAIN_MIN = 0.6;
const AMLL_GAIN_MAX = 3.0;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const hexToHsl = (hex: string) => {
  if (!hex || typeof hex !== 'string') return null;
  let normalized = hex.trim().replace('#', '');
  if (normalized.length === 3) {
    normalized = normalized.split('').map((c) => c + c).join('');
  }
  if (normalized.length !== 6) return null;
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const delta = max - min;
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / delta) % 6;
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      default:
        h = (r - g) / delta + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
};

const hslToRgb = (h: number, s: number, l: number) => {
  const sat = clamp(s, 0, 100) / 100;
  const lig = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lig - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h >= 0 && h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return { r: r + m, g: g + m, b: b + m };
};

function parseBooleanParam(raw: string): boolean {
  const normalized = raw.trim().toLowerCase();
  if (BOOLEAN_TRUE_VALUES.has(normalized)) {
    return true;
  }
  if (BOOLEAN_FALSE_VALUES.has(normalized)) {
    return false;
  }
  return normalized.length > 0;
}

function parseUrlParamValue(raw: string, defaultValue: any): any | undefined {
  if (typeof defaultValue === 'boolean') {
    return parseBooleanParam(raw);
  }
  if (typeof defaultValue === 'number') {
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) {
      return undefined;
    }
    return parsed;
  }
  if (defaultValue === null) {
    return raw;
  }
  return raw;
}

function parseVolumeAlias(raw: string): number | undefined {
  const volInput = Number(raw);
  if (Number.isNaN(volInput)) {
    return undefined;
  }
  if (volInput > 1 && volInput <= 100) {
    return Math.round(volInput);
  }
  if (volInput >= 0 && volInput <= 1) {
    return Math.round(volInput * 100);
  }
  if (volInput > 100) {
    return 100;
  }
  if (volInput < 0) {
    return 0;
  }
  return undefined;
}

const URL_METADATA_STATE_KEYS: (keyof PlayerState)[] = [
  'musicUrl',
  'lyricUrl',
  'coverUrl',
  'songTitle',
  'songArtist',
  'currentTime',
  'duration',
  'isPlaying'
];

const STYLE_PARAM_KEYS = (Object.keys(DEFAULT_PLAYER_STATE) as (keyof PlayerState)[]).filter(
  (key) => !URL_METADATA_STATE_KEYS.includes(key)
);

const URL_ALIAS_CONFIG: Record<
  string,
  { property: keyof PlayerState; parse?: (raw: string, defaultValue: any) => any }
> = {
  ms: { property: 'lyricDelay' },
  x: { property: 'playbackRate' },
  vol: {
    property: 'volume',
    parse: (raw) => parseVolumeAlias(raw)
  },
  loop: { property: 'loopPlay', parse: (raw) => parseBooleanParam(raw) },
  auto: { property: 'autoPlay', parse: (raw) => parseBooleanParam(raw) },
  t: {
    property: 'rangeStartTime',
    parse: () => 0
  },
  te: {
    property: 'rangeEndTime',
    parse: (raw) => {
      const parsed = Number(raw);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
  }
};

const DYNAMIC_COVER_PARAM_KEYS = [
  'dynamicCover',
  'dynamicCoverSrc',
  'coverVideo',
  'videoCover',
  'videoUrl',
  'video_url'
] as const;

const DYNAMIC_COVER_POSTER_PARAM_KEYS = [
  'dynamicCoverPoster',
  'coverVideoPoster',
  'coverPoster',
  'videoPoster'
] as const;

const DYNAMIC_COVER_VIDEO_EXTENSIONS = [
  '.mp4',
  '.webm',
  '.ogg',
  '.ogv',
  '.m4v',
  '.mov'
] as const;

const DYNAMIC_COVER_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
  '.svg',
  '.avif',
  '.apng'
] as const;

function getFirstUrlParamValue(urlParams: URLSearchParams, keys: readonly string[]): string {
  for (const key of keys) {
    const value = urlParams.get(key);
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function isLikelyVideoSource(input?: string | null): boolean {
  const candidate = typeof input === 'string' ? normalizeBackendUrl(input.trim()) : '';
  if (!candidate) {
    return false;
  }

  if (candidate.startsWith('data:video/')) {
    return true;
  }

  if (candidate.startsWith('data:image/')) {
    return false;
  }

  if (candidate.startsWith('blob:')) {
    return true;
  }

  try {
    const parsed = new URL(candidate, window.location.href);
    const hostname = (parsed.hostname || '').toLowerCase();
    const pathname = decodeURIComponent(parsed.pathname).toLowerCase();
    const fullUrl = parsed.toString().toLowerCase();

    if (hostname === 'mvod.itunes.apple.com') {
      return true;
    }

    if (DYNAMIC_COVER_VIDEO_EXTENSIONS.some((ext) => fullUrl.includes(ext))) {
      return true;
    }

    if (DYNAMIC_COVER_IMAGE_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
      return false;
    }

    return /(^https?:\/\/)|(^\/)|(^\.\/)|(^\.\.\/)|(^:)/.test(candidate);
  } catch {
    const lower = candidate.toLowerCase();
    if (DYNAMIC_COVER_VIDEO_EXTENSIONS.some((ext) => lower.includes(ext))) {
      return true;
    }
    if (DYNAMIC_COVER_IMAGE_EXTENSIONS.some((ext) => lower.includes(ext))) {
      return false;
    }
    return true;
  }
}

type BeatCurveMode = 'levels' | 'gain';

type BeatCurveBase = {
  bandCount: number;
  frameMs: number;
  frameCount: number;
  data: Uint8Array;
};

type BeatCurveLevels = BeatCurveBase & { mode: 'levels' };
type BeatCurveGain = BeatCurveBase & { mode: 'gain' };
type BeatCurve = BeatCurveLevels | BeatCurveGain;

type BeatCurveSampleLevels = { mode: 'levels'; globalEnergy: number; levels: number[] };
type BeatCurveSampleGain = { mode: 'gain'; gains: number[] };
type BeatCurveSample = BeatCurveSampleLevels | BeatCurveSampleGain;

type BeatState = {
  basePaletteHsl: Array<{ h: number; l: number; baseS: number; origS?: number }>;
  analyser: AnalyserNode | null;
  audioContext: AudioContext | null;
  freqData: Uint8Array<ArrayBuffer> | null;
  rafId: number | null;
  renderer: any;
  enabled: boolean;
  lastColors: Array<{ r: number; g: number; b: number }> | null;
  smoothing: number;
  originalMeshColors: Array<[number, number, number] | null> | null;
  originalMeshSize: { width: number; height: number } | null;
  bandStats: Array<{ ema: number; dev: number }>;
  globalEnergy: number;
  beatCurve: BeatCurve | null;
};

class WebLyricsPlayer {
  private audio: HTMLAudioElement;
  private lyricPlayer: BaseDomLyricPlayer;
  private background: BackgroundRender<PixiRenderer | MeshGradientRenderer>;
  private coverBlurBackground: HTMLDivElement;
  private beatCurvePollTimer: number | null = null;
  private beatCurveRequestInFlight = false;
  private beatCurvePath: string | null = null;
  private beatState: BeatState = {
    basePaletteHsl: [],
    analyser: null,
    audioContext: null,
    freqData: null,
    rafId: null,
    renderer: null,
    enabled: false,
    lastColors: null,
    smoothing: 0.12,
    originalMeshColors: null,
    originalMeshSize: null,
    bandStats: [],
    globalEnergy: 0,
    beatCurve: null
  };
  private coverPaletteHsl: Array<{ h: number; l: number; baseS: number; origS?: number }> = [];
  private coverBlurBaseScale = 1.1;
  private stats: Stats;
  private state: PlayerState;
  private rangeStartLine: HTMLElement | null = null;
  private rangeEndLine: HTMLElement | null = null;
  private rangeProgressBar: HTMLElement | null = null;
  private rangeSelectionCount = 0;
  private isInitialized = false;
  private hasLyrics = false;
  private gui: GUI | null = null;
  private urlOverrides = new Set<string>();
  private isHydratingSettings = true;
  private fluidBackgroundRefreshTimer: number | null = null;
  private fluidBackgroundRefreshReason: string | null = null;
  private hasPerformedFluidBackgroundReplay = false;
  private colorThief: ColorThief;
  private static debounce(func: Function, wait: number) {
    let timeout: number | null = null;
    return function executedFunction(...args: any[]) {
      const later = () => {
        if (timeout) {
          clearTimeout(timeout);
        }
        func(...args);
      };
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = window.setTimeout(later, wait);
    };
  }
  private dominantColor: string = '#fd9c9b';
  private marqueeObserver: MutationObserver | null = null;
  private handleResizeBound: (() => void) | null = null;
  private titleMarqueeInterval: number | null = null;
  private mediaSessionRefreshTimeout: number | null = null;
  private originalTitle: string = '';
  private originalLyricLines: any[] = [];
  private processedLyricLines: LyricLine[] = [];
  private musicFile: HTMLInputElement | null = null;
  private lyricFile: HTMLInputElement | null = null;
  private coverFile: HTMLInputElement | null = null;
  private musicFileBtn: HTMLElement | null = null;
  private lyricFileBtn: HTMLElement | null = null;
  private coverFileBtn: HTMLElement | null = null;
  private songTitleInput: HTMLInputElement | null = null;
  private songArtistInput: HTMLInputElement | null = null;
  private albumCoverLarge: HTMLImageElement | null = null;
  private albumCoverContainer: HTMLElement | null = null;
  private albumCoverVideo: HTMLVideoElement | null = null;
  private roundedCoverSlider: HTMLInputElement | null = null;
  private roundedCoverValue: HTMLElement | null = null;
  private coverRotationSlider: HTMLInputElement | null = null;
  private coverRotationValue: HTMLElement | null = null;
  private coverStyleSelect: HTMLSelectElement | null = null;
  private songTitle: HTMLElement | null = null;
  private songArtist: HTMLElement | null = null;
  private albumInfo: HTMLElement | null = null;
  private timeDisplay: HTMLElement | null = null;
  private progressBar: HTMLElement | null = null;
  private progressFill: HTMLElement | null = null;
  private lyricsPanel: HTMLElement | null = null;
  private player: HTMLElement | null = null;
  private playButton: HTMLElement | null = null;
  private landscapePlayBtn: HTMLElement | null = null;
  private controlPanel: HTMLElement | null = null;
  private languageSelect: HTMLSelectElement | null = null;
  private fullscreenButton: HTMLElement | null = null;
  private fullscreenEnterIcon: HTMLElement | null = null;
  private fullscreenExitIcon: HTMLElement | null = null;
  private status: HTMLElement | null = null;
  private statusText: HTMLElement | null = null;
  private bgFlowSpeed: HTMLInputElement | null = null;
  private bgFlowSpeedValue: HTMLElement | null = null;
  private bgColorMask: HTMLInputElement | null = null;
  private bgMaskColor: HTMLInputElement | null = null;
  private bgMaskOpacity: HTMLInputElement | null = null;
  private bgMaskOpacityValue: HTMLElement | null = null;
  private showFPSCheckbox: HTMLInputElement | null = null;
  private backgroundStyleSelect: HTMLSelectElement | null = null;
  private coverBlurLevel: HTMLInputElement | null = null;
  private coverBlurLevelValue: HTMLElement | null = null;
  private invertColorsCheckbox: HTMLInputElement | null = null;
  private dominantColorInput: HTMLInputElement | null = null;
  private dominantColorLightInput: HTMLInputElement | null = null;
  private dominantColorDarkInput: HTMLInputElement | null = null;
  private enableMarqueeCheckbox: HTMLInputElement | null = null;
  private bgRenderScale: HTMLInputElement | null = null;
  private fluidDesc: HTMLElement | null = null;
  private coverDesc: HTMLElement | null = null;
  private solidDesc: HTMLElement | null = null;
  private solidOptions: NodeListOf<HTMLElement> | null = null;
  private recordOptions: NodeListOf<HTMLElement> | null = null;
  private bgRenderScaleValue: HTMLElement | null = null;
  private bgFPS: HTMLInputElement | null = null;
  private bgFPSValue: HTMLElement | null = null;
  private lyricAlignPosition: HTMLInputElement | null = null;
  private lyricAlignPositionValue: HTMLElement | null = null;
  private lyricFontSize: HTMLInputElement | null = null;
  private lyricFontSizeValue: HTMLElement | null = null;
  private hidePassedLyricsCheckbox: HTMLInputElement | null = null;
  private bgLowFreqVolume: HTMLInputElement | null = null;
  private bgLowFreqVolumeValue: HTMLElement | null = null;
  private backgroundBeatCheckbox: HTMLInputElement | null = null;
  private enableLyricBlur: HTMLInputElement | null = null;
  private enableLyricScale: HTMLInputElement | null = null;
  private enableLyricSpring: HTMLInputElement | null = null;
  private wordFadeWidthInput: HTMLInputElement | null = null;
  private wordFadeWidthValue: HTMLElement | null = null;
  private showbgLyricCheckbox: HTMLInputElement | null = null;
  private swapDuetsPositionsCheckbox: HTMLInputElement | null = null;
  private advanceLyricTimingCheckbox: HTMLInputElement | null = null;
  private singleLyricsCheckbox: HTMLInputElement | null = null;
  private playbackRateValue: HTMLElement | null = null;
  private playbackRateControl: HTMLInputElement | null = null;
  private volumeControl: HTMLInputElement | null = null;
  private volumeValue: HTMLElement | null = null;
  private speedLowIcon: HTMLElement | null = null;
  private speedMediumIcon: HTMLElement | null = null;
  private speedHighIcon: HTMLElement | null = null;
  private volumeOffIcon: HTMLElement | null = null;
  private volumeLowIcon: HTMLElement | null = null;
  private volumeMediumIcon: HTMLElement | null = null;
  private volumeHighIcon: HTMLElement | null = null;
  private loopPlayCheckbox: HTMLInputElement | null = null;
  private musicUrl: HTMLInputElement | null = null;
  private lyricUrl: HTMLTextAreaElement | null = null;
  private coverUrl: HTMLInputElement | null = null;
  private albumSidePanel: HTMLElement | null = null;
  private loadFromUrlBtn: HTMLElement | null = null;
  private hasAutoLoadedFromUrl = false;
  private urlLyricDelayOverride: number | null = null;
  private pendingControlPointCodeFromUrl: string | null = null;
  private loadFilesBtn: HTMLElement | null = null;
  private resetPlayerBtn: HTMLElement | null = null;
  private toggleControlsBtn: HTMLElement | null = null;
  private lyricAlignAnchorSelect: HTMLSelectElement | null = null;
  private lyricDelayInput: HTMLInputElement | null = null;
  private pendingLyricDelay: number | null = null;
  private amllLyricPlayer: HTMLElement | null = null;
  private lyricAreaHint: HTMLElement | null = null;
  private coverStyleDynamic: HTMLElement | null = null;
  private songTitleDisplay: HTMLElement | null = null;
  private songArtistDisplay: HTMLElement | null = null;
  private landscapeTimeDisplay: HTMLElement | null = null;
  private landscapeProgressFill: HTMLElement | null = null;
  private landscapeCover: HTMLElement | null = null;
  private playControls: HTMLElement | null = null;
  private showTranslatedLyricCheckbox: HTMLInputElement | null = null;
  private showRomanLyricCheckbox: HTMLInputElement | null = null;
  private swapLyricPositionsCheckbox: HTMLInputElement | null = null;
  private waveformCanvas: HTMLCanvasElement | null = null;
  private waveformContext: CanvasRenderingContext2D | null = null;
  private cachedWaveform: Float32Array | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private touchExitTimeout: number | null = null;
  private posYSpringMassInput: HTMLInputElement | null = null;
  private posYSpringDampingInput: HTMLInputElement | null = null;
  private posYSpringStiffnessInput: HTMLInputElement | null = null;
  private posYSpringSoftCheckbox: HTMLInputElement | null = null;
  private scaleSpringMassInput: HTMLInputElement | null = null;
  private scaleSpringDampingInput: HTMLInputElement | null = null;
  private scaleSpringStiffnessInput: HTMLInputElement | null = null;
  private scaleSpringSoftCheckbox: HTMLInputElement | null = null;
  private springPosYMassValue: HTMLElement | null = null;
  private springPosYDampingValue: HTMLElement | null = null;
  private springPosYStiffnessValue: HTMLElement | null = null;
  private springScaleMassValue: HTMLElement | null = null;
  private springScaleDampingValue: HTMLElement | null = null;
  private springScaleStiffnessValue: HTMLElement | null = null;
  private controlPointCodeInput: HTMLInputElement | null = null;
  private dynamicCoverUrl = '';
  private dynamicCoverPosterUrl = '';
  private dynamicCoverLoadFailed = false;
  private handleDynamicCoverLoaded = () => {
    if (!this.albumCoverVideo || !this.dynamicCoverUrl) {
      return;
    }

    const hasPoster = Boolean(this.albumCoverVideo.getAttribute('poster'));
    if (!hasPoster && this.albumCoverVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return;
    }

    this.dynamicCoverLoadFailed = false;
    this.albumCoverContainer?.classList.add('amll-dynamic-cover-ready');
    this.albumCoverVideo.classList.add('is-ready');
    this.albumCoverVideo.style.display = 'block';
    const playPromise = this.albumCoverVideo.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
    this.updateCoverRotation();
  };
  private handleDynamicCoverError = () => {
    if (!this.dynamicCoverUrl) {
      return;
    }

    console.warn('[AMLL] Dynamic cover video failed to load:', this.dynamicCoverUrl);
    this.dynamicCoverLoadFailed = true;
    this.hideDynamicCoverVideo({ clearSource: true });
  };

  private applyI18nToDom() {
    const lang = getCurrentLanguage();
    setCurrentLanguage(lang);

    const i18nElements = document.querySelectorAll<HTMLElement>("[data-i18n]");
    i18nElements.forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      const translated = t(key);
      const isDynamic = el.getAttribute("data-i18n-dynamic") === "true";
      const hasLastApplied = el.hasAttribute("data-i18n-last");
      const lastApplied = el.getAttribute("data-i18n-last") || "";
      const currentText = (el.textContent || "").trim();
      const shouldUpdateDynamic = !hasLastApplied || !currentText || currentText === lastApplied;

      if (!isDynamic || shouldUpdateDynamic) {
        el.textContent = translated;
        el.setAttribute("data-i18n-last", translated);
      }
    });

    const attrMappings: Array<{ dataAttr: string; targetAttr: string }> = [
      { dataAttr: "data-i18n-placeholder", targetAttr: "placeholder" },
      { dataAttr: "data-i18n-title", targetAttr: "title" },
      { dataAttr: "data-i18n-aria-label", targetAttr: "aria-label" },
      { dataAttr: "data-i18n-alt", targetAttr: "alt" },
      { dataAttr: "data-i18n-content", targetAttr: "content" },
    ];

    attrMappings.forEach(({ dataAttr, targetAttr }) => {
      document.querySelectorAll<HTMLElement>(`[${dataAttr}]`).forEach((el) => {
        const key = el.getAttribute(dataAttr);
        if (!key) return;
        const value = t(key);
        if (targetAttr === "placeholder") {
          (el as HTMLInputElement | HTMLTextAreaElement).placeholder = value;
        } else {
          el.setAttribute(targetAttr, value);
        }
      });
    });

    this.updateMetaDescription();
  }

  private reapplyI18n() {
    this.applyI18nToDom();
    this.updateAlbumSidePanel();
    this.refreshPageMetadata();
    this.updateMarqueeSettings();
  }

  private getBasePageTitle(): string {
    return t("meta.pageTitle");
  }

  private buildDocumentTitle(songTitle?: string, songArtist?: string): string {
    const baseTitle = this.getBasePageTitle();
    const title = (songTitle ?? "").trim();
    const artist = (songArtist ?? "").trim();
    if (title) {
      const songInfo = artist ? `${artist} - ${title}` : title;
      return `${songInfo} | ${baseTitle}`;
    }
    return baseTitle;
  }

  private setDocumentTitle(songTitle?: string, songArtist?: string) {
    document.title = this.buildDocumentTitle(songTitle ?? this.state.songTitle, songArtist ?? this.state.songArtist);
  }

  private updateMetaDescription() {
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", t("meta.description"));
    }

    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) {
      appleTitle.setAttribute("content", this.getBasePageTitle());
    }
  }

  private refreshPageMetadata(songTitle?: string, songArtist?: string) {
    this.setDocumentTitle(songTitle, songArtist);
    this.updateMetaDescription();
  }

  private initUploadButtons() {
    if (this.musicFile) {
      this.musicFile.addEventListener('change', (e: Event) => {
        const hasFile = (e.target as HTMLInputElement).files?.[0];
        if (!this.musicFileBtn) return;

        const uploadIcon = this.musicFileBtn.querySelector('.upload-icon') as HTMLElement;
        const uploadedIcon = this.musicFileBtn.querySelector('.uploaded-icon') as HTMLElement;

        if (uploadIcon && uploadedIcon) {
          uploadIcon.style.display = hasFile ? 'none' : 'block';
          uploadedIcon.style.display = hasFile ? 'block' : 'none';
        }
      });
    }

    if (this.lyricFile) {
      this.lyricFile.addEventListener('change', (e: Event) => {
        const hasFile = (e.target as HTMLInputElement).files?.[0];
        const uploadIcon = this.lyricFileBtn?.querySelector('.upload-icon') as HTMLElement;
        const uploadedIcon = this.lyricFileBtn?.querySelector('.uploaded-icon') as HTMLElement;
        if (uploadIcon && uploadedIcon) {
          uploadIcon.style.display = hasFile ? 'none' : 'block';
          uploadedIcon.style.display = hasFile ? 'block' : 'none';
        }
      });
    }

    if (this.coverFile) {
      this.coverFile.addEventListener('change', (e: Event) => {
        const hasFile = (e.target as HTMLInputElement).files?.[0];
        const uploadIcon = this.coverFileBtn?.querySelector('.upload-icon') as HTMLElement;
        const uploadedIcon = this.coverFileBtn?.querySelector('.uploaded-icon') as HTMLElement;
        if (uploadIcon && uploadedIcon) {
          uploadIcon.style.display = hasFile ? 'none' : 'block';
          uploadedIcon.style.display = hasFile ? 'block' : 'none';
        }
      });
    }
  }

  private updateRoundedCover() {
    if (this.albumCoverLarge && this.albumCoverContainer) {
      // 将0-100%映射到0-50%的border-radius
      const borderRadius = (this.state.roundedCover / 100) * 50;
      // 通过 CSS 变量统一管理，不再直接设置 border-radius
      document.documentElement.style.setProperty('--rounded-cover-percent', borderRadius.toString());
      if (this.albumCoverVideo) {
        // albumCoverVideo 也可以添加此 CSS 变量作为后备方案
        this.albumCoverVideo.style.borderRadius = `${borderRadius}%`;
      }
    }

    if (this.roundedCoverSlider) {
      this.roundedCoverSlider.value = this.state.roundedCover.toString();
    }

    if (this.roundedCoverValue) {
      this.roundedCoverValue.textContent = `${this.state.roundedCover}%`;
    }

    this.setOptionsVisibility(this.recordOptions, this.state.roundedCover === 100, ['cd', 'vinyl', 'colored']);
    this.applyCoverStyle();
  }

  private updateLyricFontSize() {
    // 将字体大小百分比应用到歌词播放器
    const fontSizeScale = this.state.lyricFontSize / 100;
    console.log('Setting font size scale to:', fontSizeScale, 'from value:', this.state.lyricFontSize);

    // 获取当前视口大小来计算基础字体大小
    const isMobile = window.innerWidth <= 768;
    let baseFontSizeValue: number;

    if (isMobile) {
      // 移动端：max(8vw, 12px)
      const vwValue = window.innerWidth * 0.08;
      baseFontSizeValue = Math.max(vwValue, 12);
    } else {
      // 桌面端：max(max(4.7vh, 3.2vw), 12px)
      const vhValue = window.innerHeight * 0.047;
      const vwValue = window.innerWidth * 0.032;
      baseFontSizeValue = Math.max(vhValue, vwValue, 12);
    }

    // 应用缩放后的值
    const scaledFontSize = baseFontSizeValue * fontSizeScale;

    // 在所有歌词播放器元素上设置 --amll-lp-font-size CSS 变量
    const lyricPlayerElements = document.querySelectorAll('.amll-lyric-player') as NodeListOf<HTMLElement>;
    console.log(`Found ${lyricPlayerElements.length} lyric player elements`);

    lyricPlayerElements.forEach((element, index) => {
      element.style.setProperty('--amll-lp-font-size', `${scaledFontSize}px`);
      console.log(`Set --amll-lp-font-size on lyric player element ${index}: ${scaledFontSize}px`);
    });

    if (this.lyricFontSize) {
      this.lyricFontSize.value = this.state.lyricFontSize.toString();
    }

    if (this.lyricFontSizeValue) {
      this.lyricFontSizeValue.textContent = `${this.state.lyricFontSize}%`;
    }

    // 验证第一个歌词播放器的实际字体大小
    if (lyricPlayerElements.length > 0) {
      const firstPlayer = lyricPlayerElements[0];
      const computedFontSize = getComputedStyle(firstPlayer).fontSize;
      console.log('Computed font size on first lyric player:', computedFontSize);
    }
  }

  private extractComputedFontSize(fontSizeStr: string): number {
    // 从 "XXpx" 字符串中提取数值
    const match = fontSizeStr.match(/([\d.]+)px/);
    if (match) {
      return parseFloat(match[1]);
    }
    // 如果无法解析，返回默认值
    return 16;
  }

  private updateCoverRotation() {
    if (this.albumCoverLarge && this.albumCoverContainer) {
      this.albumCoverLarge.style.animation = 'none';
      if (this.albumCoverVideo) {
        this.albumCoverVideo.style.animation = 'none';
      }

      if (this.state.coverRotationSpeed !== 0) {
        this.applyCoverRotation(this.albumCoverLarge, this.albumCoverContainer);
        if (this.albumCoverVideo && this.albumCoverVideo.style.display !== 'none') {
          this.applyCoverRotation(this.albumCoverVideo, this.albumCoverContainer);
        }
      } else {
        if (this.audio.paused) {
          this.albumCoverContainer.style.transform = 'scale(0.96)';
          this.albumCoverLarge.style.transform = 'scale(1)';
          if (this.albumCoverVideo) {
            this.albumCoverVideo.style.transform = 'scale(1)';
          }
        } else {
          this.albumCoverContainer.style.transform = 'scale(1)';
          this.albumCoverLarge.style.transform = 'scale(1)';
          if (this.albumCoverVideo) {
            this.albumCoverVideo.style.transform = 'scale(1)';
          }
        }
      }
    }

    if (this.coverRotationSlider) {
      this.coverRotationSlider.value = this.state.coverRotationSpeed.toString();
    }

    if (this.coverRotationValue) {
      this.coverRotationValue.textContent = `${this.state.coverRotationSpeed}rpm`;
    }
  }

  private applyCoverRotation(
    coverElement: HTMLImageElement | HTMLVideoElement,
    albumCoverContainer: HTMLElement,
    pauseOnHover = true
  ) {
    const speed = Math.abs(this.state.coverRotationSpeed);
    const duration = 60 / speed;

    const animationName = this.state.coverRotationSpeed > 0 ? 'spin' : 'spinCounterclockwise';
    coverElement.style.animation = `${animationName} ${duration}s linear infinite`;

    const shouldPauseForHover = pauseOnHover && albumCoverContainer.matches(':hover');

    if (this.audio.paused || shouldPauseForHover) {
      coverElement.style.animationPlayState = 'paused';
      albumCoverContainer.style.transform = 'scale(0.96)';
      coverElement.style.transform = 'scale(1)';
    } else {
      coverElement.style.animationPlayState = 'running';
      albumCoverContainer.style.transform = 'scale(1)';
      coverElement.style.transform = 'scale(1)';
    }
  }

  private initDynamicCoverVideo() {
    if (!this.albumCoverContainer || this.albumCoverVideo) {
      return;
    }

    if (!document.getElementById('amllDynamicCoverStyle')) {
      const style = document.createElement('style');
      style.id = 'amllDynamicCoverStyle';
      style.textContent = `
        #albumCoverContainer {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        #albumCoverContainer .amll-cover-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: none;
          opacity: 0;
          z-index: 6;
          pointer-events: none;
          background: transparent;
          transition: opacity 0.2s ease;
        }

        #albumCoverContainer .amll-cover-video.is-ready {
          opacity: 1;
        }
      `;
      document.head.appendChild(style);
    }

    const video = document.createElement('video');
    video.id = 'albumCoverVideo';
    video.className = 'amll-cover-video';
    video.muted = true;
    video.defaultMuted = true;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.disablePictureInPicture = true;
    video.controls = false;
    video.setAttribute('aria-hidden', 'true');
    video.setAttribute('tabindex', '-1');
    video.addEventListener('loadedmetadata', this.handleDynamicCoverLoaded);
    video.addEventListener('loadeddata', this.handleDynamicCoverLoaded);
    video.addEventListener('canplay', this.handleDynamicCoverLoaded);
    video.addEventListener('error', this.handleDynamicCoverError);
    this.albumCoverContainer.appendChild(video);
    this.albumCoverVideo = video;
    this.updateRoundedCover();
  }

  private hideDynamicCoverVideo(options?: { clearSource?: boolean }) {
    if (!this.albumCoverVideo) {
      return;
    }

    this.albumCoverContainer?.classList.remove('amll-dynamic-cover-ready');
    this.albumCoverVideo.pause();
    this.albumCoverVideo.classList.remove('is-ready');
    this.albumCoverVideo.style.display = 'none';
    this.albumCoverVideo.style.opacity = '';

    if (options?.clearSource) {
      delete this.albumCoverVideo.dataset.dynamicSrc;
      this.albumCoverVideo.removeAttribute('src');
      this.albumCoverVideo.load();
    }
  }

  private syncDynamicCoverVideo() {
    if (!this.albumCoverVideo || !this.albumCoverContainer) {
      return;
    }

    const dynamicSrc = normalizeBackendUrl(this.dynamicCoverUrl);
    const posterSrc = normalizeBackendUrl(this.dynamicCoverPosterUrl || resolveDefaultCover(this.state.coverUrl));

    if (!dynamicSrc) {
      this.dynamicCoverLoadFailed = false;
      this.hideDynamicCoverVideo({ clearSource: true });
      return;
    }

    if (!isLikelyVideoSource(dynamicSrc)) {
      console.warn('[AMLL] Dynamic cover source is not a supported video:', dynamicSrc);
      this.dynamicCoverLoadFailed = true;
      this.hideDynamicCoverVideo({ clearSource: true });
      return;
    }

    if (posterSrc) {
      this.albumCoverVideo.poster = posterSrc;
    } else {
      this.albumCoverVideo.removeAttribute('poster');
    }

    const previousSrc = this.albumCoverVideo.dataset.dynamicSrc || '';
    if (previousSrc === dynamicSrc) {
      const hasPoster = Boolean(this.albumCoverVideo.getAttribute('poster'));
      if (!this.dynamicCoverLoadFailed && (hasPoster || this.albumCoverVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA)) {
        this.albumCoverVideo.style.display = 'block';
        this.albumCoverVideo.classList.add('is-ready');
        this.albumCoverContainer.classList.add('amll-dynamic-cover-ready');
      }
      return;
    }

    this.dynamicCoverLoadFailed = false;
    this.albumCoverContainer.classList.remove('amll-dynamic-cover-ready');
    this.albumCoverVideo.classList.remove('is-ready');
    this.albumCoverVideo.style.display = 'none';
    this.albumCoverVideo.pause();
    this.albumCoverVideo.dataset.dynamicSrc = dynamicSrc;
    this.albumCoverVideo.src = dynamicSrc;
    this.albumCoverVideo.load();
    const playPromise = this.albumCoverVideo.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  }

  private updateDynamicCoverFromUrlParams(urlParams: URLSearchParams) {
    const dynamicCover = getFirstUrlParamValue(urlParams, DYNAMIC_COVER_PARAM_KEYS);
    const dynamicCoverPoster = getFirstUrlParamValue(urlParams, DYNAMIC_COVER_POSTER_PARAM_KEYS);

    this.dynamicCoverUrl = dynamicCover;
    this.dynamicCoverPosterUrl = dynamicCoverPoster;
    if (!dynamicCover) {
      this.dynamicCoverLoadFailed = false;
    }
    this.syncDynamicCoverVideo();
  }

  private checkAndUpdateMarquee(element: HTMLElement | null) {
    if (!element) return;

    if (!this.state.marqueeEnabled) {
      element.classList.remove('marquee');
      element.style.setProperty('--marquee-play-state', 'paused');
      return;
    }

    requestAnimationFrame(() => {
      const originalText = element.textContent || '';
      const repeats = Math.min(5, Math.ceil(600 / originalText.length));
      const repeatedText = Array(repeats).fill(originalText).join('\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0');
      const currentDataText = element.getAttribute('data-text');
      if (currentDataText !== repeatedText) {
        element.setAttribute('data-text', repeatedText);
        requestAnimationFrame(() => {
          const isOverflowing = element.scrollWidth > element.clientWidth;
          if (isOverflowing) {
            if (!element.classList.contains('marquee')) {
              element.classList.remove('marquee');
              void element.offsetWidth;
              element.classList.add('marquee');
            }
            element.style.setProperty('--marquee-play-state', this.audio.paused ? 'paused' : 'running');
          } else {
            element.classList.remove('marquee');
          }
        });
      } else {
        const isOverflowing = element.scrollWidth > element.clientWidth;

        if (isOverflowing) {
          if (!element.classList.contains('marquee')) {
            element.classList.remove('marquee');
            void element.offsetWidth;
            element.classList.add('marquee');
          }
          element.style.setProperty('--marquee-play-state', this.audio.paused ? 'paused' : 'running');
        } else {
          element.classList.remove('marquee');
        }
      }
    });
  }

  private updateMarqueeSettings() {
    const songTitle = this.songTitle;
    const songArtist = this.songArtist;
    const baseTitle = this.getBasePageTitle();
    this.originalTitle = baseTitle;

    const updateTitleMarquee = () => {
      if (this.titleMarqueeInterval) {
        clearInterval(this.titleMarqueeInterval);
        this.titleMarqueeInterval = null;
      }

      const hasSongInfo = Boolean(this.state.songTitle || this.state.songArtist);
      const songInfo = `${this.state.songArtist ? this.state.songArtist + ' - ' : ''}${this.state.songTitle}`;
      const fullTitle = this.buildDocumentTitle(this.state.songTitle, this.state.songArtist);

      if (this.state.marqueeEnabled && hasSongInfo) {
        
        if (fullTitle.length > 50) { // 假设50字符为阈值
          let position = 0;
          const scrollTitle = () => {
            if (!this.state.marqueeEnabled || this.audio.paused) {
              document.title = fullTitle;
              return;
            }

            const visibleLength = 50;
            let displayText = fullTitle;

            if (fullTitle.length > visibleLength) {
              const startPos = position % fullTitle.length;
              displayText = fullTitle.substring(startPos) + ' ' + fullTitle.substring(0, Math.min(startPos, visibleLength));
              displayText = displayText.substring(0, visibleLength);
            }

            document.title = displayText;
            position++;
          };

          scrollTitle();

          if (!this.audio.paused) {
            this.titleMarqueeInterval = window.setInterval(scrollTitle, 300);
          }
        } else {
          document.title = fullTitle;
        }
      } else {
        if (hasSongInfo) {
          document.title = fullTitle;
        } else {
          document.title = this.originalTitle;
        }
      }
    };

    updateTitleMarquee();

    if (this.marqueeObserver) {
      this.marqueeObserver.disconnect();
    }

    this.marqueeObserver = new MutationObserver(() => {
      if (songTitle) {
        songTitle.classList.remove('marquee');
        this.checkAndUpdateMarquee(songTitle);
      }
      if (songArtist) {
        songArtist.classList.remove('marquee');
        this.checkAndUpdateMarquee(songArtist);
      }
      updateTitleMarquee();
    });

    if (songTitle) this.marqueeObserver.observe(songTitle, { childList: true, subtree: true, characterData: true });
    if (songArtist) this.marqueeObserver.observe(songArtist, { childList: true, subtree: true, characterData: true });

    this.checkAndUpdateMarquee(songTitle);
    this.checkAndUpdateMarquee(songArtist);

    if (this.handleResizeBound) {
      window.removeEventListener('resize', this.handleResizeBound);
    }

    const handleResize = WebLyricsPlayer.debounce(() => {
      if (songTitle) {
        songTitle.classList.remove('marquee');
        void songTitle.offsetWidth;
        this.checkAndUpdateMarquee(songTitle);
      }
      if (songArtist) {
        songArtist.classList.remove('marquee');
        void songArtist.offsetWidth;
        this.checkAndUpdateMarquee(songArtist);
      }
      this.updateWaveformCanvasSize();
      this.updateLayoutByOrientation();
    }, 100);

    this.handleResizeBound = handleResize.bind(this);
    window.addEventListener('resize', this.handleResizeBound);
  }

  private updateLayoutByOrientation() {
    const isPortrait = window.matchMedia("(orientation: portrait)").matches;
    const songInfoContainer = this.albumSidePanel?.querySelector('.song-info-container');

    if (isPortrait) {
      if (this.state.swapDuetsPositions) {
        if (songInfoContainer && this.albumInfo && this.albumCoverContainer) {
          songInfoContainer.insertBefore(this.albumInfo, this.albumCoverContainer);
          this.albumCoverContainer.style.marginRight = '0';
          this.albumCoverContainer.style.marginLeft = '15px';
          this.albumInfo.style.textAlign = 'right';
        }
      } else {
        if (songInfoContainer && this.albumInfo && this.albumCoverContainer) {
          songInfoContainer.insertBefore(this.albumCoverContainer, this.albumInfo);
          this.albumCoverContainer.style.marginLeft = '0';
          this.albumCoverContainer.style.marginRight = '15px';
          this.albumInfo.style.textAlign = 'left';
        }
      }
    } else {
      if (songInfoContainer && this.albumInfo && this.albumCoverContainer) {
        songInfoContainer.insertBefore(this.albumCoverContainer, this.albumInfo);
        this.albumCoverContainer.style.marginLeft = '0';
        this.albumCoverContainer.style.marginRight = '15px';
        this.albumInfo.style.textAlign = 'center';
      }

      if (this.albumSidePanel && this.lyricsPanel && this.player) {
        if (this.state.swapDuetsPositions) {
          this.player.insertBefore(this.lyricsPanel, this.albumSidePanel);
        } else {
          this.player.insertBefore(this.albumSidePanel, this.lyricsPanel);
        }
      }
    }
    this.updateLyricsDisplay();
  }

  private resetUploadButtons() {
    const uploadIcons = document.querySelectorAll('.upload-icon') as NodeListOf<HTMLElement>;
    const uploadedIcons = document.querySelectorAll('.uploaded-icon') as NodeListOf<HTMLElement>;

    uploadIcons.forEach((icon) => {
      icon.style.display = 'block';
    });

    uploadedIcons.forEach((icon) => {
      icon.style.display = 'none';
    });
  }

  private setOptionsVisibility(options: NodeListOf<HTMLElement> | null, visible: boolean, resetValues: string[] = []) {
    if (!options) return;

    options.forEach((option: HTMLElement) => {
      const optElement = option as HTMLOptionElement;
      if (visible) {
        optElement.disabled = false;
        optElement.classList.remove('option-hidden');
      } else {
        optElement.disabled = true;
        optElement.classList.add('option-hidden');
      }
    });

    if (resetValues.length > 0 && this.coverStyleSelect && resetValues.includes(this.coverStyleSelect.value)) {
      this.coverStyleSelect.value = 'normal';
      this.state.coverStyle = 'normal';
      this.applyCoverStyle();
    }
  }

  private initDOMCache() {
    this.musicFile = document.getElementById('musicFile') as HTMLInputElement;
    this.lyricFile = document.getElementById('lyricFile') as HTMLInputElement;
    this.coverFile = document.getElementById('coverFile') as HTMLInputElement;
    this.musicFileBtn = document.getElementById('musicFileBtn');
    this.lyricFileBtn = document.getElementById('lyricFileBtn');
    this.coverFileBtn = document.getElementById('coverFileBtn');
    this.songTitleInput = document.getElementById('songTitleInput') as HTMLInputElement;
    this.songArtistInput = document.getElementById('songArtistInput') as HTMLInputElement;
    this.albumCoverLarge = document.getElementById('albumCoverLarge') as HTMLImageElement;
    this.albumCoverContainer = document.getElementById('albumCoverContainer');
    this.albumInfo = document.getElementById('albumInfo');
    this.roundedCoverSlider = document.getElementById('roundedCover') as HTMLInputElement;
    this.roundedCoverValue = document.getElementById('roundedCoverValue') as HTMLElement;
    this.coverRotationSlider = document.getElementById('coverRotation') as HTMLInputElement;
    this.coverRotationValue = document.getElementById('coverRotationValue') as HTMLElement;
    this.coverStyleSelect = document.getElementById('coverStyle') as HTMLSelectElement;
    this.songTitle = document.getElementById('songTitle');
    this.songArtist = document.getElementById('songArtist');
    this.timeDisplay = document.getElementById('timeDisplay');
    this.progressBar = document.getElementById('progressBar');
    this.progressFill = document.getElementById('progressFill');
    this.waveformCanvas = document.getElementById('waveformCanvas') as HTMLCanvasElement;
    this.lyricsPanel = document.getElementById('lyricsPanel');
    this.player = document.getElementById('player');
    this.playButton = document.getElementById('playPauseBtn');
    this.landscapePlayBtn = document.getElementById('landscapePlayBtn');
    this.controlPanel = document.getElementById('controlPanel');
    this.fullscreenButton = document.getElementById('fullscreenBtn');
    this.fullscreenEnterIcon = document.querySelector('.fullscreen-enter') as HTMLElement;
    this.fullscreenExitIcon = document.querySelector('.fullscreen-exit') as HTMLElement;
    this.status = document.getElementById('status');
    this.statusText = document.getElementById('statusText');
    this.bgFlowSpeed = document.getElementById('bgFlowSpeed') as HTMLInputElement;
    this.bgFlowSpeedValue = document.getElementById('bgFlowSpeedValue');
    this.bgColorMask = document.getElementById('bgColorMask') as HTMLInputElement;
    this.bgMaskColor = document.getElementById('bgMaskColor') as HTMLInputElement;
    this.bgMaskOpacity = document.getElementById('bgMaskOpacity') as HTMLInputElement;
    this.bgMaskOpacityValue = document.getElementById('bgMaskOpacityValue');
    this.showFPSCheckbox = document.getElementById('showFPS') as HTMLInputElement;
    this.bgFPS = document.getElementById('bgFPS') as HTMLInputElement;
    this.bgFPSValue = document.getElementById('bgFPSValue') as HTMLElement;
    this.backgroundStyleSelect = document.getElementById('backgroundStyle') as HTMLSelectElement;
    this.albumSidePanel = document.getElementById('albumSidePanel');
    this.coverBlurLevel = document.getElementById('coverBlurLevel') as HTMLInputElement;
    this.coverBlurLevelValue = document.getElementById('coverBlurLevelValue');
    this.invertColorsCheckbox = document.getElementById('invertColors') as HTMLInputElement;
    this.dominantColorInput = document.getElementById('dominantColor') as HTMLInputElement;
    this.dominantColorLightInput = document.getElementById('dominantColorLight') as HTMLInputElement;
    this.dominantColorDarkInput = document.getElementById('dominantColorDark') as HTMLInputElement;
    this.enableMarqueeCheckbox = document.getElementById('enableMarquee') as HTMLInputElement;
    this.bgRenderScale = document.getElementById('bgRenderScale') as HTMLInputElement;
    this.bgRenderScaleValue = document.getElementById('bgRenderScaleValue');
    this.lyricAlignPosition = document.getElementById('lyricAlignPosition') as HTMLInputElement;
    this.lyricAlignPositionValue = document.getElementById('lyricAlignPositionValue');

    this.lyricFontSize = document.getElementById('lyricFontSize') as HTMLInputElement;
    this.lyricFontSizeValue = document.getElementById('lyricFontSizeValue');
    this.hidePassedLyricsCheckbox = document.getElementById('hidePassedLyrics') as HTMLInputElement;
    this.bgLowFreqVolume = document.getElementById('bgLowFreqVolume') as HTMLInputElement;
    this.bgLowFreqVolumeValue = document.getElementById('bgLowFreqVolumeValue');
    this.backgroundBeatCheckbox = document.getElementById('backgroundBeat') as HTMLInputElement;
    this.enableLyricBlur = document.getElementById('enableLyricBlur') as HTMLInputElement;
    this.enableLyricScale = document.getElementById('enableLyricScale') as HTMLInputElement;
    this.enableLyricSpring = document.getElementById('enableLyricSpring') as HTMLInputElement;
    this.wordFadeWidthInput = document.getElementById('wordFadeWidth') as HTMLInputElement;
    this.wordFadeWidthValue = document.getElementById('wordFadeWidthValue');
    this.showbgLyricCheckbox = document.getElementById('showbgLyric') as HTMLInputElement;
    this.swapDuetsPositionsCheckbox = document.getElementById('swapDuetsPositions') as HTMLInputElement;
    this.advanceLyricTimingCheckbox = document.getElementById('advanceLyricTiming') as HTMLInputElement;
    this.singleLyricsCheckbox = document.getElementById('singleLyrics') as HTMLInputElement;
    this.playbackRateValue = document.getElementById('playbackRateValue');
    this.playbackRateControl = document.getElementById('playbackRate') as HTMLInputElement;
    this.volumeControl = document.getElementById('volumeControl') as HTMLInputElement;
    this.volumeValue = document.getElementById('volumeValue');
    this.speedLowIcon = document.querySelector('.speed-low') as HTMLElement;
    this.speedMediumIcon = document.querySelector('.speed-medium') as HTMLElement;
    this.speedHighIcon = document.querySelector('.speed-high') as HTMLElement;
    this.volumeOffIcon = document.querySelector('.volume-off') as HTMLElement;
    this.volumeLowIcon = document.querySelector('.volume-low') as HTMLElement;
    this.volumeMediumIcon = document.querySelector('.volume-medium') as HTMLElement;
    this.volumeHighIcon = document.querySelector('.volume-high') as HTMLElement;
    this.loopPlayCheckbox = document.getElementById('loopPlay') as HTMLInputElement;
    this.showTranslatedLyricCheckbox = document.getElementById('showTranslatedLyric') as HTMLInputElement;
    this.showRomanLyricCheckbox = document.getElementById('showRomanLyric') as HTMLInputElement;
    this.swapLyricPositionsCheckbox = document.getElementById('swapLyricPositions') as HTMLInputElement;
    this.musicUrl = document.getElementById('musicUrl') as HTMLInputElement;
    this.lyricUrl = document.getElementById('lyricUrl') as HTMLTextAreaElement;
    this.coverUrl = document.getElementById('coverUrl') as HTMLInputElement;
    this.loadFromUrlBtn = document.getElementById('loadFromUrl');
    this.loadFilesBtn = document.getElementById('loadFiles');
    this.resetPlayerBtn = document.getElementById('resetPlayer');
    this.toggleControlsBtn = document.getElementById('toggleControls');
    this.lyricAlignAnchorSelect = document.getElementById('lyricAlignAnchor') as HTMLSelectElement;
    this.lyricDelayInput = document.getElementById('lyricDelayInput') as HTMLInputElement;
    this.posYSpringMassInput = document.getElementById('springPosYMass') as HTMLInputElement;
    this.posYSpringDampingInput = document.getElementById('springPosYDamping') as HTMLInputElement;
    this.posYSpringStiffnessInput = document.getElementById('springPosYStiffness') as HTMLInputElement;
    this.scaleSpringMassInput = document.getElementById('springScaleMass') as HTMLInputElement;
    this.scaleSpringDampingInput = document.getElementById('springScaleDamping') as HTMLInputElement;
    this.scaleSpringStiffnessInput = document.getElementById('springScaleStiffness') as HTMLInputElement;
    this.springPosYMassValue = document.getElementById('springPosYMassValue') as HTMLElement;
    this.springPosYDampingValue = document.getElementById('springPosYDampingValue') as HTMLElement;
    this.springPosYStiffnessValue = document.getElementById('springPosYStiffnessValue') as HTMLElement;
    this.springScaleMassValue = document.getElementById('springScaleMassValue') as HTMLElement;
    this.springScaleDampingValue = document.getElementById('springScaleDampingValue') as HTMLElement;
    this.springScaleStiffnessValue = document.getElementById('springScaleStiffnessValue') as HTMLElement;
    this.posYSpringSoftCheckbox = document.getElementById('posYSpringSoft') as HTMLInputElement;
    this.scaleSpringSoftCheckbox = document.getElementById('scaleSpringSoft') as HTMLInputElement;
    this.controlPointCodeInput = document.getElementById('controlPointCode') as HTMLInputElement;
    this.amllLyricPlayer = document.getElementById('amll-lyric-player');
    this.lyricAreaHint = document.getElementById('lyricAreaHint');
    this.coverStyleDynamic = document.getElementById('coverStyleDynamic');
    this.songTitleDisplay = document.getElementById('songTitleDisplay');
    this.songArtistDisplay = document.getElementById('songArtistDisplay');
    this.fluidDesc = document.getElementById('fluid-desc');
    this.coverDesc = document.getElementById('cover-desc');
    this.solidDesc = document.getElementById('solid-desc');
    this.landscapeTimeDisplay = document.querySelector('.landscape-time') as HTMLElement;
    this.landscapeProgressFill = document.querySelector('.landscape-progress-fill') as HTMLElement;
    this.landscapeCover = document.querySelector('.landscape-cover') as HTMLElement;
    this.playControls = document.getElementById('playControls');
    this.languageSelect = document.getElementById('languageSelect') as HTMLSelectElement;
    this.solidOptions = document.querySelectorAll('.solid-option');
    this.recordOptions = document.querySelectorAll('.record-option');
  }

  constructor() {
    this.applyI18nToDom();
    this.audio = document.createElement("audio");
    this.state = cloneDefaultState();
    this.audio.volume = this.state.volume / 100;
    this.audio.playbackRate = this.state.playbackRate;
    this.audio.preload = "auto";
    this.colorThief = new ColorThief();

    this.lyricPlayer = new BaseDomLyricPlayer();
    const element = this.lyricPlayer.getElement();
    if (element) {
      element.style.width = "100%";
      element.style.height = "100%";
      element.style.zIndex = "30";
      element.style.position = "relative";
    }

    this.hasLyrics = false;

    this.setDefaultColors({ skipSave: true });
    this.initColors();
    this.background = BackgroundRender.new(MeshGradientRenderer);
    this.coverBlurBackground = document.createElement('div');
    this.stats = new Stats();
    this.initDOMCache();
    this.initDynamicCoverVideo();
    if (this.waveformCanvas) {
      this.waveformContext = this.waveformCanvas.getContext('2d');
    }
    this.initEventListeners();
    this.initBackground();
    this.setupAudioEvents();
    this.setupLyricEvents();
    this.setupWaveformEvents();
    this.initStats();
    this.initUI();
    this.initLyricDisplayControls();
    this.updateMarqueeSettings();
  }

  private setupWheelControl(inputId: string, valueId: string, step: number) {
    let input: HTMLInputElement | null = null;
    let valueElement: HTMLElement | null = null;

    switch (inputId) {
      case 'coverBlurLevel': input = this.coverBlurLevel; valueElement = this.coverBlurLevelValue; break;
      case 'bgFlowSpeed': input = this.bgFlowSpeed; valueElement = this.bgFlowSpeedValue; break;
      case 'bgMaskOpacity': input = this.bgMaskOpacity; valueElement = this.bgMaskOpacityValue; break;
      case 'volume': input = this.volumeControl; valueElement = this.volumeValue; break;
      case 'playbackRate': input = this.playbackRateControl; valueElement = this.playbackRateValue; break;
      case 'roundedCover': input = this.roundedCoverSlider; valueElement = this.roundedCoverValue; break;
      case 'coverRotation': input = this.coverRotationSlider; valueElement = this.coverRotationValue; break;
      case 'bgRenderScale': input = this.bgRenderScale; valueElement = this.bgRenderScaleValue; break;
      case 'bgFPS': input = this.bgFPS; valueElement = this.bgFPSValue; break;
      case 'lyricAlignPosition': input = this.lyricAlignPosition; valueElement = this.lyricAlignPositionValue; break;
      case 'lyricFontSize': input = this.lyricFontSize; valueElement = this.lyricFontSizeValue; break;
      case 'springPosYMass': input = this.posYSpringMassInput; valueElement = document.getElementById('springPosYMassValue'); break;
      case 'springPosYDamping': input = this.posYSpringDampingInput; valueElement = document.getElementById('springPosYDampingValue'); break;
      case 'springPosYStiffness': input = this.posYSpringStiffnessInput; valueElement = document.getElementById('springPosYStiffnessValue'); break;
      case 'springScaleMass': input = this.scaleSpringMassInput; valueElement = document.getElementById('springScaleMassValue'); break;
      case 'springScaleDamping': input = this.scaleSpringDampingInput; valueElement = document.getElementById('springScaleDampingValue'); break;
      case 'springScaleStiffness': input = this.scaleSpringStiffnessInput; valueElement = document.getElementById('springScaleStiffnessValue'); break;
      default: return; // 不支持的id
    }

    if (!input || !valueElement) return;

    input.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = Math.sign((e as WheelEvent).deltaY) * -1; // 反转滚轮方向
      const currentValue = parseFloat(input.value);
      const min = parseFloat(input.min);
      const max = parseFloat(input.max);
      const newValue = Math.min(max, Math.max(min, currentValue + delta * step));

      input.value = newValue.toString();
      if (inputId.startsWith('spring')) {
        valueElement.textContent = newValue.toString();
      } else {
        valueElement.textContent = `${newValue}${inputId === 'bgFlowSpeed' ? '' : '%'}`;
      }

      input.dispatchEvent(new Event('input'));
    }, { passive: false });
  }

  private initGUI() {
    this.gui = new GUI();
    this.gui.hide();
    this.gui.close();

    const bgControls = {
      dynamicBackground: true,
      flowSpeed: 4,
      toggleBackground() {
        this.dynamicBackground = !this.dynamicBackground;
        (window as any).player
          .getBackground()
          .setStaticMode(!this.dynamicBackground);
      },
    };

    const bgFolder = this.gui.addFolder(t("backgroundControl"));
    bgFolder
      .add(bgControls, "flowSpeed", 0, 10, 0.1)
      .name(t("flowSpeed"))
      .onChange((value: number) => {
        if (value === 0) {
          (window as any).player.getBackground().setStaticMode(true);
        } else {
          (window as any).player.getBackground().setStaticMode(false);
          (window as any).player.getBackground().setFlowSpeed(value);
        }
      });
    bgFolder
      .add(bgControls, "toggleBackground")
      .name(t("toggleBackgroundMode"));
  }

  private initEventListeners() {
    this.setupDragAndDropEvents();

    const orientationMediaQuery = window.matchMedia('(orientation: portrait)');
    const handleOrientationChange = WebLyricsPlayer.debounce(() => {
      this.updateLayoutByOrientation();
    }, 100);

    orientationMediaQuery.addEventListener('change', handleOrientationChange);

    if (this.languageSelect) {
      this.languageSelect.value = getCurrentLanguage();
      this.languageSelect.addEventListener("change", (e) => {
        const nextLang = (e.target as HTMLSelectElement).value;
        setCurrentLanguage(nextLang);
        this.reapplyI18n();
      });
    }

    if (this.timeDisplay) {
      this.timeDisplay.addEventListener("click", () => {
        this.state.showRemainingTime = !this.state.showRemainingTime;
        this.updateTimeDisplay();
        this.saveBackgroundSettings();
      });
      this.timeDisplay.style.cursor = "pointer";
    }

    if (this.landscapeTimeDisplay) {
      this.landscapeTimeDisplay.addEventListener("click", () => {
        this.state.showRemainingTime = !this.state.showRemainingTime;
        this.updateTimeDisplay();
        this.saveBackgroundSettings();
      });
      this.landscapeTimeDisplay.style.cursor = "pointer";
    }

    this.roundedCoverSlider?.addEventListener('input', (e) => {
      const roundedValue = parseInt((e.target as HTMLInputElement).value);
      this.state.roundedCover = roundedValue;

      if (roundedValue !== 100 && this.state.coverRotationSpeed !== 0) {
        this.state.coverRotationSpeed = 0;
        this.updateCoverRotation();
        if (this.coverRotationValue) {
          this.coverRotationValue.textContent = '0rpm';
        }
      }

      this.updateRoundedCover();
      this.saveBackgroundSettings();
    });

    if (this.coverRotationSlider) {
      this.coverRotationSlider.addEventListener('input', (e: Event) => {
        if (this.state.roundedCover === 100) {
          const speedValue = parseInt((e.target as HTMLInputElement).value);
          this.state.coverRotationSpeed = speedValue;
          this.updateCoverRotation();
          if (this.coverRotationValue) {
            this.coverRotationValue.textContent = `${speedValue}rpm`;
          }
          this.saveBackgroundSettings();
        } else {
          this.state.coverRotationSpeed = 0;
          this.updateCoverRotation();
          if (this.coverRotationValue) {
            this.coverRotationValue.textContent = '0rpm';
          }
          (e.target as HTMLInputElement).value = '0';
        }
      });
    }

    this.coverBlurLevel?.addEventListener('input', (e: Event) => {
      const blurLevel = parseFloat((e.target as HTMLInputElement).value);
      const mappedBlurLevel = (blurLevel / 100) * 100;
      this.coverBlurBackground.style.filter = `blur(${mappedBlurLevel}px)`;
      if (this.coverBlurLevelValue) {
        this.coverBlurLevelValue.textContent = `${blurLevel}%`;
      }
      this.state.coverBlurLevel = blurLevel;
      this.saveBackgroundSettings();
    });

    this.coverStyleSelect?.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.state.coverStyle = target.value as 'normal' | 'innerShadow' | 'threeDShadow' | 'longShadow' | 'neumorphismA' | 'neumorphismB' | 'reflection' | 'cd' | 'vinyl' | 'colored';
      ;
      this.applyCoverStyle();
      this.saveBackgroundSettings();
    });

    this.coverStyleSelect?.addEventListener('wheel', (e) => {
      e.preventDefault();
      const selectElement = e.target as HTMLSelectElement;
      const options = selectElement.options;
      const currentIndex = selectElement.selectedIndex;
      const direction = Math.sign((e as WheelEvent).deltaY);
      let nextIndex = currentIndex + (direction > 0 ? 1 : -1);
      const restrictedStyles = ['cd', 'vinyl', 'colored', 'neumorphismA', 'neumorphismB'];
      const canAccessRestrictedStyles = this.state.roundedCover === 100;
      let attempts = 0;
      const maxAttempts = options.length;

      while (attempts < maxAttempts) {
        if (nextIndex < 0) nextIndex = options.length - 1;
        if (nextIndex >= options.length) nextIndex = 0;
        const nextOptionValue = options[nextIndex].value;
        if (restrictedStyles.includes(nextOptionValue) && !canAccessRestrictedStyles) {
          nextIndex += (direction > 0 ? 1 : -1);
          attempts++;
          continue;
        }
        break;
      }
      if (nextIndex < 0) nextIndex = options.length - 1;
      if (nextIndex >= options.length) nextIndex = 0;

      selectElement.selectedIndex = nextIndex;
      selectElement.dispatchEvent(new Event('change'));
    }, { passive: false });

    this.bgRenderScale?.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.state.backgroundRenderScale = value;
      const dpr = window.devicePixelRatio || 1;
      this.background.setRenderScale(value * dpr);
      if (this.bgRenderScaleValue) {
        this.bgRenderScaleValue.textContent = value.toFixed(2);
      }
      this.saveBackgroundSettings();
    });

    this.bgFPS?.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.state.backgroundFPS = value;
      this.background.setFPS(value);
      if (this.bgFPSValue) {
        this.bgFPSValue.textContent = `${value}fps`;
      }
      this.saveBackgroundSettings();
    });

    this.lyricAlignPosition?.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.state.lyricAlignPosition = value;
      this.lyricPlayer.setAlignPosition(value);
      if (this.lyricAlignPositionValue) {
        this.lyricAlignPositionValue.textContent = value.toFixed(1);
      }
      this.saveBackgroundSettings();
    });

    // 添加调试信息检查元素是否找到
    console.log('lyricFontSize element:', this.lyricFontSize);
    console.log('lyricFontSizeValue element:', this.lyricFontSizeValue);

    this.lyricFontSize?.addEventListener('input', (e) => {
      console.log('lyricFontSize input event fired!');
      const value = parseInt((e.target as HTMLInputElement).value);
      console.log('New value:', value);
      this.state.lyricFontSize = value;
      this.updateLyricFontSize();
      if (this.lyricFontSizeValue) {
        this.lyricFontSizeValue.textContent = `${value}%`;
        console.log('Updated display to:', `${value}%`);
      }
      this.saveBackgroundSettings();
    });

    this.hidePassedLyricsCheckbox
      ?.addEventListener('change', (e) => {
        const checked = (e.target as HTMLInputElement).checked;
        this.state.hidePassedLyrics = checked;
        this.updateLyricsDisplay();
        this.saveBackgroundSettings();
      });

    this.enableLyricBlur
      ?.addEventListener('change', (e) => {
        const checked = (e.target as HTMLInputElement).checked;
        this.state.enableLyricBlur = checked;
        this.lyricPlayer.setEnableBlur(checked);
        this.saveBackgroundSettings();
      });

    this.enableLyricScale
      ?.addEventListener('change', (e) => {
        const checked = (e.target as HTMLInputElement).checked;
        this.state.enableLyricScale = checked;
        this.lyricPlayer.setEnableScale(checked);
        this.saveBackgroundSettings();
      });

    this.enableLyricSpring
      ?.addEventListener('change', (e) => {
        const checked = (e.target as HTMLInputElement).checked;
        this.state.enableLyricSpring = checked;
        this.lyricPlayer.setEnableSpring(checked);
        const springDesc = document.getElementById('spring-desc');
        if (springDesc) {
          springDesc.style.display = checked ? 'block' : 'none';
        }
        this.saveBackgroundSettings();
      });

    this.posYSpringMassInput
      ?.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        this.state.posYSpringMass = value;
        this.lyricPlayer.setLinePosYSpringParams({ mass: value, damping: this.state.posYSpringDamping, stiffness: this.state.posYSpringStiffness, soft: this.state.posYSpringSoft });
        const valueElement = document.getElementById('springPosYMassValue');
        if (valueElement) {
          valueElement.textContent = value.toFixed(1);
        }
        this.saveBackgroundSettings();
      });

    this.posYSpringDampingInput
      ?.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        this.state.posYSpringDamping = value;
        this.lyricPlayer.setLinePosYSpringParams({ mass: this.state.posYSpringMass, damping: value, stiffness: this.state.posYSpringStiffness, soft: this.state.posYSpringSoft });
        const valueElement = document.getElementById('springPosYDampingValue');
        if (valueElement) {
          valueElement.textContent = value.toFixed(1);
        }
        const springPosYSoftDiv = document.getElementById('springPosYSoft')?.parentElement;
        if (springPosYSoftDiv) {
          springPosYSoftDiv.style.display = value < 1 ? 'flex' : 'none';
        }
        this.saveBackgroundSettings();
      });

    this.posYSpringStiffnessInput
      ?.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        this.state.posYSpringStiffness = value;
        this.lyricPlayer.setLinePosYSpringParams({ mass: this.state.posYSpringMass, damping: this.state.posYSpringDamping, stiffness: value, soft: this.state.posYSpringSoft });
        const valueElement = document.getElementById('springPosYStiffnessValue');
        if (valueElement) {
          valueElement.textContent = value.toString();
        }
        this.saveBackgroundSettings();
      });

    this.posYSpringSoftCheckbox
      ?.addEventListener('change', (e) => {
        const checked = (e.target as HTMLInputElement).checked;
        this.state.posYSpringSoft = checked;
        this.lyricPlayer.setLinePosYSpringParams({ mass: this.state.posYSpringMass, damping: this.state.posYSpringDamping, stiffness: this.state.posYSpringStiffness, soft: checked });
        this.saveBackgroundSettings();
      });

    this.scaleSpringMassInput
      ?.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        this.state.scaleSpringMass = value;
        this.lyricPlayer.setLineScaleSpringParams({ mass: value, damping: this.state.scaleSpringDamping, stiffness: this.state.scaleSpringStiffness, soft: this.state.scaleSpringSoft });
        const valueElement = document.getElementById('springScaleMassValue');
        if (valueElement) {
          valueElement.textContent = value.toFixed(1);
        }
        this.saveBackgroundSettings();
      });

    this.scaleSpringDampingInput
      ?.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        this.state.scaleSpringDamping = value;
        this.lyricPlayer.setLineScaleSpringParams({ mass: this.state.scaleSpringMass, damping: value, stiffness: this.state.scaleSpringStiffness, soft: this.state.scaleSpringSoft });
        const valueElement = document.getElementById('springScaleDampingValue');
        if (valueElement) {
          valueElement.textContent = value.toFixed(1);
        }
        const springScaleSoftDiv = document.getElementById('springScaleSoft')?.parentElement;
        if (springScaleSoftDiv) {
          springScaleSoftDiv.style.display = value < 1 ? 'flex' : 'none';
        }
        this.saveBackgroundSettings();
      });

    this.scaleSpringStiffnessInput
      ?.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        this.state.scaleSpringStiffness = value;
        this.lyricPlayer.setLineScaleSpringParams({ mass: this.state.scaleSpringMass, damping: this.state.scaleSpringDamping, stiffness: value, soft: this.state.scaleSpringSoft });
        const valueElement = document.getElementById('springScaleStiffnessValue');
        if (valueElement) {
          valueElement.textContent = value.toString();
        }
        this.saveBackgroundSettings();
      });

    this.scaleSpringSoftCheckbox
      ?.addEventListener('change', (e) => {
        const checked = (e.target as HTMLInputElement).checked;
        this.state.scaleSpringSoft = checked;
        this.lyricPlayer.setLineScaleSpringParams({ mass: this.state.scaleSpringMass, damping: this.state.scaleSpringDamping, stiffness: this.state.scaleSpringStiffness, soft: checked });
        this.saveBackgroundSettings();
      });

    this.wordFadeWidthInput
      ?.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        this.state.wordFadeWidth = value;
        this.lyricPlayer.setWordFadeWidth(value);
        this.saveBackgroundSettings();
        if (this.wordFadeWidthValue) {
          this.wordFadeWidthValue.textContent = value.toFixed(2);
        }
      });

    this.wordFadeWidthInput
      ?.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = Math.sign((e as WheelEvent).deltaY) * -1; // 反转滚轮方向
        const currentValue = parseFloat(this.wordFadeWidthInput!.value);
        const min = parseFloat(this.wordFadeWidthInput!.min);
        const max = parseFloat(this.wordFadeWidthInput!.max);
        const step = parseFloat(this.wordFadeWidthInput!.step);

        const newValue = Math.min(max, Math.max(min, currentValue + delta * step));
        this.state.wordFadeWidth = newValue;
        this.wordFadeWidthInput!.value = newValue.toString();
        this.lyricPlayer.setWordFadeWidth(newValue);
        this.saveBackgroundSettings();
        if (this.wordFadeWidthValue) {
          this.wordFadeWidthValue.textContent = newValue.toFixed(2);
        }
      }, { passive: false });

    this.wordFadeWidthInput
      ?.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          const step = parseFloat(this.wordFadeWidthInput!.step) || 0.01;
          const delta = e.key === 'ArrowUp' ? step : -step;
          const currentValue = parseFloat(this.wordFadeWidthInput!.value);
          const min = parseFloat(this.wordFadeWidthInput!.min);
          const max = parseFloat(this.wordFadeWidthInput!.max);
          const newValue = Math.min(max, Math.max(min, currentValue + delta));
          this.wordFadeWidthInput!.value = newValue.toString();
          this.state.wordFadeWidth = newValue;
          this.lyricPlayer.setWordFadeWidth(newValue);
          this.saveBackgroundSettings();
          if (this.wordFadeWidthValue) {
            this.wordFadeWidthValue.textContent = newValue.toFixed(2);
          }
        }
      });

    this.lyricAlignAnchorSelect?.addEventListener('change', (e) => {
      const value = (e.target as HTMLInputElement).value as 'center' | 'top' | 'bottom';
      this.state.lyricAlignAnchor = value;
      this.lyricPlayer.setAlignAnchor(value);
      this.saveBackgroundSettings();
    });

    this.lyricAlignAnchorSelect?.addEventListener('wheel', (e) => {
      e.preventDefault();
      const selectElement = e.target as HTMLSelectElement;
      const options = selectElement.options;
      const currentIndex = selectElement.selectedIndex;
      const direction = Math.sign((e as WheelEvent).deltaY);
      let nextIndex = currentIndex + (direction > 0 ? 1 : -1);

      if (nextIndex < 0) nextIndex = options.length - 1;
      if (nextIndex >= options.length) nextIndex = 0;

      selectElement.selectedIndex = nextIndex;
      selectElement.dispatchEvent(new Event('change'));
    }, { passive: false });

    this.invertColorsCheckbox?.addEventListener('change', (e) => {
      this.invertColors((e.target as HTMLInputElement).checked);
    });

    this.dominantColorInput?.addEventListener('change', () => this.onDominantColorChange());
    this.dominantColorLightInput?.addEventListener('change', () => this.onDominantColorLightChange());
    this.dominantColorDarkInput?.addEventListener('change', () => this.onDominantColorDarkChange());

    this.enableMarqueeCheckbox?.addEventListener('change', (e) => {
      this.state.marqueeEnabled = (e.target as HTMLInputElement).checked;
      this.updateMarqueeSettings();
      this.saveBackgroundSettings();
    });
    this.backgroundBeatCheckbox?.addEventListener('change', (e) => {
      this.state.backgroundBeatEnabled = (e.target as HTMLInputElement).checked;
      this.syncBackgroundBeatState();
      this.saveBackgroundSettings();
    });

    this.setupWheelControl('coverBlurLevel', 'coverBlurLevelValue', 5);
    this.setupWheelControl('bgFlowSpeed', 'bgFlowSpeedValue', 0.1);
    this.setupWheelControl('bgMaskOpacity', 'bgMaskOpacityValue', 5);
    this.setupWheelControl('volume', 'volumeValue', 0.05);
    this.setupWheelControl('playbackRate', 'playbackRateValue', 0.1);
    this.setupWheelControl('roundedCover', 'roundedCoverValue', 5);
    this.setupWheelControl('coverRotation', 'coverRotationValue', 5);
    this.setupWheelControl('bgRenderScale', 'bgRenderScaleValue', 0.1);
    this.setupWheelControl('bgFPS', 'bgFPSValue', 1);
    this.setupWheelControl('lyricAlignPosition', 'lyricAlignPositionValue', 0.1);
    this.setupWheelControl('lyricFontSize', 'lyricFontSizeValue', 5);
    this.setupWheelControl('springPosYMass', 'springPosYMassValue', 0.1);
    this.setupWheelControl('springPosYDamping', 'springPosYDampingValue', 0.1);
    this.setupWheelControl('springPosYStiffness', 'springPosYStiffnessValue', 1);
    this.setupWheelControl('springScaleMass', 'springScaleMassValue', 0.1);
    this.setupWheelControl('springScaleDamping', 'springScaleDampingValue', 0.1);
    this.setupWheelControl('springScaleStiffness', 'springScaleStiffnessValue', 1);

    if (this.controlPointCodeInput) {
      this.controlPointCodeInput.addEventListener('change', () => {
        this.applyControlPointCode();
      });

      this.controlPointCodeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.applyControlPointCode();
        }
      });
    }

    this.bgLowFreqVolume?.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = Math.sign((e as WheelEvent).deltaY) * -1; // 反转滚轮方向
      const currentValue = parseFloat(this.bgLowFreqVolume!.value);
      const min = parseFloat(this.bgLowFreqVolume!.min);
      const max = parseFloat(this.bgLowFreqVolume!.max);
      const newValue = Math.min(max, Math.max(min, currentValue + delta * 0.1)); // 步长0.1
      this.bgLowFreqVolume!.value = newValue.toString();
      if (this.bgLowFreqVolumeValue) {
        const mapToFrequency = (value: number): string => {
          const frequency = 80 + (value * 40); // 0->80, 1->120
          return `${frequency.toFixed(0)}hz`;
        };
        this.bgLowFreqVolumeValue.textContent = mapToFrequency(newValue);
      }
      this.bgLowFreqVolume!.dispatchEvent(new Event('input'));
    }, { passive: false });

    this.albumCoverLarge
      ?.addEventListener("click", () => {
        if (!this.state.coverUrl && this.coverFile) {
          this.coverFile.click();
        }
      });

    if (this.albumCoverLarge && this.coverFile) {
      this.addLongPressAndRightClickHandler(this.albumCoverLarge, () => {
        if (this.coverFile) {
          this.coverFile.click();
        }
      }, 3000);
    }

    const handleTitleEdit = (titleElement: HTMLElement) => {
      titleElement.classList.remove('marquee');
      const input = document.createElement("input");
      input.type = "text";
      input.value = titleElement.textContent || "";
      const isPortrait = window.matchMedia("(orientation: portrait)").matches;
      const textAlign = isPortrait && this.state.swapDuetsPositions ? 'right' : (isPortrait ? 'left' : 'center');
      input.style.cssText = `
        width: 100%;
        background: transparent;
        border: none;
        color: var(--dominant-color-light);
        font-size: inherit;
        font-weight: inherit;
        text-align: ${textAlign};
        outline: none;
      `;

      titleElement.textContent = "";
      titleElement.appendChild(input);
      input.focus();
      input.addEventListener("blur", () => {
        this.state.songTitle = input.value;
        titleElement.textContent = input.value;
        if (this.songTitleInput) {
          this.songTitleInput.value = input.value;
        }
        this.updateSongInfo();
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          this.state.songTitle = input.value;
          titleElement.textContent = input.value;
          if (this.songTitleInput) {
            this.songTitleInput.value = input.value;
          }
          this.updateSongInfo();
        }
      });
    };

    this.songTitle?.addEventListener("click", (e) => {
      const titleElement = e.target as HTMLElement;
      if (!this.state.songTitle.trim()) {
        handleTitleEdit(titleElement);
      }
    });

    if (this.songTitle) {
      this.addLongPressAndRightClickHandler(this.songTitle, () => {
        if (this.songTitle) {
          handleTitleEdit(this.songTitle as HTMLElement);
        }
      }, 3000);
    }

    const handleArtistEdit = (artistElement: HTMLElement) => {
      artistElement.classList.remove('marquee');

      const input = document.createElement("input");
      input.type = "text";
      input.value = artistElement.textContent || "";
      const isPortrait = window.matchMedia("(orientation: portrait)").matches;
      const textAlign = isPortrait && this.state.swapDuetsPositions ? 'right' : (isPortrait ? 'left' : 'center');

      input.style.cssText = `
        width: 100%;
        background: transparent;
        border: none;
        color: var(--dominant-color-light);
        opacity: 0.8;
        font-size: inherit;
        text-align: ${textAlign};
        outline: none;
      `;

      artistElement.textContent = "";
      artistElement.appendChild(input);
      input.focus();

      input.addEventListener("blur", () => {
        this.state.songArtist = input.value;
        artistElement.textContent = input.value;
        if (this.songArtistInput) {
          this.songArtistInput.value = input.value;
        }
        this.updateSongInfo();
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          this.state.songArtist = input.value;
          artistElement.textContent = input.value;
          if (this.songArtistInput) {
            this.songArtistInput.value = input.value;
          }
          this.updateSongInfo();
        }
      });
    };

    this.songArtist?.addEventListener("click", (e) => {
      const artistElement = e.target as HTMLElement;
      if (!this.state.songArtist.trim()) {
        handleArtistEdit(artistElement);
      }
    });

    if (this.songArtist) {
      this.addLongPressAndRightClickHandler(this.songArtist, () => {
        if (this.songArtist) {
          handleArtistEdit(this.songArtist as HTMLElement);
        }
      }, 3000);
    }

    this.musicFileBtn?.addEventListener("click", () => {
      if (this.musicFile) {
        this.musicFile.click();
      }
    });

    this.lyricFileBtn?.addEventListener("click", () => {
      if (this.lyricFile) {
        this.lyricFile.click();
      }
    });

    this.coverFileBtn?.addEventListener("click", () => {
      if (this.coverFile) {
        this.coverFile.click();
      }
    });

    this.musicFile?.addEventListener("change", (e) => {
      if (!e.target) return;
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.loadMusicFromFile(file);
      }
    });

    this.lyricFile?.addEventListener("change", (e) => {
      if (!e.target) return;
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.loadLyricFromFile(file);
      }
    });

    this.coverFile?.addEventListener("change", (e) => {
      if (!e.target) return;
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.loadCoverFromFile(file);
      }
    });

    this.songTitleInput
      ?.addEventListener("input", (e) => {
        this.state.songTitle = (e.target as HTMLInputElement).value;
        this.updateSongInfo();
        this.saveBackgroundSettings();
      });

    this.songArtistInput
      ?.addEventListener("input", (e) => {
        this.state.songArtist = (e.target as HTMLInputElement).value;
        this.updateSongInfo();
        this.saveBackgroundSettings();
      });

    this.songTitleInput
      ?.addEventListener("blur", (e) => {
        this.state.songTitle = (e.target as HTMLInputElement).value;
        this.updateSongInfo();
        if (this.songTitle) {
          this.checkAndUpdateMarquee(this.songTitle);
        }
        this.saveBackgroundSettings();
      });

    this.songTitleInput
      ?.addEventListener("keydown", (e) => {
        if (e.key === 'Enter') {
          (e.target as HTMLInputElement).blur();
        }
      });

    this.songArtistInput
      ?.addEventListener("blur", (e) => {
        this.state.songArtist = (e.target as HTMLInputElement).value;
        this.updateSongInfo();
        if (this.songArtist) {
          this.checkAndUpdateMarquee(this.songArtist);
        }
        this.saveBackgroundSettings();
      });

    this.songArtistInput
      ?.addEventListener("keydown", (e) => {
        if (e.key === 'Enter') {
          (e.target as HTMLInputElement).blur();
        }
      });

    this.loopPlayCheckbox
      ?.addEventListener("change", (e) => {
        this.state.loopPlay = (e.target as HTMLInputElement).checked;
        this.saveBackgroundSettings();
      });

    if (this.playbackRateControl && this.playbackRateValue) {
      this.playbackRateControl.addEventListener("input", (e) => {
        const rate = parseFloat((e.target as HTMLInputElement).value);
        if (!isNaN(rate)) {
          this.state.playbackRate = rate;
          this.audio.playbackRate = rate;
          if (this.playbackRateValue) {
            this.playbackRateValue.textContent = rate.toFixed(2) + "x";
          }
          this.updatePlaybackRateIcon(rate);
          this.saveBackgroundSettings();
        }
      });
      const initialRate = parseFloat(this.playbackRateControl.value);
      if (!isNaN(initialRate)) {
        this.state.playbackRate = initialRate;
      }
      this.updatePlaybackRateIcon(initialRate);
    }

    if (this.volumeControl && this.volumeValue) {
      this.volumeControl.value = this.state.volume.toString();
      this.volumeValue.textContent = Math.round(this.state.volume) + "%";
      this.updateVolumeIcon(Math.round(this.state.volume));

      this.volumeControl.addEventListener("input", (e) => {
        const volume = parseInt((e.target as HTMLInputElement).value);
        if (!isNaN(volume) && this.volumeValue) {
          this.audio.volume = volume / 100;
          this.volumeValue.textContent = volume + "%";
          this.updateVolumeIcon(volume);
          this.state.volume = volume;
          this.saveBackgroundSettings();
        }
      });
      this.volumeControl.addEventListener("wheel", (e) => {
        e.preventDefault();
        const step = 5;
        if (!this.volumeControl) return;
        const currentValue = parseInt(this.volumeControl.value);
        let newValue = currentValue;

        if (e.deltaY < 0) {
          newValue = Math.min(100, currentValue + step);
        } else {
          newValue = Math.max(0, currentValue - step);
        }

        if (newValue !== currentValue && this.volumeControl && this.volumeValue) {
          this.volumeControl.value = newValue.toString();
          this.audio.volume = newValue / 100;
          this.volumeValue.textContent = newValue + "%";
          this.updateVolumeIcon(newValue);
        }
      }, { passive: false });
    }

    if (this.lyricDelayInput) {
      this.lyricDelayInput.addEventListener("input", (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        if (!isNaN(value)) {
          this.applyLyricDelay(value);
        }
      });

      if (this.lyricDelayInput) {
        const lyricDelayInput = this.lyricDelayInput; // 存储在变量中，避免TypeScript的控制流分析问题
        lyricDelayInput.addEventListener(
          "wheel",
          (e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 50 : -50;
            const newValue = parseInt(lyricDelayInput.value || "0") + delta;
            lyricDelayInput.value = newValue.toString();
            this.applyLyricDelay(newValue);
          },
          { passive: false }
        );

        lyricDelayInput.addEventListener("keydown", (e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            const delta = e.key === "ArrowUp" ? 50 : -50;
            const newValue = parseInt(lyricDelayInput.value || "0") + delta;
            lyricDelayInput.value = newValue.toString();
            this.applyLyricDelay(newValue);
          }
        });
      }
    }

    this.bgFlowSpeed?.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.state.backgroundFlowSpeed = value;
      if (this.state.backgroundType === 'fluid') {
        if (value === 0) {
          this.background.setStaticMode(true);
        } else {
          this.background.setStaticMode(false);
          this.background.setFlowSpeed(value);
        }
      }
      this.bgFlowSpeedValue!.textContent = value.toFixed(1);
      this.saveBackgroundSettings();
    });

    // 颜色蒙版控制事件
    this.bgColorMask?.addEventListener('change', (e) => {
      this.state.backgroundColorMask = (e.target as HTMLInputElement).checked;
      this.updateBackground();
      this.updateBackgroundUI();
      this.saveBackgroundSettings();
    });

    this.bgMaskColor?.addEventListener('input', (e) => {
      this.state.backgroundMaskColor = (e.target as HTMLInputElement).value;
      this.updateBackground();
      this.saveBackgroundSettings();
    });

    this.bgMaskOpacity?.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.state.backgroundMaskOpacity = value;
      this.updateBackground();
      this.updateBackgroundUI();
      this.bgMaskOpacityValue!.textContent = value + '%';
      this.saveBackgroundSettings();
    });

    // FPS显示控制
    this.showFPSCheckbox?.addEventListener('change', (e) => {
      this.state.showFPS = (e.target as HTMLInputElement).checked;
      this.updateFPSDisplay();
      this.saveBackgroundSettings();
    });

    this.loadFromUrlBtn?.addEventListener("click", () => {
      this.loadFromURLs();
    });

    this.musicUrl?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.loadFromURLs();
      }
    });
    this.musicUrl?.addEventListener("input", () => {
      this.saveBackgroundSettings();
    });

    if (this.lyricUrl) {
      const adjustTextareaHeight = () => {
        const textarea = this.lyricUrl as HTMLTextAreaElement;
        const scrollTop = textarea.scrollTop;
        textarea.style.height = 'auto';
        const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight, 10);
        const padding = parseInt(window.getComputedStyle(textarea).paddingTop, 10) +
          parseInt(window.getComputedStyle(textarea).paddingBottom, 10);
        const rows = Math.max(1, Math.min(10, Math.ceil((textarea.scrollHeight - padding) / lineHeight)));
        textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
        textarea.rows = rows;
        textarea.scrollTop = scrollTop;
      };
      adjustTextareaHeight();
      this.lyricUrl.addEventListener('input', adjustTextareaHeight);
      this.lyricUrl.addEventListener('keyup', adjustTextareaHeight);
      this.lyricUrl.addEventListener('paste', () => {
        setTimeout(adjustTextareaHeight, 0);
      });
      this.lyricUrl.addEventListener('input', () => {
        this.saveBackgroundSettings();
      });
    }

    this.lyricUrl?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        if (this.lyricUrl) {
          this.processLyricInput(this.lyricUrl.value);
        }
      } else if (e.key === "Enter" && !e.shiftKey) {
        this.loadFromURLs();
      }
    });

    this.coverUrl?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        if (this.coverUrl) {
          this.processCoverInput(this.coverUrl.value);
        }
      }
    });
    this.coverUrl?.addEventListener("input", () => {
      this.saveBackgroundSettings();
    });

    this.loadFilesBtn?.addEventListener("click", () => {
      this.loadFromFiles();
    });

    this.resetPlayerBtn?.addEventListener("click", () => {
      this.resetPlayer();
    });

    if (this.fullscreenButton) {
      let fullscreenButtonLongPressTimer: number;
      let isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

      this.fullscreenButton.addEventListener("click", () => {
        this.toggleFullscreen();
      });

      this.fullscreenButton.addEventListener("mousedown", () => {
        fullscreenButtonLongPressTimer = window.setTimeout(() => {
          if (this.lyricFile) this.lyricFile.click();
        }, 3000);
      });

      this.fullscreenButton.addEventListener("mouseup", () => {
        clearTimeout(fullscreenButtonLongPressTimer);
      });

      this.fullscreenButton.addEventListener("mouseleave", () => {
        clearTimeout(fullscreenButtonLongPressTimer);
      });

      this.fullscreenButton.addEventListener("contextmenu", (e) => {
        e.preventDefault(); // 阻止默认右键菜单
        if (this.lyricFile) this.lyricFile.click();
        return false; // 为Safari返回false
      });

      if (this.fullscreenButton) {
        this.fullscreenButton.addEventListener("touchstart", (e: TouchEvent) => {
          let isLongPress = false;
          fullscreenButtonLongPressTimer = window.setTimeout(() => {
            isLongPress = true;
            if (this.lyricFile) this.lyricFile.click();
          }, 3000);
        }, { passive: true });

        this.fullscreenButton.addEventListener("touchend", () => {
          clearTimeout(fullscreenButtonLongPressTimer);
        }, { passive: true });

        this.fullscreenButton.addEventListener("touchcancel", () => {
          clearTimeout(fullscreenButtonLongPressTimer);
        }, { passive: true });
      }
    }
    this.toggleControlsBtn?.addEventListener("click", () => {
      this.toggleControlPanel();
    });

    if (this.albumSidePanel) {
      this.albumSidePanel.addEventListener("click", () => {
        this.toggleControlPanel();
      });
    }

    this.progressBar?.addEventListener("click", (e) => {
      this.seekToPosition(e);
    });

    if (this.progressBar) {
      this.addLongPressAndRightClickHandler(this.progressBar, (e?: MouseEvent | TouchEvent) => {
        if (e) {
          this.handleRangeSelection(e);
        }
      });
    }
    if (this.timeDisplay) {
      this.addLongPressAndRightClickHandler(this.timeDisplay, () => {
        this.exitRangeMode();
      });
    }
    if (this.landscapeTimeDisplay) {
      this.addLongPressAndRightClickHandler(this.landscapeTimeDisplay, () => {
        this.exitRangeMode();
      });
    }

    this.progressBar?.addEventListener("wheel", (e) => {
      e.preventDefault();
      const seekAmount = e.deltaY > 0 ? -1 : 1;
      if (this.audio && this.state.duration > 0) {
        const newTime = Math.max(
          0,
          Math.min(this.state.duration, this.audio.currentTime + seekAmount)
        );
        this.audio.currentTime = newTime;
        this.state.currentTime = newTime;
        const adjustedTime = newTime * 1000 + this.state.lyricDelay;
        this.lyricPlayer.setCurrentTime(adjustedTime);
        this.updateProgress();
        this.updateTimeDisplay();
      }
    }, { passive: false });

    const progressBar = this.progressBar;

    if (progressBar) {
      progressBar.style.position = 'relative';

      progressBar.addEventListener("mousemove", (e) => {
        this.showTooltip(progressBar, e.clientX);
      });

      progressBar.addEventListener("mouseleave", () => {
        if (this.tooltipTimer) {
          clearTimeout(this.tooltipTimer);
        }
        if (this.verticalLine) {
          this.verticalLine.style.display = 'none';
        }
        if (this.tooltip) {
          this.tooltip.style.transform = 'translateY(4px)';
          this.tooltip.style.opacity = '0';
          setTimeout(() => {
            if (this.tooltip) {
              this.tooltip.style.display = 'none';
            }
          }, 300);
        }
      });
    }

    document.addEventListener("keydown", (e) => {
      this.handleKeyboard(e);
    });

    this.setupTouchEvents();

    window.addEventListener("resize", () => {
      this.adjustLyricPosition();
    });
    document.addEventListener("fullscreenchange", () => {
      if (document.fullscreenElement) {
        if (this.fullscreenEnterIcon && this.fullscreenExitIcon) {
          this.fullscreenEnterIcon.style.display = 'none';
          this.fullscreenExitIcon.style.display = 'inline';
        }
      } else {
        if (this.fullscreenEnterIcon && this.fullscreenExitIcon) {
          this.fullscreenEnterIcon.style.display = 'inline';
          this.fullscreenExitIcon.style.display = 'none';
        }
      }
    });

    window
      .matchMedia("(orientation: portrait)")
      .addEventListener("change", () => {
        this.adjustLyricPosition();
        if (this.songTitle) {
          this.songTitle.classList.remove('marquee');
          void this.songTitle.offsetWidth; // 强制重排
          this.checkAndUpdateMarquee(this.songTitle);
        }
        if (this.songArtist) {
          this.songArtist.classList.remove('marquee');
          void this.songArtist.offsetWidth; // 强制重排
          this.checkAndUpdateMarquee(this.songArtist);
        }
      });
  }

  private async detectMaxFPS(options?: { skipSave?: boolean }): Promise<number> {
    try {
      const screenWithRefreshRate = window.screen as any;
      if (screenWithRefreshRate?.refreshRate) {
        return Math.round(screenWithRefreshRate.refreshRate);
      }

      if (navigator.mediaCapabilities?.encodingInfo) {
        try {
          const capabilities = await navigator.mediaCapabilities.encodingInfo({
            type: 'record',
            video: {
              contentType: 'video/mp4',
              width: 1920,
              height: 1080,
              bitrate: 1000000,
              framerate: 60
            }
          } as any);

          if (capabilities.supported) {
            for (let fps = 120; fps > 60; fps -= 10) {
              const highFpsCapabilities = await navigator.mediaCapabilities.encodingInfo({
                type: 'record',
                video: {
                  contentType: 'video/mp4',
                  width: 1920,
                  height: 1080,
                  bitrate: 1000000,
                  framerate: fps
                }
              } as any);
              if (highFpsCapabilities.supported) {
                return fps;
              }
            }
          }
        } catch (e) {
          try {
            const capabilities = await navigator.mediaCapabilities.encodingInfo({
              type: 'transmission',
              video: {
                contentType: 'video/mp4',
                width: 1920,
                height: 1080,
                bitrate: 1000000,
                framerate: 60
              }
            } as any);

            if (capabilities.supported) {
              for (let fps = 120; fps > 60; fps -= 10) {
                const highFpsCapabilities = await navigator.mediaCapabilities.encodingInfo({
                  type: 'transmission',
                  video: {
                    contentType: 'video/mp4',
                    width: 1920,
                    height: 1080,
                    bitrate: 1000000,
                    framerate: fps
                  }
                } as any);
                if (highFpsCapabilities.supported) {
                  return fps;
                }
              }
            }
          } catch (innerError) {
            console.warn('MediaCapabilities API failed:', innerError);
          }
        }
      }
      return await this.measureFpsWithRAF();
    } catch (error) {
      console.warn('Failed to detect max FPS:', error);
    }
    return 60;
  }

  private measureFpsWithRAF(): Promise<number> {
    return new Promise((resolve) => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (!isMobile) {
        resolve(60);
        return;
      }

      const duration = 1000; // 测量持续时间（毫秒）
      let frames = 0;
      let startTime: number | null = null;

      function measureFrame(timestamp: number) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;

        frames++;

        if (elapsed < duration) {
          requestAnimationFrame(measureFrame);
        } else {
          const measuredFPS = Math.ceil((frames * 1000) / elapsed);
          const maxFPS = Math.min(measuredFPS, 120);
          resolve(Math.max(maxFPS, 30));
        }
      }
      requestAnimationFrame(measureFrame);
    });
  }

  private async generateWaveformData() {
    if (!this.audio.src || !this.waveformCanvas) {
      return;
    }

    try {
      this.cachedWaveform = null;
      this.audioBuffer = null;
      const response = await fetch(this.audio.src);
      const arrayBuffer = await response.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      this.cachedWaveform = this.createWaveformData(this.audioBuffer);
      console.log('Waveform data generated successfully');
      this.updateWaveformCanvasSize();
      this.redrawWaveform(); // 生成数据后立即绘制
    } catch (error) {
      console.error('Failed to generate waveform data:', error);
      this.cachedWaveform = null;
    }
  }

  private createWaveformData(buffer: AudioBuffer): Float32Array {
    const channelData = buffer.getChannelData(0);
    let samples = 0;
    if (this.waveformCanvas && this.waveformCanvas.width > 0) {
      samples = Math.floor(this.waveformCanvas.width * 5);
    } else if (this.progressBar) {
      const progressBarWidth = parseFloat(getComputedStyle(this.progressBar).width);
      if (progressBarWidth > 0) {
        samples = Math.floor(progressBarWidth * 10);
      }
    }
    const blockSize = Math.floor(channelData.length / samples);
    const waveform = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        const index = i * blockSize + j;
        sum += Math.abs(channelData[index] || 0);
      }
      waveform[i] = sum / blockSize;
    }
    return waveform;
  }

  private updateWaveformCanvasSize() {
    if (!this.waveformCanvas || !this.progressBar) return;

    if (this.waveformCanvas.parentNode !== this.progressBar) {
      if (this.waveformCanvas.parentNode) {
        this.waveformCanvas.parentNode.removeChild(this.waveformCanvas);
      }
      this.progressBar.appendChild(this.waveformCanvas);
    }

    const minWidth = 0;
    const canvasWidth = Math.max(minWidth, parseFloat(getComputedStyle(this.progressBar).width));
    const oldWidth = this.waveformCanvas.width;
    const dpr = window.devicePixelRatio || 1;
    const rect = this.progressBar.getBoundingClientRect();
    this.waveformCanvas.width = canvasWidth * dpr;
    this.waveformCanvas.height = rect.height * dpr;
    this.waveformCanvas.style.position = 'absolute';
    this.waveformCanvas.style.top = '0';
    this.waveformCanvas.style.left = '0';
    this.waveformCanvas.style.width = '100%';
    this.waveformCanvas.style.height = '100%';
    this.waveformCanvas.style.minWidth = `${minWidth}px`;
    this.waveformCanvas.style.pointerEvents = 'none';
    this.waveformCanvas.style.opacity = '0';
    this.waveformCanvas.style.transition = 'opacity 0.3s ease';
    this.waveformCanvas.style.imageRendering = 'pixelated'; // 优化图像渲染
    if (this.cachedWaveform && this.audioBuffer && oldWidth > 0 && Math.abs(canvasWidth - oldWidth) > oldWidth * 0.1) {
      this.cachedWaveform = this.createWaveformData(this.audioBuffer);
    }

    if (this.cachedWaveform) {
      this.redrawWaveform();
    }
  }

  private redrawWaveform() {
    if (!this.waveformCanvas || !this.waveformContext || !this.cachedWaveform) return;

    const canvas = this.waveformCanvas;
    const ctx = this.waveformContext;
    const waveform = this.cachedWaveform;
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    if (waveform.length > 0) {
      const firstAmplitude = waveform[0];
      let allEqual = true;
      for (let i = 1; i < waveform.length; i++) {
        if (waveform[i] !== firstAmplitude) {
          allEqual = false;
          break;
        }
      }
      if (allEqual) {
        return;
      }
    }

    const waveformColor = getComputedStyle(document.documentElement).getPropertyValue('--waveform-color').trim();
    ctx.strokeStyle = waveformColor || this.originalDominant;
    ctx.lineWidth = 1.8 / dpr; // 调整线条宽度以适应高DPI屏幕
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const centerY = height / 2;
    const step = width / waveform.length;

    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    for (let i = 0; i < waveform.length; i++) {
      const x = i * step;
      const amplitude = waveform[i] * height * 0.9; // 振幅缩放

      ctx.moveTo(x, centerY - amplitude);
      ctx.lineTo(x, centerY + amplitude);
    }
    ctx.stroke();
    ctx.scale(1 / dpr, 1 / dpr);
  }

  private tooltip: HTMLElement | null = null;
  private verticalLine: HTMLElement | null = null;
  private tooltipTimer: number | null = null;
  private diffUpdateTimer: number | null = null;
  private showTooltip(progressBar: HTMLElement, x: number) {
    const rect = progressBar.getBoundingClientRect();
    let percentage = (x - rect.left) / rect.width;
    const timeInSeconds = percentage * this.state.duration;
    if (this.progressFill) {
      const progressWidth = parseFloat(this.progressFill.style.width || '0%');
      const snapThreshold = 0.5;
      if (Math.abs(percentage * 100 - progressWidth) < snapThreshold) {
        percentage = progressWidth / 100;
      }
    }

    const linePosition = `${percentage * 100}%`;

    if (!this.verticalLine) {
      this.verticalLine = document.createElement('div');
      this.verticalLine.style.position = 'absolute';
      this.verticalLine.style.width = '1px';
      this.verticalLine.style.height = '100%';
      this.verticalLine.style.backgroundColor = 'var(--dominant-color-light)';
      this.verticalLine.style.top = '0';
      this.verticalLine.style.opacity = '0.18';
      this.verticalLine.style.zIndex = '51';
      progressBar.appendChild(this.verticalLine);
    }
    this.verticalLine.style.left = linePosition;
    this.verticalLine.style.display = 'block';

    if (!this.tooltip) {
      this.tooltip = document.createElement('div');
      this.tooltip.style.position = 'fixed';
      this.tooltip.style.color = 'var(--dominant-color-light)';
      this.tooltip.style.padding = '4px 8px';
      this.tooltip.style.borderRadius = '0.75em';
      this.tooltip.style.fontSize = '0.75em';
      this.tooltip.style.pointerEvents = 'none';
      this.tooltip.style.zIndex = '49';
      this.tooltip.style.transform = 'translateY(4px)';
      this.tooltip.style.transition = 'all 0.3s ease-out';
      this.tooltip.style.opacity = '0';
      document.body.appendChild(this.tooltip);
    }

    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    const ms = Math.floor((timeInSeconds % 1) * 1000);
    const formattedTime = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;

    if (!(formattedTime == '00:00.000' || timeInSeconds < 0 || !isFinite(this.state.duration))) {
      const updateTooltipDiff = () => {
        const diffInSeconds = timeInSeconds - this.state.currentTime;
        const diffMins = Math.floor(Math.abs(diffInSeconds) / 60);
        const diffSecs = Math.floor(Math.abs(diffInSeconds) % 60);
        const diffMs = Math.floor((Math.abs(diffInSeconds) % 1) * 1000);
        let formattedDiff = '';
        const sign = diffInSeconds >= 0 ? '+' : '-';
        if (diffMins > 0) {
          formattedDiff = `${sign}${diffMins}:${diffSecs}.${diffMs}`;
        } else if (diffSecs > 0) {
          formattedDiff = `${sign}${diffSecs}.${diffMs}`;
        } else {
          formattedDiff = `${sign}${diffMs}`;
        }
        if (this.tooltip) {
          if (Math.abs(diffInSeconds) < 0.1) {
            this.tooltip.textContent = formattedTime;
          } else {
            this.tooltip.textContent = `${formattedTime} (${formattedDiff})`;
          }
        }
      };
      updateTooltipDiff();
      if (this.diffUpdateTimer) {
        clearInterval(this.diffUpdateTimer);
      }
      this.diffUpdateTimer = window.setInterval(updateTooltipDiff, 100);

      const lineRect = this.verticalLine.getBoundingClientRect();
      this.tooltip.style.left = `${lineRect.right - 6}px`;

      const tooltipRect = this.tooltip.getBoundingClientRect();
      const targetTop = `${rect.top + (rect.height - tooltipRect.height) / 2 - rect.height / 2 - 14}px`;

      this.tooltip.style.top = targetTop;
      this.tooltip.style.display = 'block';
      void this.tooltip.offsetWidth;
      this.tooltip.style.transform = 'translateY(0)';
      this.tooltip.style.opacity = '0.7';

      if (this.tooltipTimer) {
        clearTimeout(this.tooltipTimer);
      }

      this.tooltipTimer = window.setTimeout(() => {
        if (this.diffUpdateTimer) {
          clearInterval(this.diffUpdateTimer);
          this.diffUpdateTimer = null;
        }

        if (this.tooltip) {
          this.tooltip.style.transform = 'translateY(4px)';
          this.tooltip.style.opacity = '0';
          setTimeout(() => {
            if (this.tooltip) {
              this.tooltip.style.display = 'none';
            }
          }, 250);
        }
        if (this.verticalLine) {
          this.verticalLine.style.display = 'none';
        }
      }, 3000);
    } else {
      if (this.tooltip) {
        this.tooltip.style.transform = 'translateY(4px)';
        this.tooltip.style.opacity = '0';
        setTimeout(() => {
          if (this.tooltip) {
            this.tooltip.style.display = 'none';
          }
        }, 250);
      }
      if (this.tooltipTimer) {
        clearTimeout(this.tooltipTimer);
      }
    }
  }

  private setupWaveformEvents() {
    if (!this.progressBar || !this.waveformCanvas) {
      return;
    }

    this.progressBar.addEventListener('mouseenter', () => {
      if (this.waveformCanvas && this.waveformCanvas.width > 0 && this.progressBar && this.cachedWaveform && this.cachedWaveform.length > 0) {
        this.waveformCanvas.style.opacity = '1';
        this.redrawWaveform();
        this.progressBar.style.height = '24px';
        this.progressBar.style.borderRadius = '12px';
        const progressFill = this.progressBar.querySelector('#progressFill') as HTMLElement | null;
        if (progressFill) {
          progressFill.style.opacity = '0.24';
        }
      }
    });

    this.progressBar.addEventListener('mouseleave', () => {
      if (this.waveformCanvas && this.waveformCanvas.width > 0 && this.progressBar && this.cachedWaveform && this.cachedWaveform.length > 0) {
        this.waveformCanvas.style.opacity = '0';
        this.progressBar.style.height = '';
        this.progressBar.style.borderRadius = '';
        const progressFill = this.progressBar.querySelector('#progressFill') as HTMLElement | null;
        if (progressFill) {
          progressFill.style.opacity = '';
        }
      }
    });

    this.progressBar.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.waveformCanvas && this.waveformCanvas.width > 0 && this.progressBar && this.cachedWaveform && this.cachedWaveform.length > 0) {
        if (this.touchExitTimeout !== null) {
          clearTimeout(this.touchExitTimeout);
          this.touchExitTimeout = null;
        }
        this.progressBar.style.height = '24px';
        this.progressBar.style.borderRadius = '12px';
        const progressFill = this.progressBar.querySelector('#progressFill') as HTMLElement | null;
        if (progressFill) {
          progressFill.style.opacity = '0.24';
        }
        this.waveformCanvas.style.opacity = '1';
        this.redrawWaveform();
        this.seekToPosition(e);
      }
    }, { passive: false });

    this.progressBar.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (this.progressBar && this.state.duration > 0 && e.touches.length > 0) {
        this.showTooltip(this.progressBar, e.touches[0].clientX);
      }
    }, { passive: false });

    this.progressBar.addEventListener('touchend', () => {
      if (this.waveformCanvas && this.progressBar) {
        this.touchExitTimeout = window.setTimeout(() => {
          if (this.progressBar) {
            this.progressBar.style.height = '';
            this.progressBar.style.borderRadius = '';
            const progressFill = this.progressBar.querySelector('#progressFill') as HTMLElement | null;
            if (progressFill) {
              progressFill.style.opacity = '';
            }
          }
          if (this.waveformCanvas) {
            this.waveformCanvas.style.opacity = '0';
          }
          this.touchExitTimeout = null;
        }, 3000);
      }
    });

    window.addEventListener('resize', () => {
      this.updateWaveformCanvasSize();
      if (this.waveformCanvas && this.cachedWaveform) {
        this.redrawWaveform();
      }
    });
  }

  private initBackground() {
    this.background = BackgroundRender.new(MeshGradientRenderer);
    this.background.setFPS(this.state.backgroundFPS || 60);
    const dpr = window.devicePixelRatio || 1;
    this.background.setRenderScale((this.state.backgroundRenderScale || 1) * dpr);
    this.background.setStaticMode(!this.state.backgroundDynamic);
    this.background.setFlowSpeed(this.state.backgroundFlowSpeed);
    this.background.getElement().style.position = "absolute";
    this.background.getElement().style.top = "0";
    this.background.getElement().style.left = "0";
    this.background.getElement().style.width = "100%";
    this.background.getElement().style.height = "100%";
    this.background.getElement().style.backgroundSize = "cover";
    this.background.getElement().style.backgroundPosition = "center";
    this.background.getElement().style.backgroundRepeat = "no-repeat";
    this.background.getElement().style.transformOrigin = "center";
    this.background.getElement().style.willChange = "transform";
    const detectOptions = { skipSave: true } as const;
    this.detectMaxFPS(detectOptions).then(maxFPS => {
      if (this.bgFPS) {
        this.bgFPS.max = maxFPS.toString();
        if (parseInt(this.bgFPS.value) > maxFPS || parseInt(this.bgFPS.value) === 60) {
          this.bgFPS.value = maxFPS.toString();
          this.state.backgroundFPS = maxFPS;
          if (this.bgFPSValue) {
            this.bgFPSValue.textContent = `${maxFPS}fps`;
          }
          this.background.setFPS(maxFPS);
          if (!detectOptions.skipSave && !this.isHydratingSettings) {
            this.saveBackgroundSettings();
          }
        }
      }
    });

    if (this.backgroundStyleSelect) {
      this.backgroundStyleSelect.addEventListener("change", (e) => {
        const value = (e.target as HTMLSelectElement).value;
        this.switchBackgroundStyle(value);
      });

      const backgroundStyleSelect = this.backgroundStyleSelect;
      backgroundStyleSelect.addEventListener("keydown", (e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          const delta = e.key === "ArrowUp" ? -1 : 1;
          const newIndex = Math.max(0, Math.min(backgroundStyleSelect.options.length - 1, backgroundStyleSelect.selectedIndex + delta));
          backgroundStyleSelect.selectedIndex = newIndex;
          this.switchBackgroundStyle(backgroundStyleSelect.value);
        }
      });
      if (this.backgroundStyleSelect) {
        const backgroundStyleSelect = this.backgroundStyleSelect;
        backgroundStyleSelect.addEventListener("wheel", (e) => {
          e.preventDefault();
          const delta = e.deltaY > 0 ? 1 : -1;
          const newIndex = Math.max(0, Math.min(backgroundStyleSelect.options.length - 1, backgroundStyleSelect.selectedIndex + delta));
          backgroundStyleSelect.selectedIndex = newIndex;
          this.switchBackgroundStyle(backgroundStyleSelect.value);
        }, { passive: false });
      }
    }

    if (this.bgLowFreqVolume && this.bgLowFreqVolumeValue) {
      // 将[0.0-1.0]映射到[80hz-120hz]的显示函数
      const mapToFrequency = (value: number): string => {
        const frequency = 80 + (value * 40); // 0->80, 1->120
        return `${frequency.toFixed(0)}hz`;
      };

      this.bgLowFreqVolumeValue.textContent = mapToFrequency(parseFloat(this.bgLowFreqVolume.value));

      this.bgLowFreqVolume?.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        this.state.backgroundLowFreqVolume = value;
        if (this.bgLowFreqVolumeValue) {
          this.bgLowFreqVolumeValue.textContent = mapToFrequency(value);
        }
        if (this.background && typeof this.background.setLowFreqVolume === 'function') {
          this.background.setLowFreqVolume(value);
        }

        this.saveBackgroundSettings();
      });
    }

  }

  private originalDark = '';
  private originalLight = '';
  private originalDominant = '';
  private isColorsInitialized = false;

  private initColors() {
    if (this.isColorsInitialized) return;

    let dark = getComputedStyle(document.documentElement).getPropertyValue('--dominant-color-dark').trim();
    let light = getComputedStyle(document.documentElement).getPropertyValue('--dominant-color-light').trim();
    let dominant = getComputedStyle(document.documentElement).getPropertyValue('--dominant-color').trim();
    let waveform = getComputedStyle(document.documentElement).getPropertyValue('--waveform-color').trim();

    this.originalDark = dark || '#640302';
    this.originalLight = light || '#ffcfce';
    this.originalDominant = dominant || '#fd9c9b';
    if (!waveform) {
      document.documentElement.style.setProperty('--waveform-color', this.originalDominant);
    }

    this.isColorsInitialized = true;
  }

  private setDefaultColors(options?: { skipSave?: boolean }): void {
    document.documentElement.style.setProperty('--dominant-color', '#fd9c9b');
    document.documentElement.style.setProperty('--dominant-color-light', '#ffcfce');
    document.documentElement.style.setProperty('--dominant-color-dark', '#640302');
    document.documentElement.style.setProperty('--waveform-color', '#fd9c9b');

    this.originalDominant = '#fd9c9b';
    this.originalLight = '#ffcfce';
    this.originalDark = '#640302';
    this.isColorsInitialized = true;

    if (this.invertColorsCheckbox) {
      this.invertColors(this.invertColorsCheckbox.checked, { skipSave: options?.skipSave });
    }
  }

  private onDominantColorChange(): void {
    if (!this.dominantColorInput) return;
    this.state.manualDominantColor = this.dominantColorInput.value;
    this.applyManualColors();
    this.saveBackgroundSettings();
  }

  private onDominantColorLightChange(): void {
    if (!this.dominantColorLightInput) return;
    this.state.manualDominantColorLight = this.dominantColorLightInput.value;
    this.applyManualColors();
    this.saveBackgroundSettings();
  }

  private onDominantColorDarkChange(): void {
    if (!this.dominantColorDarkInput) return;
    this.state.manualDominantColorDark = this.dominantColorDarkInput.value;
    this.applyManualColors();
    this.saveBackgroundSettings();
  }

  private applyManualColors(): void {
    const isInverted = this.invertColorsCheckbox?.checked || false;
    const dominantColor = this.state.manualDominantColor || this.originalDominant;
    const lightColor = this.state.manualDominantColorLight || this.originalLight;
    const darkColor = this.state.manualDominantColorDark || this.originalDark;

    if (isInverted) {
      document.documentElement.style.setProperty('--dominant-color', lightColor);
      document.documentElement.style.setProperty('--dominant-color-light', darkColor);
      document.documentElement.style.setProperty('--dominant-color-dark', dominantColor);
      document.documentElement.style.setProperty('--waveform-color', darkColor);
    } else {
      document.documentElement.style.setProperty('--dominant-color', dominantColor);
      document.documentElement.style.setProperty('--dominant-color-light', lightColor);
      document.documentElement.style.setProperty('--dominant-color-dark', darkColor);
      document.documentElement.style.setProperty('--waveform-color', dominantColor);
    }
    this.redrawWaveform();
  }

  private invertColors(checked: boolean, options?: { skipSave?: boolean }): void {
    if (!this.invertColorsCheckbox) return;

    if (!this.isColorsInitialized) {
      this.initColors();
    }

    this.state.invertColors = checked;
    this.applyManualColors();
    if (!options?.skipSave && !this.isHydratingSettings) {
      this.saveBackgroundSettings();
    }
  }

  private applyDominantColorAsCSSVariable(): void {
    const isInverted = this.invertColorsCheckbox?.checked;

    if (this.dominantColor) {
      this.originalDominant = this.dominantColor;
      this.originalLight = this.lightenColor(this.dominantColor, 0.2);
      this.originalDark = this.darkenColor(this.dominantColor, 0.5);
      this.isColorsInitialized = true;
      if (this.dominantColorInput && !this.state.manualDominantColor) {
        this.dominantColorInput.value = this.dominantColor;
      }
      if (this.dominantColorLightInput && !this.state.manualDominantColorLight) {
        this.dominantColorLightInput.value = this.originalLight;
      }
      if (this.dominantColorDarkInput && !this.state.manualDominantColorDark) {
        this.dominantColorDarkInput.value = this.originalDark;
      }

      this.invertColors(isInverted || false);
    }
  }

  private switchBackgroundStyle(style: string, options?: { skipSave?: boolean }) {
    if (!this.background) return;

    const currentStyle = this.state.backgroundType;
    if (this.fluidDesc) this.fluidDesc.style.display = style === "fluid" ? "block" : "none";
    if (this.coverDesc) this.coverDesc.style.display = style === "cover" ? "block" : "none";
    if (this.solidDesc) this.solidDesc.style.display = style === "solid" ? "block" : "none";

    if (this.solidOptions) {
      const showSolidOptions = style === 'cover' && this.state.backgroundColorMask && this.state.backgroundMaskOpacity === 0;
      this.setOptionsVisibility(this.solidOptions, showSolidOptions, ['neumorphismA', 'neumorphismB']);
    }
    if (currentStyle === 'cover' && style !== 'cover' && this.invertColorsCheckbox) {
      this.state.originalInvertColors = this.invertColorsCheckbox.checked;
    }

    switch (style) {
      case "fluid":
        this.background.setFlowSpeed(this.state.backgroundFlowSpeed || 4);
        if (this.player) this.player.style.background = "";
        this.state.backgroundType = 'fluid';
        this.updateBackground();
        this.updateBackgroundUI();
        if (!options?.skipSave) {
          this.saveBackgroundSettings();
        }
        break;
      case "cover":
        this.background.setAlbum(resolveDefaultCover(this.state.coverUrl));
        if (this.player) this.player.style.background = "";
        this.state.backgroundType = 'cover';
        this.updateBackground();
        this.updateBackgroundUI();
        if (!options?.skipSave) {
          this.saveBackgroundSettings();
        }
        break;
      case "solid":
        this.background.setAlbum("");
        if (this.player) this.player.style.background = "transparent";
        this.state.backgroundType = 'solid';
        this.updateBackground();
        this.updateBackgroundUI();
        if (!options?.skipSave) {
          this.saveBackgroundSettings();
        }
        break;
      default:
        break;
    }

    if (style !== 'cover' && this.invertColorsCheckbox) {
      this.invertColorsCheckbox.checked = false;
      this.invertColors(false, { skipSave: options?.skipSave });
    }

    if (style === 'cover' && currentStyle !== 'cover' && this.invertColorsCheckbox) {
      const invertState = this.state.originalInvertColors !== null && this.state.originalInvertColors !== undefined ?
        this.state.originalInvertColors : this.state.invertColors;
      this.invertColorsCheckbox.checked = invertState;
      this.invertColors(invertState, { skipSave: options?.skipSave });
    }

    if (this.invertColorsCheckbox) {
      const isChecked = this.invertColorsCheckbox.checked;
      this.invertColorsCheckbox.onchange = () => {
        if (this.invertColorsCheckbox) {
          this.invertColors(this.invertColorsCheckbox.checked);
        }
      };
      if (isChecked && style === 'cover') {
        this.invertColors(isChecked, { skipSave: options?.skipSave });
      }
    }
  }

  private resetFluidBackgroundReplay(reason?: string): void {
    if (this.fluidBackgroundRefreshTimer !== null) {
      window.clearTimeout(this.fluidBackgroundRefreshTimer);
      this.fluidBackgroundRefreshTimer = null;
    }

    this.hasPerformedFluidBackgroundReplay = false;
    this.fluidBackgroundRefreshReason = typeof reason === "string" ? reason : null;
  }

  // Work around a legacy startup issue by replaying the known-good manual toggle.
  private scheduleFluidBackgroundRefresh(reason = "fluid-refresh", delay = 200): void {
    if (this.hasPerformedFluidBackgroundReplay) {
      return;
    }

    if (this.fluidBackgroundRefreshTimer !== null) {
      window.clearTimeout(this.fluidBackgroundRefreshTimer);
    }

    this.fluidBackgroundRefreshReason = reason || null;
    const effectiveDelay = Math.max(0, Math.round(delay ?? 200));

    this.fluidBackgroundRefreshTimer = window.setTimeout(() => {
      this.fluidBackgroundRefreshTimer = null;
      const replayReason = this.fluidBackgroundRefreshReason || "fluid-refresh";
      this.fluidBackgroundRefreshReason = null;

      if (this.hasPerformedFluidBackgroundReplay) {
        return;
      }

      if (!this.isInitialized || !this.background || this.state.backgroundType !== 'fluid' || this.isHydratingSettings) {
        return;
      }

      this.hasPerformedFluidBackgroundReplay = true;
      void replayReason;

      this.switchBackgroundStyle('cover', { skipSave: true });
      window.requestAnimationFrame(() => {
        if (!this.background) {
          return;
        }

        window.setTimeout(() => {
          if (!this.background) {
            return;
          }

          this.switchBackgroundStyle('fluid', { skipSave: true });
        }, 30);
      });
    }, effectiveDelay);
  }

  private setupAudioEvents() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    this.mediaSessionRefreshTimeout = null;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.refreshMediaSession();
      }
    });
    window.addEventListener('pageshow', () => {
      this.refreshMediaSession();
    });
    window.addEventListener('focus', () => {
      this.refreshMediaSession();
    });
    if (isIOS) {
      document.addEventListener('touchstart', () => {
        if (!this.mediaSessionRefreshTimeout) {
          this.mediaSessionRefreshTimeout = setTimeout(() => {
            this.refreshMediaSession();
            this.mediaSessionRefreshTimeout = null;
          }, 100);
        }
      }, { passive: true });
    }
    document.addEventListener('click', () => {
      if (this.beatState.audioContext && this.beatState.audioContext.state === 'suspended') {
        this.beatState.audioContext.resume().catch(() => {});
      }
    }, { passive: true });

    this.audio.addEventListener("loadedmetadata", () => {
      this.state.duration = this.audio.duration;
      this.updateTimeDisplay();
      this.updateMediaSessionMetadata();

      if (!isFinite(this.state.duration) && !this.cachedWaveform) {
        this.generateWaveformData();
      }

      if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream) {
        setTimeout(() => {
          this.updateMediaSessionMetadata();
        }, 100);
      }
    });

    this.audio.addEventListener("timeupdate", () => {
      this.state.currentTime = this.audio.currentTime;
      if (this.state.isRangeMode && this.state.rangeEndTime > this.state.rangeStartTime) {
        if (this.audio.currentTime >= this.state.rangeEndTime) {
          this.audio.currentTime = this.state.rangeStartTime;
          this.state.currentTime = this.state.rangeStartTime;
        }
      }

      this.updateProgress();
      this.updateTimeDisplay();
      // 应用歌词延迟调整，将当前时间加上延迟值（毫秒转换为秒）
      const adjustedTime =
        this.audio.currentTime * 1000 + this.state.lyricDelay;
      this.lyricPlayer.setCurrentTime(adjustedTime);
    });

    this.audio.addEventListener("play", () => {
      this.state.isPlaying = true;
      this.updatePlayButton();
      this.lyricPlayer.resume();
      this.updateMarqueeSettings();
      this.updateCoverRotation();
      this.syncBackgroundBeatState();

      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
      }
    });

    this.audio.addEventListener("pause", () => {
      this.state.isPlaying = false;
      this.updatePlayButton();
      this.lyricPlayer.pause();
      this.updateMarqueeSettings();
      this.updateCoverRotation();
      this.syncBackgroundBeatState();

      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
      }
    });

    this.audio.addEventListener("ended", () => {
      this.state.isPlaying = false;
      this.updatePlayButton();
      this.syncBackgroundBeatState();
      if (this.state.loopPlay) {
        this.audio.currentTime = 0;
        const firstLineStartTime = this.processedLyricLines.length > 0
          ? this.processedLyricLines[0].startTime
          : 0;
        this.lyricPlayer.setCurrentTime(firstLineStartTime);
        setTimeout(() => {
          this.lyricPlayer.setCurrentTime(this.state.lyricDelay);
        }, 50);
        this.audio.play();
      }

      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "none";
      }
    });

    let currentSrc = this.audio.src;
    const srcObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
          if (this.audio.src !== currentSrc) {
            currentSrc = this.audio.src;
            if (this.state.isRangeMode) {
              this.exitRangeMode();
            }
            this.generateWaveformData();
            this.clearBeatCurvePolling();
            this.beatCurvePath = null;
            this.beatState.beatCurve = null;
            this.resetBeatPaletteCache();
            this.syncBackgroundBeatState();
          }
        }
      });
    });
    srcObserver.observe(this.audio, { attributes: true });
    this.setupMediaSessionHandlers();
  }

  private setupLyricEvents() {
    this.lyricPlayer.addEventListener("line-click", (evt) => {
      const e = evt as LyricLineMouseEvent;
      evt.preventDefault();
      evt.stopImmediatePropagation();
      evt.stopPropagation();
      console.log(e.line, e.lineIndex);
      this.audio.currentTime = e.line.getLine().startTime / 1000;
    });

    const lyricRoot = this.lyricPlayer.getElement();
    if (lyricRoot) {
      lyricRoot.addEventListener(
        "touchend",
        (event: TouchEvent) => {
          if (!this.hasLyrics || event.changedTouches.length > 1) {
            return;
          }

          const target = event.target instanceof HTMLElement
            ? event.target
            : null;
          const lineObjects: any[] = (this.lyricPlayer as any)?.currentLyricLineObjects ?? [];
          const matchedLine = lineObjects.find((lineObj) => {
            const el = lineObj?.getElement?.();
            return el instanceof HTMLElement && (el === target || el.contains(target));
          });

          if (!matchedLine) {
            return;
          }

          const lyricLine = matchedLine.getLine?.();
          if (!lyricLine || typeof lyricLine.startTime !== "number") {
            return;
          }

          const startTimeMs = lyricLine.startTime;
          const newTimeSeconds = Math.max(0, startTimeMs / 1000);
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation?.();

          this.audio.currentTime = newTimeSeconds;
          this.lyricPlayer.setCurrentTime(startTimeMs, true);
          if (typeof (this.lyricPlayer as any).resetScroll === "function") {
            (this.lyricPlayer as any).resetScroll();
          }
        },
        { passive: false }
      );
    }

    this.updateLyricAreaHint();
  }

  private updateLyricAreaHint() {
    if (!this.lyricsPanel) return;

    if (this.lyricAreaHint) this.lyricAreaHint.remove();

    this.lyricAreaHint = null;
  }

  private setupDragAndDropEvents() {
    if (this.albumCoverLarge) {
      this.albumCoverLarge.addEventListener("dragover", (e) => {
        e.preventDefault();
        this.albumCoverLarge!.style.opacity = "0.7";
      });

      this.albumCoverLarge.addEventListener("dragleave", () => {
        this.albumCoverLarge!.style.opacity = "1";
      });

      this.albumCoverLarge.addEventListener("drop", (e) => {
        e.preventDefault();
        this.albumCoverLarge!.style.opacity = "1";

        if (e.dataTransfer?.files.length) {
          const file = e.dataTransfer.files[0];
          if (file.type.startsWith("image/")) {
            this.loadCoverFromFile(file);
            this.updateFileInputDisplay("coverFile", file);
          } else if (file.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name)) {
            this.loadMusicFromFile(file);
            this.updateFileInputDisplay("musicFile", file);
          } else {
            this.showStatus(t("status.unsupportedFileType"), true);
          }
        }
      });
    }

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

        if (e.dataTransfer?.files.length) {
          const file = e.dataTransfer.files[0];
          // 检查文件类型，iOS Safari 可能会上传 text/plain 类型的文件或空类型
          if (
            file.name.match(/\.(lrc|ttml|yrc|lys|qrc|txt|ass|lqe|lyl|srt|spl)$/i) ||
            file.type === "text/plain" ||
            file.type === ""
          ) {
            this.loadLyricFromFile(file);
            this.updateFileInputDisplay("lyricFile", file);
          }
        }
      });
    }
  }

  private updateFileInputDisplay(inputId: string, file: File | string) {
    let fileInput: HTMLInputElement | null = null;
    if (inputId === "musicFile") {
      fileInput = this.musicFile;
    } else if (inputId === "lyricFile") {
      fileInput = this.lyricFile;
    } else if (inputId === "coverFile") {
      fileInput = this.coverFile;
    }

    if (!fileInput) return;

    if (!file) {
      const oldDisplay = document.getElementById(`${inputId}Display`);
      if (oldDisplay) {
        oldDisplay.remove();
      }
      return;
    }

    const fileDisplay = document.createElement("span");
    fileDisplay.className = "control-value";
    fileDisplay.style = `max-width: 100%; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px;`;
    if (file instanceof File) {
      fileDisplay.textContent = `${file.name}`;
    } else {
      try {
        const url = new URL(file);
        const pathname = url.pathname;
        const filename = pathname.split('/').pop() || file;
        fileDisplay.textContent = `${filename}`;
      } catch {
        fileDisplay.textContent = file;
      }
    }
    fileDisplay.id = `${inputId}Display`;

    const oldDisplay = document.getElementById(`${inputId}Display`);
    if (oldDisplay) {
      oldDisplay.remove();
    }

    fileInput.parentNode?.insertBefore(fileDisplay, fileInput);
  }

  private initStats() {
    this.stats = new Stats();
    this.stats.showPanel(0);
    this.stats.dom.style.display = "none";
    document.body.appendChild(this.stats.dom);
  }

  private initUI() {
    this.initUploadButtons();

    if (this.lyricsPanel && this.lyricPlayer.getElement()) {
      this.lyricsPanel.appendChild(this.lyricPlayer.getElement());
    }

    this.updateLyricAreaHint();
    this.initLyricDisplayControls();

    if (this.playButton) {
      let playButtonLongPressTimer: number;
      let isLongPressTriggered = false;

      this.playButton.addEventListener("click", (e) => {
        if (isLongPressTriggered) {
          isLongPressTriggered = false;
          return;
        }

        if (!this.state.musicUrl || !this.audio.src) {
          e.preventDefault();
          if (this.musicFile) this.musicFile.click();
          return;
        }

        if (this.audio.src) {
          this.togglePlayPause();
        }
      });

      let isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

      this.playButton.addEventListener("mousedown", () => {
        isLongPressTriggered = false;
        playButtonLongPressTimer = window.setTimeout(() => {
          isLongPressTriggered = true;
          if (this.musicFile) this.musicFile.click();
        }, 3000);
      });

      this.playButton.addEventListener("mouseup", () => {
        clearTimeout(playButtonLongPressTimer);
      });

      this.playButton.addEventListener("mouseleave", () => {
        clearTimeout(playButtonLongPressTimer);
      });

      this.playButton.addEventListener("contextmenu", (e) => {
        e.preventDefault(); // 阻止默认右键菜单
        if (this.musicFile) this.musicFile.click();
        return false; // 为Safari返回false
      });

      this.playButton.addEventListener("touchstart", (e) => {
        const touchStartTime = Date.now();

        let isLongPress = false;
        playButtonLongPressTimer = window.setTimeout(() => {
          isLongPress = true;
          if (this.musicFile) this.musicFile.click();
        }, 3000);
      }, { passive: true });

      this.playButton.addEventListener("touchend", () => {
        clearTimeout(playButtonLongPressTimer);
      }, { passive: true });

      this.playButton.addEventListener("touchcancel", () => {
        clearTimeout(playButtonLongPressTimer);
      }, { passive: true });
    }

    if (this.player) {
      // 检查this.player是否有appendChild方法（确保它是DOM元素）
      if (typeof this.player.appendChild === 'function') {
        this.player.appendChild(this.audio);
        this.player.appendChild(this.background.getElement());
        this.player.appendChild(this.coverBlurBackground);

        if (this.lyricsPanel) {
          this.lyricsPanel.appendChild(this.lyricPlayer.getElement());

          this.lyricsPanel.addEventListener("click", (e) => {
            if (!this.hasLyrics) {
              if (this.lyricFile) this.lyricFile.click();
            }
          });

          this.lyricsPanel.addEventListener("touchend", (e) => {
            if (!this.hasLyrics) {
              e.preventDefault();
              if (this.lyricFile) this.lyricFile.click();
            }
          }, { passive: false });
        } else {
          this.player.appendChild(this.lyricPlayer.getElement());
        }
      }
    }

    this.initCoverBlurBackground();
    this.updateBackground({ skipSave: true });
    this.background.setAlbum(DEFAULT_AMLL_COVER_URL);
    this.setDefaultColors({ skipSave: true });

    if (this.controlPanel) {
      this.controlPanel.style.width = "0px";
      this.controlPanel.style.right = "-50px";
      this.controlPanel.style.opacity = "0";
    }

    this.adjustLyricPosition();
    this.updateAlbumSidePanel();
    this.updateLayoutByOrientation();
  }

  private async loadMusicFromFile(file: File) {
    try {
      // 检查文件类型，iOS Safari 可能会上传不同类型的音频文件
      const isAudioType = file.type.startsWith("audio/");
      const isValidExtension = /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name);

      if (!isAudioType && !isValidExtension) {
        this.showStatus(t("status.musicLoadFailed"), true);
        return;
      }

      const url = URL.createObjectURL(file);
      this.state.musicUrl = url;
      this.audio.crossOrigin = "anonymous"; // 允许跨域访问音频文件
      this.audio.src = url;
      this.audio.load();

      if (this.playControls) {
        this.playControls.style.bottom = "";
        this.playControls.style.opacity = "";
      }
      if (this.progressBar) {
        this.progressBar.style.width = "";
      }

      if (this.state.autoPlay) {
        this.togglePlayPause();
      } else {
        this.state.isPlaying = false;
        this.updatePlayButton();
      }
      await this.parseAudioMetadata(file);
      this.updateMediaSessionMetadata();

      if (this.controlPanel) {
        this.controlPanel.style.width = "0px";
        this.controlPanel.style.right = "-50px";
        this.controlPanel.style.opacity = "0";
      }

      this.updateFileInputDisplay("musicFile", file);
      this.showStatus(t("status.musicLoadSuccess"));
    } catch (error) {
      this.showStatus(t("status.musicLoadFailed"), true);
    }
  }

  private async loadLyricFromFile(file: File) {
    try {
      // 检查文件类型，iOS Safari 可能会上传 text/plain 类型的文件
      const isValidExtension = /\.(lrc|ttml|yrc|lys|qrc|txt|ass|lqe|lyl|srt|spl)$/i.test(
        file.name
      );
      const isTextPlain = file.type === "text/plain" || file.type === "";

      if (!isValidExtension && !isTextPlain) {
        this.showStatus(t("status.lyricsLoadFailed"), true);
        return;
      }

      const text = await file.text();
      const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
      this.state.lyricUrl = url;
      await this.loadLyricContent(text, file.name);
      this.updateFileInputDisplay("lyricFile", file);
      this.showStatus(t("status.lyricsLoadSuccess"));
    } catch (error) {
      this.showStatus(t("status.lyricsLoadFailed"), true);
    }
  }

  private async loadCoverFromFile(file: File) {
    this.resetFluidBackgroundReplay("loadCoverFromFile");
    try {
      const url = URL.createObjectURL(file);
      this.state.coverUrl = url;
      this.updateBackground();
      this.background.setAlbum(resolveDefaultCover(url));
      await this.extractAndProcessCoverColor(url);
      this.applyDominantColorAsCSSVariable();
      this.updateBackground();
      this.updateSongInfo();
      this.updateFileInputDisplay("coverFile", file);
      this.scheduleFluidBackgroundRefresh("loadCoverFromFile", 200);
      this.showStatus(t("status.coverLoadSuccess"));
    } catch (error) {
      this.showStatus(t("status.coverLoadFailed"), true);
    }
  }

  private async loadFromURLs(options?: { persist?: boolean }) {
    this.resetFluidBackgroundReplay("loadFromURLs");
    const persist = options?.persist !== false;
    let musicUrl = this.musicUrl?.value;
    let lyricUrl = this.lyricUrl?.value;
    let coverUrl = this.coverUrl?.value;

    // 如果输入框为空，尝试从URL参数获取
    const urlParams = new URLSearchParams(window.location.search);
    let shouldPersistSettings = false;

    const urlMusic = urlParams.get("music");
    if (urlMusic && this.musicUrl) {
      musicUrl = urlMusic;
      this.musicUrl.value = urlMusic;
      shouldPersistSettings = true;
    }

    const urlLyric = urlParams.get("lyric");
    if (urlLyric && this.lyricUrl) {
      lyricUrl = urlLyric;
      this.lyricUrl.value = lyricUrl;
      shouldPersistSettings = true;
    }

    const urlCover = urlParams.get("cover");
    if (urlCover && this.coverUrl) {
      coverUrl = urlCover;
      this.coverUrl.value = urlCover;
      shouldPersistSettings = true;
    }

    const playbackSpeed = urlParams.get("x");
    const lyricDelayMs = urlParams.get("ms");
    const volume = urlParams.get("vol");
    const loopPlay =
      urlParams.get("loop") === "1" || urlParams.get("loop") === "true";
    const currentTime = null; // 固定为 null，忽略 URL 参数 t

    if (playbackSpeed) {
      const speed = parseFloat(playbackSpeed);
      if (!isNaN(speed) && speed > 0) {
        if (this.playbackRateControl) {
          this.playbackRateControl.value = speed.toString();
          if (this.audio) {
            this.audio.playbackRate = speed;
          }
          if (this.playbackRateValue) {
            this.playbackRateValue.textContent = speed.toFixed(2) + "x";
          }
          this.updatePlaybackRateIcon(speed);
          this.state.playbackRate = speed;
          shouldPersistSettings = true;
        }
      }
    }

    if (lyricDelayMs) {
      const delay = parseInt(lyricDelayMs);
      if (!isNaN(delay)) {
        if (this.lyricDelayInput) {
          this.lyricDelayInput.value = delay.toString();
        }
        this.applyLyricDelay(delay, { skipSave: true });
      }
    }

    if (volume) {
      const volInput = parseFloat(volume);
      if (!isNaN(volInput)) {
        let vol;
        if (volInput > 1 && volInput <= 100) {
          vol = volInput / 100;
        } else if (volInput >= 0 && volInput <= 1) {
          vol = volInput;
        } else {
          vol = 0.5;
        }

        if (this.volumeControl) {
          this.volumeControl.value = Math.round(vol * 100).toString();
          if (this.audio) {
            this.audio.volume = vol;
          }
          if (this.volumeValue) {
            this.volumeValue.textContent = Math.round(vol * 100) + "%";
          }
          this.updateVolumeIcon(Math.round(vol * 100));
          this.state.volume = Math.round(vol * 100);
          shouldPersistSettings = true;
        }
      }
    }

    if (urlParams.has("loop")) {
      if (this.loopPlayCheckbox) {
        this.loopPlayCheckbox.checked = loopPlay;
        this.state.loopPlay = loopPlay;
        shouldPersistSettings = true;
      }
    }

    const urlTitle = urlParams.get("title");
    if (urlTitle && this.songTitleInput) {
      this.songTitleInput.value = urlTitle;
      this.state.songTitle = urlTitle;
      shouldPersistSettings = true;
    }

    const urlArtist = urlParams.get("artist");
    if (urlArtist && this.songArtistInput) {
      this.songArtistInput.value = urlArtist;
      this.state.songArtist = urlArtist;
      shouldPersistSettings = true;
    }

    this.refreshPageMetadata();

    if (musicUrl) {
      this.state.musicUrl = musicUrl;
      this.audio.src = musicUrl;
      this.audio.load();

      if (this.playControls) {
        this.playControls.style.bottom = "";
        this.playControls.style.opacity = "";
      }
      if (this.progressBar) {
        this.progressBar.style.width = "";
      }

      if (this.state.autoPlay) {
        this.togglePlayPause();
      } else {
        this.state.isPlaying = false;
        this.updatePlayButton();
      }
      this.updateMediaSessionMetadata();
      this.updateFileInputDisplay("musicFile", musicUrl);
    }

    if (lyricUrl) {
      this.state.lyricUrl = lyricUrl;

      const urlPattern = /^https?:\/\/.+/;
      if (urlPattern.test(lyricUrl.trim())) {
        try {
          const response = await fetch(lyricUrl);
          const text = await response.text();

          const isESFormat = isESLyRiCFormat(text);
          const isA2Format = isLyRiCA2Format(text);

          if (lyricUrl.endsWith(".lrc")) {
            if (isESFormat || isA2Format) {
              await this.loadLyricContent(text, lyricUrl);
            } else {
              await this.loadLyricContent(text, lyricUrl);
            }
          } else {
            await this.loadLyricContent(text, lyricUrl);
          }
          this.updateFileInputDisplay("lyricFile", lyricUrl);
        } catch (error) {
          this.showStatus(t("status.lyricsUrlLoadFailed"), true);
        }
      } else {
        await this.processLyricInput(lyricUrl);
      }
    }

    if (coverUrl) {
      const urlPattern = /^https?:\/\/.+/;
      if (urlPattern.test(coverUrl.trim())) {
        this.state.coverUrl = coverUrl;
        this.updateBackground();
        this.background.setAlbum(resolveDefaultCover(coverUrl));
        await this.extractAndProcessCoverColor(coverUrl);
        this.applyDominantColorAsCSSVariable();
        this.updateFileInputDisplay("coverFile", coverUrl);
      } else {
        const base64Pattern = /^data:([^;]+)(;charset=([^;]+))?;base64,([A-Za-z0-9+/=]+)$/;
        const base64Match = coverUrl.trim().match(base64Pattern);
        if (base64Match) {
          const contentType = base64Match[1] || 'image/png';
          const charset = base64Match[3] || 'utf-8';
          this.state.coverUrl = coverUrl;
          this.updateBackground();
          this.background.setAlbum(resolveDefaultCover(coverUrl));
          await this.extractAndProcessCoverColor(coverUrl);
          this.applyDominantColorAsCSSVariable();
          this.updateFileInputDisplay("coverFile", `Base64 Encoded Input (${contentType})`);
        } else {
          this.state.coverUrl = coverUrl;
          this.updateBackground();
          this.background.setAlbum(resolveDefaultCover(coverUrl));
          await this.extractAndProcessCoverColor(coverUrl);
          this.applyDominantColorAsCSSVariable();
          this.updateFileInputDisplay("coverFile", coverUrl);
        }
      }
    }

    this.updateSongInfo();

    if (this.controlPanel) {
      this.controlPanel.style.width = "0px";
      this.controlPanel.style.right = "-50px";
      this.controlPanel.style.opacity = "0";
    }

    const title = this.state.songTitle;
    const artist = this.state.songArtist;
    if (title) {
      this.refreshPageMetadata(title, artist);
    }

    if (currentTime && this.audio) {
      const time = parseFloat(currentTime);
      if (!isNaN(time) && time >= 0) {
        this.audio.currentTime = time;
      }
    }

    if (persist) {
      this.saveBackgroundSettings();
    }
    this.scheduleFluidBackgroundRefresh("loadFromURLs", 200);
    this.showStatus(t("status.loadFromUrlComplete"));
  }

  private async loadFromFiles() {
    const musicFile = this.musicFile?.files?.[0];
    const lyricFile = this.lyricFile?.files?.[0];
    const coverFile = this.coverFile?.files?.[0];

    if (musicFile) {
      await this.loadMusicFromFile(musicFile);
    }

    if (lyricFile) {
      await this.loadLyricFromFile(lyricFile);
    }

    if (coverFile) {
      await this.loadCoverFromFile(coverFile);
    }
  }

  private async processCoverInput(input: string) {
    this.resetFluidBackgroundReplay("processCoverInput");
    if (!input.trim()) {
      return;
    }

    const urlPattern = /^https?:\/\/.+/;
    if (urlPattern.test(input.trim())) {
      this.state.coverUrl = input;
      this.updateBackground();
      this.background.setAlbum(resolveDefaultCover(input));
      await this.extractAndProcessCoverColor(input);
      this.applyDominantColorAsCSSVariable();
      this.updateFileInputDisplay("coverFile", input);
      this.scheduleFluidBackgroundRefresh("processCoverInput-url", 200);
      return;
    }

    const base64Pattern = /^data:([^;]+)(;charset=([^;]+))?;base64,([A-Za-z0-9+/=]+)$/;
    const base64Match = input.trim().match(base64Pattern);
    if (base64Match) {
      const contentType = base64Match[1] || 'image/png';
      const charset = base64Match[3] || 'utf-8';
      this.state.coverUrl = input;
      this.updateBackground();
      this.background.setAlbum(resolveDefaultCover(input));
      await this.extractAndProcessCoverColor(input);
      this.applyDominantColorAsCSSVariable();
      this.updateFileInputDisplay("coverFile", `Base64 Encoded Input (${contentType})`);
      this.scheduleFluidBackgroundRefresh("processCoverInput-base64", 200);
      return;
    }

    this.state.coverUrl = input;
    this.updateBackground();
    this.background.setAlbum(resolveDefaultCover(input));
    await this.extractAndProcessCoverColor(input);
    this.applyDominantColorAsCSSVariable();
    this.updateFileInputDisplay("coverFile", input);
    this.scheduleFluidBackgroundRefresh("processCoverInput-generic", 200);
  }

  private async processLyricInput(input: string) {
    if (!input.trim()) {
      return;
    }

    const urlPattern = /^https?:\/\/.+/;
    if (urlPattern.test(input.trim())) {
      await this.loadFromURLs();
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
        this.updateFileInputDisplay("lyricFile", t("label.base64Input", { type: contentType }));
        this.showStatus(t("status.lyricsParseSuccess"));
      } catch (error) {
        console.error("Base64 decoding error:", error);
        this.showStatus(t("status.lyricsParseFailed"), true);
      }
      return;
    }

    try {
      await this.loadLyricContent(input, "direct-input.txt");
      this.updateFileInputDisplay("lyricFile", t("label.directInput"));
      this.showStatus(t("status.lyricsParseSuccess"));
    } catch (error) {
      console.error("Direct lyric input error:", error);
      this.showStatus(t("status.lyricsParseFailed"), true);
    }
  }

  private async loadLyricContent(content: string, filename: string) {
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

      const bgCount = lines.filter((line) => line.isBG).length;
      let consecutiveBgCount = 0;
      for (let i = 1; i < lines.length; i += 1) {
        if (lines[i - 1].isBG && lines[i].isBG) {
          consecutiveBgCount += 1;
        }
      }
      console.log(
        "[AMLL] Parsed lyric lines:",
        lines.length,
        "bgLines:",
        bgCount,
        "consecutiveBgPairs:",
        consecutiveBgCount
      );

      this.originalLyricLines = JSON.parse(JSON.stringify(lines));
      this.hasLyrics = lines.length > 0;
      this.updateLyricsDisplay();

      if (this.lyricsPanel && this.hasLyrics) {
        if (this.lyricAreaHint) this.lyricAreaHint.remove();
      }
      this.updateLyricAreaHint();
      this.showStatus(t("status.lyricsParseSuccessWithCount", { count: lines.length }));
    } catch (error) {
      console.error("Lyric parsing error:", error);
      this.showStatus(t("status.lyricsParseFailed"), true);
    }
  }

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

  private mapTTMLLyric(line: RawLyricLine): LyricLine {
    return {
      ...line,
      words: line.words.map((word) => ({ obscene: false, ...word })),
    };
  }

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

  private applyUrlStyleSideEffects(property: keyof PlayerState, value: any) {
    switch (property) {
      case 'lyricDelay': {
        const numeric = Math.round(Number(value));
        if (Number.isNaN(numeric)) {
          return;
        }
        this.state.lyricDelay = numeric;
        this.pendingLyricDelay = numeric;
        this.urlLyricDelayOverride = numeric;
        if (this.lyricDelayInput) {
          this.lyricDelayInput.value = numeric.toString();
        }
        break;
      }
      case 'playbackRate': {
        const numeric = Number(value);
        if (Number.isNaN(numeric) || numeric <= 0) {
          return;
        }
        this.state.playbackRate = numeric;
        if (this.playbackRateControl) {
          this.playbackRateControl.value = numeric.toString();
        }
        if (this.playbackRateValue) {
          this.playbackRateValue.textContent = `${numeric.toFixed(2)}x`;
        }
        this.updatePlaybackRateIcon(numeric);
        break;
      }
      case 'volume': {
        let numeric = Number(value);
        if (Number.isNaN(numeric)) {
          return;
        }
        numeric = Math.max(0, Math.min(100, Math.round(numeric)));
        this.state.volume = numeric;
        if (this.volumeControl) {
          this.volumeControl.value = numeric.toString();
        }
        if (this.volumeValue) {
          this.volumeValue.textContent = `${numeric}%`;
        }
        this.updateVolumeIcon(numeric);
        break;
      }
      case 'backgroundType': {
        if (value === 'fluid' || value === 'cover' || value === 'solid') {
          this.state.backgroundType = value;
          if (this.backgroundStyleSelect) {
            this.backgroundStyleSelect.value = value;
          }
          this.updateBackgroundUI();
          this.updateBackground({ skipSave: true });
        }
        break;
      }
      case 'backgroundDynamic': {
        const boolValue = Boolean(value);
        this.state.backgroundDynamic = boolValue;
        this.background.setStaticMode(!boolValue);
        this.updateBackgroundUI();
        this.updateBackground({ skipSave: true });
        break;
      }
      case 'backgroundFlowSpeed': {
        const numeric = Number(value);
        if (!Number.isNaN(numeric)) {
          this.state.backgroundFlowSpeed = numeric;
          if (this.bgFlowSpeed) {
            this.bgFlowSpeed.value = numeric.toString();
          }
          if (this.bgFlowSpeedValue) {
            this.bgFlowSpeedValue.textContent = numeric.toFixed(1);
          }
          this.background.setFlowSpeed(numeric);
          this.updateBackground({ skipSave: true });
        }
        break;
      }
      case 'backgroundColorMask': {
        const boolValue = Boolean(value);
        this.state.backgroundColorMask = boolValue;
        if (this.bgColorMask) {
          this.bgColorMask.checked = boolValue;
        }
        this.updateBackgroundUI();
        this.updateBackground({ skipSave: true });
        break;
      }
      case 'backgroundMaskColor': {
        if (typeof value === 'string' && value.trim()) {
          this.state.backgroundMaskColor = value;
          if (this.bgMaskColor) {
            this.bgMaskColor.value = value;
          }
          this.updateBackground({ skipSave: true });
        }
        break;
      }
      case 'backgroundMaskOpacity': {
        const numeric = Number(value);
        if (!Number.isNaN(numeric)) {
          const clamped = clamp(numeric, 0, 100);
          this.state.backgroundMaskOpacity = clamped;
          if (this.bgMaskOpacity) {
            this.bgMaskOpacity.value = clamped.toString();
          }
          if (this.bgMaskOpacityValue) {
            this.bgMaskOpacityValue.textContent = `${clamped}%`;
          }
          this.updateBackground({ skipSave: true });
        }
        break;
      }
      case 'backgroundBeatEnabled': {
        const boolValue = Boolean(value);
        this.state.backgroundBeatEnabled = boolValue;
        if (this.backgroundBeatCheckbox) {
          this.backgroundBeatCheckbox.checked = boolValue;
        }
        this.syncBackgroundBeatState();
        break;
      }
      case 'loopPlay': {
        const boolValue = Boolean(value);
        this.state.loopPlay = boolValue;
        if (this.loopPlayCheckbox) {
          this.loopPlayCheckbox.checked = boolValue;
        }
        break;
      }
      case 'autoPlay': {
        this.state.autoPlay = Boolean(value);
        break;
      }
      case 'lyricAlignAnchor': {
        if (typeof value === 'string') {
          const normalized = value === 'top' || value === 'bottom' ? value : 'center';
          this.state.lyricAlignAnchor = normalized as PlayerState['lyricAlignAnchor'];
          if (this.lyricAlignAnchorSelect) {
            this.lyricAlignAnchorSelect.value = normalized;
          }
        }
        break;
      }
      case 'lyricAlignPosition': {
        const numeric = Number(value);
        if (!Number.isNaN(numeric)) {
          this.state.lyricAlignPosition = numeric;
          if (this.lyricAlignPosition) {
            this.lyricAlignPosition.value = numeric.toString();
          }
          if (this.lyricAlignPositionValue) {
            this.lyricAlignPositionValue.textContent = numeric.toFixed(1);
          }
        }
        break;
      }
      case 'lyricFontSize': {
        const numeric = Number(value);
        if (!Number.isNaN(numeric)) {
          const clampedValue = Math.max(50, Math.min(200, Math.round(numeric)));
          this.state.lyricFontSize = clampedValue;
          if (this.lyricFontSize) {
            this.lyricFontSize.value = clampedValue.toString();
          }
          if (this.lyricFontSizeValue) {
            this.lyricFontSizeValue.textContent = `${clampedValue}%`;
          }
        }
        break;
      }
      default:
        break;
    }
  }

  private updateLyricsDisplay() {
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

    this.processedLyricLines = updatedLines as LyricLine[];
    this.lyricPlayer.setLyricLines(this.processedLyricLines);
    this.lyricPlayer.setHidePassedLines(this.state.hidePassedLyrics);
    const currentTimeMs = this.audio.currentTime * 1000;
    const nextLineStartTime = this.findNextLyricLineStartTime(currentTimeMs);
    this.lyricPlayer.setCurrentTime(nextLineStartTime);
    setTimeout(() => {
      const latestTimeMs = this.audio.currentTime * 1000;
      const delayToApply = this.pendingLyricDelay ?? this.state.lyricDelay;
      this.lyricPlayer.setCurrentTime(latestTimeMs + delayToApply);
      this.pendingLyricDelay = null;
    }, 50);
  }

  private initLyricDisplayControls() {
    if (this.showTranslatedLyricCheckbox) {
      this.showTranslatedLyricCheckbox.checked = this.state.showTranslatedLyric;
      this.showTranslatedLyricCheckbox.addEventListener('change', (e) => {
        this.state.showTranslatedLyric = (e.target as HTMLInputElement).checked;
        this.updateLyricsDisplay();
        this.saveBackgroundSettings();
      });
    }

    if (this.showRomanLyricCheckbox) {
      this.showRomanLyricCheckbox.checked = this.state.showRomanLyric;
      this.showRomanLyricCheckbox.addEventListener('change', (e) => {
        this.state.showRomanLyric = (e.target as HTMLInputElement).checked;
        this.updateLyricsDisplay();
        this.saveBackgroundSettings();
      });
    }

    if (this.swapLyricPositionsCheckbox) {
      this.swapLyricPositionsCheckbox.checked = this.state.swapLyricPositions;
      this.swapLyricPositionsCheckbox.addEventListener('change', (e) => {
        this.state.swapLyricPositions = (e.target as HTMLInputElement).checked;
        this.updateLyricsDisplay();
        this.saveBackgroundSettings();
      });
    }

    if (this.showbgLyricCheckbox) {
      this.showbgLyricCheckbox.checked = this.state.showbgLyric;
      this.showbgLyricCheckbox.addEventListener('change', (e) => {
        this.state.showbgLyric = (e.target as HTMLInputElement).checked;
        this.updateLyricsDisplay();
        this.saveBackgroundSettings();
      });
    }

    if (this.swapDuetsPositionsCheckbox) {
      this.swapDuetsPositionsCheckbox.checked = this.state.swapDuetsPositions;
      this.swapDuetsPositionsCheckbox.addEventListener('change', (e) => {
        this.state.swapDuetsPositions = (e.target as HTMLInputElement).checked;

        const isPortrait = window.matchMedia("(orientation: portrait)").matches;

        if (isPortrait) {
          const songInfoContainer = this.albumSidePanel?.querySelector('.song-info-container');

          if (songInfoContainer && this.albumInfo && this.albumCoverContainer) {
            if (this.state.swapDuetsPositions) {
              songInfoContainer.insertBefore(this.albumInfo, this.albumCoverContainer);
              this.albumCoverContainer.style.marginRight = '0';
              this.albumCoverContainer.style.marginLeft = '15px';
              this.albumInfo.style.textAlign = 'right';
            } else {
              songInfoContainer.insertBefore(this.albumCoverContainer, this.albumInfo);
              this.albumCoverContainer.style.marginLeft = '0';
              this.albumCoverContainer.style.marginRight = '15px';
              this.albumInfo.style.textAlign = 'left';
            }
          }
        } else {
          if (this.albumSidePanel && this.lyricsPanel && this.player) {
            if (this.state.swapDuetsPositions) {
              this.player.insertBefore(this.lyricsPanel, this.albumSidePanel);
            } else {
              this.player.insertBefore(this.albumSidePanel, this.lyricsPanel);
            }
          }
        }

        this.updateLyricsDisplay();
        this.saveBackgroundSettings();
      });
    }

    if (this.hidePassedLyricsCheckbox) {
      this.hidePassedLyricsCheckbox.checked = this.state.hidePassedLyrics;
      this.hidePassedLyricsCheckbox.addEventListener('change', (e) => {
        this.state.hidePassedLyrics = (e.target as HTMLInputElement).checked;
        this.updateLyricsDisplay();
        this.saveBackgroundSettings();
      });
    }

    if (this.advanceLyricTimingCheckbox) {
      this.advanceLyricTimingCheckbox.checked = this.state.advanceLyricTiming;
      this.advanceLyricTimingCheckbox.addEventListener('change', (e) => {
        this.state.advanceLyricTiming = (e.target as HTMLInputElement).checked;
        this.updateLyricsDisplay();
        this.saveBackgroundSettings();
      });
    }

    if (this.singleLyricsCheckbox) {
      this.singleLyricsCheckbox.checked = this.state.singleLyrics;
      this.singleLyricsCheckbox.addEventListener('change', (e) => {
        this.state.singleLyrics = (e.target as HTMLInputElement).checked;
        this.updateLyricsDisplay();
        this.saveBackgroundSettings();
      });
    }
  }

  private togglePlayPause() {
    if (this.audio.paused) {
      this.state.isPlaying = true;
      this.updatePlayButton();
      this.audio.play().catch(error => {
        console.error("Playback failed:", error);
        this.state.isPlaying = false;
        this.updatePlayButton();
      });
    } else {
      this.state.isPlaying = false;
      this.updatePlayButton();
      this.audio.pause();
    }
  }

  private updatePlayButton() {
    const btn = this.playButton;
    const landscapeBtn = this.landscapePlayBtn;

    if (btn) {
      btn.innerHTML = this.state.isPlaying
        ? '<svg aria-hidden="true" width="1em" height="1em" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M5 2a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H5Zm8 0a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-2Z" fill="currentColor"></path></svg>'
        : '<svg aria-hidden="true" width="1em" height="1em" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M17.22 8.68a1.5 1.5 0 0 1 0 2.63l-10 5.5A1.5 1.5 0 0 1 5 15.5v-11A1.5 1.5 0 0 1 7.22 3.2l10 5.5Z" fill="currentColor"></path></svg>';
    }
  }

  private updateProgress() {
    if (this.state.duration > 0) {

      if (this.state.isRangeMode && this.state.rangeEndTime > this.state.rangeStartTime) {
        const rangeDuration = this.state.rangeEndTime - this.state.rangeStartTime;
        const currentTimeInRange = Math.max(0, Math.min(rangeDuration, this.state.currentTime - this.state.rangeStartTime));
        const rangeProgressPercentage = (currentTimeInRange / rangeDuration) * 100;
        const startPercentage = (this.state.rangeStartTime / this.state.duration) * 100;
        const endPercentage = (this.state.rangeEndTime / this.state.duration) * 100;
        const widthPercentage = endPercentage - startPercentage;
        if (this.rangeProgressBar) {
          this.rangeProgressBar.style.left = `${startPercentage}%`;
          this.rangeProgressBar.style.width = `${widthPercentage}%`;
        }
        if (this.progressFill) {
          this.progressFill.style.left = `${startPercentage}%`;
          this.progressFill.style.width = `${rangeProgressPercentage * widthPercentage / 100}%`;
        }
        if (this.landscapeProgressFill) {
          this.landscapeProgressFill.style.left = `${startPercentage}%`;
          this.landscapeProgressFill.style.width = `${rangeProgressPercentage * widthPercentage / 100}%`;
        }
      } else {
        const percentage = (this.state.currentTime / this.state.duration) * 100;
        if (this.progressFill) {
          this.progressFill.style.left = '0%';
          this.progressFill.style.width = `${percentage}%`;
        }
        if (this.landscapeProgressFill) {
          this.landscapeProgressFill.style.left = '0%';
          this.landscapeProgressFill.style.width = `${percentage}%`;
        }
      }
    }
  }

  private updateTimeDisplay() {
    let currentTimeText, durationText, timeText;

    if (this.state.isRangeMode && this.state.rangeEndTime > this.state.rangeStartTime) {
      const rangeDuration = this.state.rangeEndTime - this.state.rangeStartTime;
      const currentTimeInRange = Math.max(0, Math.min(rangeDuration, this.state.currentTime - this.state.rangeStartTime));

      currentTimeText = this.formatTime(currentTimeInRange);
      durationText = this.formatTime(rangeDuration);

      if (this.state.showRemainingTime) {
        const remainingTimeInRange = this.formatTime(rangeDuration - currentTimeInRange);
        timeText = `${currentTimeText} / -${remainingTimeInRange}`;
      } else {
        timeText = `${currentTimeText} / ${durationText}`;
      }
    } else {
      currentTimeText = this.formatTime(this.state.currentTime);
      durationText = this.formatTime(this.state.duration);

      if (!isFinite(this.state.duration) || isNaN(this.state.duration)) {
        timeText = `${currentTimeText} / --:--`;
      } else if (this.state.showRemainingTime && this.state.duration > 0) {
        const remainingTime = this.formatTime(this.state.duration - this.state.currentTime);
        timeText = `${currentTimeText} / -${remainingTime}`;
      } else {
        timeText = `${currentTimeText} / ${durationText}`;
      }
    }

    if (this.timeDisplay) {
      this.timeDisplay.textContent = timeText;
    }
    if (this.landscapeTimeDisplay) {
      this.landscapeTimeDisplay.textContent = timeText;
    }
    if (this.timeDisplay) {
      void this.timeDisplay.offsetHeight;
    }
    if (this.landscapeTimeDisplay) {
      void this.landscapeTimeDisplay.offsetHeight;
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }

  private updateCoverStyle() {
    if (this.coverStyleSelect) {
      this.coverStyleSelect.value = this.state.coverStyle;
    }
    this.applyCoverStyle();
  }

  private applyCoverStyle() {
    if (!this.albumCoverContainer) return;
    this.albumCoverContainer.style.boxShadow = '';
    this.albumCoverContainer.style.transform = '';
    this.albumCoverContainer.style.background = '';
    this.albumCoverContainer.style.border = '';
    this.albumCoverContainer.style.filter = '';

    // 移除之前可能添加的伪元素样式
    if (this.coverStyleDynamic && this.coverStyleDynamic.parentNode) {
      this.coverStyleDynamic.parentNode.removeChild(this.coverStyleDynamic);
      this.coverStyleDynamic = null;
    }

    switch (this.state.coverStyle) {
      case "normal":
        // 默认样式阴影
        this.albumCoverContainer.style.boxShadow = '0 20px 25px rgba(0, 0, 0, 0.18), 0 10px 25px rgba(0, 0, 0, 0.18)';
        break;
      case "innerShadow":
        // 内阴影 - 使用伪元素实现，避免被图片覆盖，并随圆角变化
        const style = document.createElement('style');
        style.id = 'coverStyleDynamic';
        this.coverStyleDynamic = style; // 保存引用以便后续移除
        style.textContent = `
          #albumCoverContainer {
            position: relative;
          }
          #albumCoverContainer::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            box-shadow: inset 0 20px 25px rgba(0, 0, 0, 0.18), 0 10px 25px rgba(0, 0, 0, 0.18);
            pointer-events: none;
            z-index: 10;
            border-radius: calc(var(--rounded-cover-percent, 0) * 1%);
          }
          #albumCoverLarge {
            position: relative;
            z-index: 5;
          }
        `;
        document.head.appendChild(style);
        break;
      case "threeDShadow":
        // 立体投影效果（待实现）
        this.albumCoverContainer.style.boxShadow = '0 20px 25px rgba(0, 0, 0, 0.18), 0 10px 25px rgba(0, 0, 0, 0.18)';
        break;
      case "longShadow":
        // 长投影效果，仿照div长阴影样式实现，使用transform-origin、skew变换和动画效果，支持动态圆角
        const styleL = document.createElement('style');
        styleL.id = 'coverStyleDynamic';
        this.coverStyleDynamic = styleL; // 保存引用以便后续移除
        styleL.textContent = `
          #albumCoverContainer {
            position: relative;
            overflow: visible !important; /* 确保长投影不被裁剪 */
            box-shadow: none !important; /* 移除默认阴影以避免干扰 */
          }
          #albumCoverContainer::before,
          #albumCoverContainer::after {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: -1;
            border-radius: calc(var(--rounded-cover-percent, 0) * 1%);
          }
          #albumCoverContainer::before {
            transform-origin: 0 50%;
            transform: translate(100%, 0) skewY(45deg) scaleX(.6);
            background: linear-gradient(90deg, rgba(0, 0, 0, .3), transparent);
            animation: shadowMoveY 5s infinite linear alternate;
          }
          #albumCoverContainer::after {
            transform-origin: 0 0;
            transform: translate(0%, 100%) skewX(45deg) scaleY(.6);
            background: linear-gradient(180deg, rgba(0, 0, 0, .3), transparent);
            animation: shadowMoveX 5s infinite linear alternate;
          }
          @keyframes shadowMoveX {
            to {
              transform: translate(0%, 100%) skewX(50deg) scaleY(.6);
            }
          }
          @keyframes shadowMoveY {
            to {
              transform: translate(100%, 0) skewY(40deg) scaleX(.6);
            }
          }
        `;
        document.head.appendChild(styleL);
        break;
      case "neumorphismA":
        // 新拟态A - 浅色背景的凸起效果，支持动态圆角
        this.albumCoverContainer.style.boxShadow = '7px 7px 12px var(--dominant-color-dark), -7px -7px 12px var(--dominant-color-light), inset 0 0 0 var(--dominant-color-light), inset 0 0 0 var(--dominant-color-dark)';
        // border-radius 已通过 CSS 变量在 index.html 中设置
        break;
      case "neumorphismB":
        // 新拟态B - 浅色背景的凹陷效果，使用伪元素实现，避免被图片覆盖，并随圆角变化
        const styleB = document.createElement('style');
        styleB.id = 'coverStyleDynamic';
        this.coverStyleDynamic = styleB; // 保存引用以便后续移除
        styleB.textContent = `
          #albumCoverContainer {
            position: relative;
          }
          #albumCoverContainer::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            box-shadow: 0 0 0 var(--dominant-color-dark), 0 0 0 var(--dominant-color-light), inset -7px -7px 12px var(--dominant-color-light), inset 7px 7px 12px var(--dominant-color-dark);
            pointer-events: none;
            z-index: 10;
            border-radius: calc(var(--rounded-cover-percent, 0) * 1%);
          }
          #albumCoverLarge {
            position: relative;
            z-index: 5;
            border-radius: calc(var(--rounded-cover-percent, 0) * 1%);
          }
        `;
        document.head.appendChild(styleB);
        break;
      case "reflection":
        // 反射效果（待实现）
        this.albumCoverContainer.style.boxShadow = '0 20px 25px rgba(0, 0, 0, 0.18), 0 10px 25px rgba(0, 0, 0, 0.18)';
        break;
      case "cd":
        // CD样式（待实现）
        this.albumCoverContainer.style.boxShadow = '0 20px 25px rgba(0, 0, 0, 0.18), 0 10px 25px rgba(0, 0, 0, 0.18)';
        break;
      case "vinyl":
        // 黑胶唱片样式（待实现）
        this.albumCoverContainer.style.boxShadow = '0 20px 25px rgba(0, 0, 0, 0.18), 0 10px 25px rgba(0, 0, 0, 0.18)';
        break;
      case "colored":
        // 彩色样式（待实现）
        this.albumCoverContainer.style.boxShadow = '0 20px 25px rgba(0, 0, 0, 0.18), 0 10px 25px rgba(0, 0, 0, 0.18)';
        break;
    }
  }

  private seekToPosition(e: MouseEvent | TouchEvent) {
    const progressBar = this.progressBar;
    if (progressBar && this.state.duration > 0) {
      const rect = progressBar.getBoundingClientRect();
      let percentage = 0;
      let x = 0;
      if (e instanceof MouseEvent) {
        x = e.clientX;
        percentage = (x - rect.left) / rect.width;
      } else if (e instanceof TouchEvent && e.touches.length > 0) {
        x = e.touches[0].clientX;
        percentage = (x - rect.left) / rect.width;
      }
      this.showTooltip(progressBar, x);

      let newTime = percentage * this.state.duration;
      if (this.state.isRangeMode && this.state.rangeStartTime !== undefined && this.state.rangeEndTime !== undefined) {
        newTime = Math.max(this.state.rangeStartTime, Math.min(this.state.rangeEndTime, newTime));
      }

      this.audio.currentTime = newTime;
      this.state.currentTime = newTime;
      const nextLineStartTime = this.findNextLyricLineStartTime(newTime * 1000);
      this.lyricPlayer.setCurrentTime(nextLineStartTime);
      setTimeout(() => {
        const adjustedTime = newTime * 1000 + this.state.lyricDelay;
        this.lyricPlayer.setCurrentTime(adjustedTime);
      }, 50);

      this.updateProgress();
      this.updateTimeDisplay();
    }
  }

  private toggleFullscreen() {
    if (!document.fullscreenElement) {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0;

      if (isMobile) {
        const enterLandscapeFullscreen = async () => {
          try {
            await document.documentElement.requestFullscreen();
            const screenOrientation = (screen as any).orientation;
            if (screenOrientation && screenOrientation.lock) {
              try {
                await screenOrientation.lock('landscape');
              } catch (orientationError) {
              }
            }
            if (this.fullscreenEnterIcon && this.fullscreenExitIcon) {
              this.fullscreenEnterIcon.style.display = 'none';
              this.fullscreenExitIcon.style.display = 'inline';
            }
          } catch (fullscreenError) {
          }
        };

        enterLandscapeFullscreen();
      } else {
        document.documentElement.requestFullscreen();
        if (this.fullscreenEnterIcon && this.fullscreenExitIcon) {
          this.fullscreenEnterIcon.style.display = 'none';
          this.fullscreenExitIcon.style.display = 'inline';
        }
      }
    } else {
      document.exitFullscreen();
      const screenOrientation = (screen as any).orientation;
      if (screenOrientation && screenOrientation.unlock) {
        try {
          screenOrientation.unlock();
        } catch (unlockError) {
        }
      }
      if (this.fullscreenEnterIcon && this.fullscreenExitIcon) {
        this.fullscreenEnterIcon.style.display = 'inline';
        this.fullscreenExitIcon.style.display = 'none';
      }
    }
  }

  private toggleControlPanel() {
    if (this.controlPanel) {
      if (this.controlPanel.style.width === "0px") {
        this.controlPanel.style.width = "320px";
        this.controlPanel.style.right = "20px";
        this.controlPanel.style.opacity = "1";
      } else {
        this.controlPanel.style.width = "0px";
        this.controlPanel.style.right = "-50px";
        this.controlPanel.style.opacity = "0";
      }
    }
  }

  private handleKeyboard(e: KeyboardEvent) {
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      return;
    }

    switch (e.key) {
      case " ":
        e.preventDefault();
        this.togglePlayPause();
        break;
      case "ArrowLeft":
        this.audio.currentTime = Math.max(0, this.audio.currentTime - 10);
        const nextLineStartTimeLeft = this.findNextLyricLineStartTime(this.audio.currentTime * 1000);
        this.lyricPlayer.setCurrentTime(nextLineStartTimeLeft);
        setTimeout(() => {
          const adjustedTimeLeft = this.audio.currentTime * 1000 + this.state.lyricDelay;
          this.lyricPlayer.setCurrentTime(adjustedTimeLeft);
        }, 50);
        break;
      case "ArrowRight":
        this.audio.currentTime = Math.min(
          this.audio.duration,
          this.audio.currentTime + 10
        );
        const nextLineStartTimeRight = this.findNextLyricLineStartTime(this.audio.currentTime * 1000);
        this.lyricPlayer.setCurrentTime(nextLineStartTimeRight);
        setTimeout(() => {
          const adjustedTimeRight = this.audio.currentTime * 1000 + this.state.lyricDelay;
          this.lyricPlayer.setCurrentTime(adjustedTimeRight);
        }, 50);
        break;
      case "f":
        this.toggleFullscreen();
        break;
      case "h":
        this.toggleControlPanel();
        break;
    }
  }

  private setupTouchEvents() {
    let tapCount = 0;
    let lastTapTime = 0;

    document.addEventListener("touchend", (e) => {
      const touch = e.changedTouches[0];
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const x = touch.clientX;
      const y = touch.clientY;

      if (x > vw - 200 && y > vh - 200) {
        const now = Date.now();
        if (now - lastTapTime < 800) {
          tapCount++;
        } else {
          tapCount = 1;
        }
        lastTapTime = now;

        if (tapCount >= 5) {
          tapCount = 0;
          this.state.showFPS = !this.state.showFPS;
          this.updateFPSDisplay();
          if (this.showFPSCheckbox) {
            this.showFPSCheckbox.checked = this.state.showFPS;
          }
          this.saveBackgroundSettings();
          if (this.gui) {
            this.gui.domElement.style.display =
              this.gui.domElement.style.display === "none" ? "block" : "none";
          }
          this.stats.dom.style.display =
            this.stats.dom.style.display === "none" ? "block" : "none";
        }
      } else {
        tapCount = 0;
      }
    }, { passive: true });
  }

  private resetPlayer() {
    this.resetUploadButtons();
    Object.assign(this.state, cloneDefaultState());
    this.audio.pause();
    this.audio.currentTime = 0;
    this.audio.src = "";
    this.state.musicUrl = "";
    this.state.isPlaying = false;
    this.state.manualDominantColor = null;
    this.state.manualDominantColorLight = null;
    this.state.manualDominantColorDark = null;

    if (this.playControls) {
      this.playControls.style.bottom = "10px";
      this.playControls.style.opacity = "1";
    }
    if (this.progressBar) {
      this.progressBar.style.width = "72vw";
    }

    this.hasLyrics = false;
    this.lyricPlayer.setLyricLines([]);
    this.updateLyricAreaHint();
    this.updateFileInputDisplay("musicFile", "");
    this.updateFileInputDisplay("coverFile", "");
    this.updateFileInputDisplay("lyricFile", "");

    this.background.setAlbum(DEFAULT_AMLL_COVER_URL);
    this.setDefaultColors();
    this.isColorsInitialized = false;
    this.initColors();
    this.state.roundedCover = DEFAULT_PLAYER_STATE.roundedCover;
    this.updateRoundedCover();
    this.state.backgroundRenderScale = DEFAULT_PLAYER_STATE.backgroundRenderScale;
    const dpr = window.devicePixelRatio || 1;
    this.background.setRenderScale(this.state.backgroundRenderScale * dpr);
    this.state.lyricAlignPosition = DEFAULT_PLAYER_STATE.lyricAlignPosition;
    this.lyricPlayer.setAlignPosition(this.state.lyricAlignPosition);
    this.state.lyricFontSize = DEFAULT_PLAYER_STATE.lyricFontSize;
    this.updateLyricFontSize();
    this.state.hidePassedLyrics = DEFAULT_PLAYER_STATE.hidePassedLyrics;
    this.lyricPlayer.setHidePassedLines(this.state.hidePassedLyrics);
    this.state.enableLyricBlur = DEFAULT_PLAYER_STATE.enableLyricBlur;
    this.lyricPlayer.setEnableBlur(this.state.enableLyricBlur);
    this.state.enableLyricScale = DEFAULT_PLAYER_STATE.enableLyricScale;
    this.lyricPlayer.setEnableScale(this.state.enableLyricScale);
    this.state.enableLyricSpring = DEFAULT_PLAYER_STATE.enableLyricSpring;
    this.lyricPlayer.setEnableSpring(this.state.enableLyricSpring);
    this.state.wordFadeWidth = DEFAULT_PLAYER_STATE.wordFadeWidth;
    this.lyricPlayer.setWordFadeWidth(this.state.wordFadeWidth);
    this.state.backgroundFPS = DEFAULT_PLAYER_STATE.backgroundFPS;
    this.background.setFPS(this.state.backgroundFPS);
    this.state.showTranslatedLyric = DEFAULT_PLAYER_STATE.showTranslatedLyric;
    this.state.showRomanLyric = DEFAULT_PLAYER_STATE.showRomanLyric;
    this.state.swapLyricPositions = DEFAULT_PLAYER_STATE.swapLyricPositions;
    this.state.showbgLyric = DEFAULT_PLAYER_STATE.showbgLyric;
    this.state.swapDuetsPositions = DEFAULT_PLAYER_STATE.swapDuetsPositions;
    this.state.singleLyrics = DEFAULT_PLAYER_STATE.singleLyrics;
    this.state.backgroundLowFreqVolume = DEFAULT_PLAYER_STATE.backgroundLowFreqVolume;
    this.background.setLowFreqVolume(this.state.backgroundLowFreqVolume);
    this.state.backgroundBeatEnabled = DEFAULT_PLAYER_STATE.backgroundBeatEnabled;
    this.syncBackgroundBeatState();
    this.state.coverStyle = DEFAULT_PLAYER_STATE.coverStyle;

    this.state.lyricUrl = "";
    this.state.songTitle = "";
    this.state.songArtist = "";
    this.state.coverUrl = "";
    this.dynamicCoverUrl = "";
    this.dynamicCoverPosterUrl = "";
    this.dynamicCoverLoadFailed = false;
    this.refreshPageMetadata();
    this.updateMarqueeSettings();

    if (this.controlPointCodeInput) {
      this.controlPointCodeInput.value = '';
    }
    const renderer = this.background['renderer'];
    if (renderer && renderer instanceof MeshGradientRenderer) {
      renderer['manualControl'] = false;
    }

    if (this.albumCoverLarge) {
      this.albumCoverLarge.src = DEFAULT_AMLL_COVER_URL;
    }
    this.hideDynamicCoverVideo({ clearSource: true });

    if (this.songTitle) {
      this.songTitle.textContent = t("title");
    }

    if (this.songArtist) {
      this.songArtist.textContent = t("artist");
    }

    if (this.songTitleInput) {
      this.songTitleInput.value = "";
    }

    if (this.songArtistInput) {
      this.songArtistInput.value = "";
    }

    this.updateMediaSessionMetadata();
    const inputs = [
      "musicFile",
      "musicUrl",
      "lyricFile",
      "lyricUrl",
      "coverFile",
      "coverUrl",
      "songTitleInput",
      "songArtistInput",
      "lyricDelayInput",
    ];

    if (this.loopPlayCheckbox) {
      this.state.loopPlay = DEFAULT_PLAYER_STATE.loopPlay;
      this.loopPlayCheckbox.checked = this.state.loopPlay;
    }

    if (this.lyricAlignPositionValue) {
      this.lyricAlignPositionValue.textContent = '0.5';
    }

    if (this.enableLyricBlur) {
      this.enableLyricBlur.checked = this.state.enableLyricBlur;
    }
    if (this.enableLyricScale) {
      this.enableLyricScale.checked = this.state.enableLyricScale;
    }
    if (this.enableLyricSpring) {
      this.enableLyricSpring.checked = this.state.enableLyricSpring;
    }

    if (this.showbgLyricCheckbox) {
      this.showbgLyricCheckbox.checked = this.state.showbgLyric;
    }
    if (this.swapDuetsPositionsCheckbox) {
      this.swapDuetsPositionsCheckbox.checked = this.state.swapDuetsPositions;
    }
    if (this.singleLyricsCheckbox) {
      this.singleLyricsCheckbox.checked = this.state.singleLyrics;
    }

    if (this.bgLowFreqVolume) {
      this.bgLowFreqVolume.value = DEFAULT_PLAYER_STATE.backgroundLowFreqVolume.toString();
    }
    if (this.bgLowFreqVolumeValue) {
      const mapToFrequency = (value: number): string => {
        const frequency = 80 + (value * 40);
        return `${frequency.toFixed(0)}hz`;
      };
      this.bgLowFreqVolumeValue.textContent = mapToFrequency(DEFAULT_PLAYER_STATE.backgroundLowFreqVolume);
    }
    if (this.posYSpringMassInput) {
      this.posYSpringMassInput.value = DEFAULT_PLAYER_STATE.posYSpringMass.toString();
    }
    if (this.springPosYMassValue) {
      this.springPosYMassValue.textContent = DEFAULT_PLAYER_STATE.posYSpringMass.toString();
    }
    if (this.posYSpringDampingInput) {
      this.posYSpringDampingInput.value = DEFAULT_PLAYER_STATE.posYSpringDamping.toString();
    }
    if (this.springPosYDampingValue) {
      this.springPosYDampingValue.textContent = DEFAULT_PLAYER_STATE.posYSpringDamping.toString();
    }
    if (this.posYSpringStiffnessInput) {
      this.posYSpringStiffnessInput.value = DEFAULT_PLAYER_STATE.posYSpringStiffness.toString();
    }
    if (this.springPosYStiffnessValue) {
      this.springPosYStiffnessValue.textContent = DEFAULT_PLAYER_STATE.posYSpringStiffness.toString();
    }
    if (this.posYSpringSoftCheckbox) {
      this.posYSpringSoftCheckbox.checked = DEFAULT_PLAYER_STATE.posYSpringSoft;
    }
    if (this.scaleSpringMassInput) {
      this.scaleSpringMassInput.value = DEFAULT_PLAYER_STATE.scaleSpringMass.toString();
    }
    if (this.springScaleMassValue) {
      this.springScaleMassValue.textContent = DEFAULT_PLAYER_STATE.scaleSpringMass.toString();
    }
    if (this.scaleSpringDampingInput) {
      this.scaleSpringDampingInput.value = DEFAULT_PLAYER_STATE.scaleSpringDamping.toString();
    }
    if (this.springScaleDampingValue) {
      this.springScaleDampingValue.textContent = DEFAULT_PLAYER_STATE.scaleSpringDamping.toString();
    }
    if (this.scaleSpringStiffnessInput) {
      this.scaleSpringStiffnessInput.value = DEFAULT_PLAYER_STATE.scaleSpringStiffness.toString();
    }
    if (this.springScaleStiffnessValue) {
      this.springScaleStiffnessValue.textContent = DEFAULT_PLAYER_STATE.scaleSpringStiffness.toString();
    }
    if (this.scaleSpringSoftCheckbox) {
      this.scaleSpringSoftCheckbox.checked = DEFAULT_PLAYER_STATE.scaleSpringSoft;
    }

    if (this.controlPointCodeInput) {
      this.controlPointCodeInput.value = '';
    }

    const controlRenderer = this.background?.renderer;
    if (controlRenderer && 'setControlPoints' in controlRenderer && typeof controlRenderer.setControlPoints === 'function') {
      try {
        controlRenderer.setControlPoints([]);
      } catch (error) {
        console.error('Failed to reset control points:', error);
      }
    }

    if (this.playbackRateControl) {
      const defaultPlaybackRate = DEFAULT_PLAYER_STATE.playbackRate;
      this.playbackRateControl.value = defaultPlaybackRate.toString();
      this.audio.playbackRate = defaultPlaybackRate;
      this.state.playbackRate = defaultPlaybackRate;
      if (this.playbackRateValue) {
        this.playbackRateValue.textContent = `${defaultPlaybackRate.toFixed(2)}x`;
      }
      this.updatePlaybackRateIcon(defaultPlaybackRate);
    }

    if (this.volumeControl) {
      const defaultVolume = DEFAULT_PLAYER_STATE.volume;
      this.volumeControl.value = defaultVolume.toString();
      this.audio.volume = defaultVolume / 100;
      this.state.volume = defaultVolume;
      if (this.volumeValue) {
        this.volumeValue.textContent = `${Math.round(defaultVolume)}%`;
      }
      this.updateVolumeIcon(Math.round(defaultVolume));
    }

    if (this.showFPSCheckbox) {
      this.showFPSCheckbox.checked = false;
    }

    if (this.controlPanel) {
      this.controlPanel.style.width = "320px";
      this.controlPanel.style.right = "20px";
      this.controlPanel.style.opacity = "1";
    }
    if (this.musicUrl) this.musicUrl.value = "";
    if (this.lyricUrl) this.lyricUrl.value = "";
    if (this.coverUrl) this.coverUrl.value = "";

    inputs.forEach((id) => {
      if (id === "musicUrl" || id === "lyricUrl" || id === "coverUrl") {
        return;
      }
      // 使用缓存的DOM元素引用
      if (id === "musicFile" && this.musicFile) {
        this.musicFile.value = "";
      } else if (id === "lyricFile" && this.lyricFile) {
        this.lyricFile.value = "";
      } else if (id === "coverFile" && this.coverFile) {
        this.coverFile.value = "";
      } else if (id === "songTitleInput" && this.songTitleInput) {
        this.songTitleInput.value = "";
      } else if (id === "songArtistInput" && this.songArtistInput) {
        this.songArtistInput.value = "";
      } else if (id === "lyricDelayInput" && this.lyricDelayInput) {
        this.lyricDelayInput.value = "";
      }
    });

    if (this.showTranslatedLyricCheckbox) this.showTranslatedLyricCheckbox.checked = this.state.showTranslatedLyric;
    if (this.showRomanLyricCheckbox) this.showRomanLyricCheckbox.checked = this.state.showRomanLyric;
    if (this.swapLyricPositionsCheckbox) this.swapLyricPositionsCheckbox.checked = this.state.swapLyricPositions;
    this.updateLyricsDisplay();
    this.adjustLyricPosition();
    this.updatePlayButton();

    // 清除localStorage中的BackgroundSettings
    localStorage.removeItem(SETTINGS_STORAGE_KEY);

    this.updateBackgroundUI();
    this.updateBackground();
    this.updateFPSDisplay();
    this.reapplyI18n();

    if (this.progressFill) {
      this.progressFill.style.width = "0%";
    }
    if (this.landscapeProgressFill) {
      this.landscapeProgressFill.style.width = "0%";
    }

    this.updateProgress();
    this.updateTimeDisplay();
    this.updateCoverRotation();
    this.showStatus(t("status.playerReset"));
  }

  // 设置媒体会话操作处理程序
  private setupMediaSessionHandlers() {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("play", () => {
        this.audio.play();
      });

      navigator.mediaSession.setActionHandler("pause", () => {
        this.audio.pause();
      });

      navigator.mediaSession.setActionHandler("seekbackward", (details) => {
        const skipTime = details.seekOffset || 10;
        let newTime = Math.max(this.audio.currentTime - skipTime, 0);
        if (this.state.isRangeMode && this.state.rangeStartTime !== undefined && this.state.rangeEndTime !== undefined) {
          newTime = Math.max(this.state.rangeStartTime, Math.min(this.state.rangeEndTime, newTime));
        }

        this.audio.currentTime = newTime;
        const nextLineStartTime = this.findNextLyricLineStartTime(newTime * 1000);
        this.lyricPlayer.setCurrentTime(nextLineStartTime);
        setTimeout(() => {
          const adjustedTime = newTime * 1000 + this.state.lyricDelay;
          this.lyricPlayer.setCurrentTime(adjustedTime);
        }, 50);
      });

      navigator.mediaSession.setActionHandler("seekforward", (details) => {
        const skipTime = details.seekOffset || 10;
        let newTime = Math.min(
          this.audio.currentTime + skipTime,
          this.audio.duration
        );
        if (this.state.isRangeMode && this.state.rangeStartTime !== undefined && this.state.rangeEndTime !== undefined) {
          newTime = Math.max(this.state.rangeStartTime, Math.min(this.state.rangeEndTime, newTime));
        }

        this.audio.currentTime = newTime;
        const nextLineStartTime = this.findNextLyricLineStartTime(newTime * 1000);
        this.lyricPlayer.setCurrentTime(nextLineStartTime);
        setTimeout(() => {
          const adjustedTime = newTime * 1000 + this.state.lyricDelay;
          this.lyricPlayer.setCurrentTime(adjustedTime);
        }, 50);
      });

      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime !== undefined) {
          let newTime = details.seekTime;
          if (this.state.isRangeMode && this.state.rangeStartTime !== undefined && this.state.rangeEndTime !== undefined) {
            newTime = Math.max(this.state.rangeStartTime, Math.min(this.state.rangeEndTime, newTime));
          }

          this.audio.currentTime = newTime;
          const nextLineStartTime = this.findNextLyricLineStartTime(newTime * 1000);
          this.lyricPlayer.setCurrentTime(nextLineStartTime);
          setTimeout(() => {
            const adjustedTime = newTime * 1000 + this.state.lyricDelay;
            this.lyricPlayer.setCurrentTime(adjustedTime);
          }, 50);
        }
      });

      navigator.mediaSession.setActionHandler("previoustrack", () => {
        const newTime = this.state.isRangeMode && this.state.rangeStartTime !== undefined ? this.state.rangeStartTime : 0;
        this.audio.currentTime = newTime;
        if (this.processedLyricLines && this.processedLyricLines.length > 0) {
          const nextLineStartTime = this.findNextLyricLineStartTime(newTime * 1000);
          this.lyricPlayer.setCurrentTime(nextLineStartTime);
          setTimeout(() => {
            const adjustedTime = newTime * 1000 + this.state.lyricDelay;
            this.lyricPlayer.setCurrentTime(adjustedTime);
          }, 50);
        }
      });

      navigator.mediaSession.setActionHandler("nexttrack", null);
    }
  }

  // 更新媒体会话元数据
  private updateMediaSessionMetadata() {
    if ("mediaSession" in navigator) {
      const coverUrl = resolveDefaultCover(this.state.coverUrl);

      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.state.songTitle || t("title"),
        artist: this.state.songArtist || t("artist"),
        album: "",
        artwork: [
          { src: coverUrl, sizes: "96x96", type: "image/png" },
          { src: coverUrl, sizes: "128x128", type: "image/png" },
          { src: coverUrl, sizes: "192x192", type: "image/png" },
          { src: coverUrl, sizes: "256x256", type: "image/png" },
          { src: coverUrl, sizes: "384x384", type: "image/png" },
          { src: coverUrl, sizes: "512x512", type: "image/png" },
        ],
      });
    }
  }

  private refreshMediaSession() {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("seekbackward", null);
      navigator.mediaSession.setActionHandler("seekforward", null);
      navigator.mediaSession.setActionHandler("seekto", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.metadata = null;
      // 分离调用以减少单个setTimeout处理函数的执行时间
      setTimeout(() => {
        this.updateMediaSessionMetadata();
        if ("mediaSession" in navigator) {
          navigator.mediaSession.playbackState = this.state.isPlaying ? "playing" : "paused";
        }
      }, 50);
      setTimeout(() => {
        this.setupMediaSessionHandlers();
      }, 100);
    }
  }

  private updateSongInfo() {
    if (this.state.coverUrl && this.landscapeCover) {
      this.landscapeCover.style.backgroundImage = `url(${this.state.coverUrl})`;
    } else if (this.landscapeCover) {
      this.landscapeCover.style.backgroundImage = "none";
    }

    this.updateAlbumSidePanel();
    this.adjustLyricPosition();
    this.updateMediaSessionMetadata();
    this.updateMarqueeSettings();
    this.setDocumentTitle();
  }

  private adjustLyricPosition() {
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

  private updateAlbumSidePanel() {
    if (this.albumCoverLarge && this.songTitle && this.songArtist) {
      if (this.state.coverUrl) {
        this.albumCoverLarge.src = this.state.coverUrl;
      } else {
        this.albumCoverLarge.src = DEFAULT_AMLL_COVER_URL;
      }
      this.syncDynamicCoverVideo();
      this.songTitle.textContent = this.state.songTitle || t("title");
      this.songArtist.textContent = this.state.songArtist || t("artist");
      this.updateMarqueeSettings();
    }
  }

  private handleRangeSelection(e: MouseEvent | TouchEvent) {
    if (!this.progressBar || !this.state.duration) return;

    let clientX: number;
    if (e instanceof MouseEvent) {
      clientX = e.clientX;
    } else if (e instanceof TouchEvent && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
    } else {
      return;
    }
    const rect = this.progressBar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const selectedTime = ratio * this.state.duration;
    if (this.rangeSelectionCount >= 2) {
      this.clearRangeSelection();
    }
    if (this.rangeSelectionCount === 0) {
      this.state.rangeStartTime = selectedTime;
      this.createRangeLine(true, selectedTime);
    } else {
      this.state.rangeEndTime = selectedTime;
      this.createRangeLine(false, selectedTime);
      if (this.state.rangeStartTime > this.state.rangeEndTime) {
        const temp = this.state.rangeStartTime;
        this.state.rangeStartTime = this.state.rangeEndTime;
        this.state.rangeEndTime = temp;
        if (this.rangeStartLine && this.rangeEndLine) {
          const tempStyle = this.rangeStartLine.style.left;
          this.rangeStartLine.style.left = this.rangeEndLine.style.left;
          this.rangeEndLine.style.left = tempStyle;
        }
      }

      this.state.isRangeMode = true;
      this.createRangeProgressBar();
      this.updateTimeDisplay();
      if (this.audio) {
        this.audio.currentTime = this.state.rangeStartTime;
      }
    }

    this.rangeSelectionCount++;
  }

  private createRangeLine(isStart: boolean, time: number) {
    if (!this.progressBar || !this.state.duration) return;
    const percentage = (time / this.state.duration) * 100;
    const line = document.createElement('div');
    line.style.cssText = `
      position: absolute;
      top: 0;
      bottom: 0;
      width: 1px;
      background-color: ${isStart ? '#4CAF50' : '#FF5252'};
      left: ${percentage}%;
      cursor: pointer;
    `;
    line.addEventListener('click', (e) => {
      e.stopPropagation();
      this.exitRangeMode();
    });
    this.addLongPressAndRightClickHandler(line, () => {
      this.exitRangeMode();
    });
    if (isStart) {
      this.rangeStartLine = line;
    } else {
      this.rangeEndLine = line;
    }
    this.progressBar.appendChild(line);
  }

  private createRangeProgressBar() {
    if (!this.progressBar || !this.state.duration || this.state.rangeEndTime <= this.state.rangeStartTime) return;
    const startPercentage = (this.state.rangeStartTime / this.state.duration) * 100;
    const endPercentage = (this.state.rangeEndTime / this.state.duration) * 100;
    const widthPercentage = endPercentage - startPercentage;
    const rangeBar = document.createElement('div');
    rangeBar.style.cssText = `
      position: absolute;
      top: 0;
      height: 100%;
      left: ${startPercentage}%;
      width: ${widthPercentage}%;
      z-index: 5;
    `;

    this.rangeProgressBar = rangeBar;
    this.progressBar.appendChild(rangeBar);
  }

  private clearRangeSelection() {
    if (this.rangeStartLine && this.rangeStartLine.parentNode) {
      this.rangeStartLine.parentNode.removeChild(this.rangeStartLine);
      this.rangeStartLine = null;
    }
    if (this.rangeEndLine && this.rangeEndLine.parentNode) {
      this.rangeEndLine.parentNode.removeChild(this.rangeEndLine);
      this.rangeEndLine = null;
    }
    if (this.rangeProgressBar && this.rangeProgressBar.parentNode) {
      this.rangeProgressBar.parentNode.removeChild(this.rangeProgressBar);
      this.rangeProgressBar = null;
    }
    this.rangeSelectionCount = 0;
  }

  private exitRangeMode() {
    this.state.isRangeMode = false;
    this.clearRangeSelection();
    this.state.rangeStartTime = 0;
    this.state.rangeEndTime = 0;
    this.updateProgress();
    this.updateTimeDisplay();
  }

  private async parseAudioMetadata(file: File) {
    try {
      console.log(
        "Parsing audio metadata, file:",
        file.name,
        "size:",
        file.size
      );

      // 使用 jsmediatags 库解析音频元数据
      const jsmediatags = (window as any).jsmediatags;

      if (jsmediatags) {
        jsmediatags.read(file, {
          onSuccess: (tag: any) => {
            console.log("Audio metadata parsed successfully, full data:", tag);
            console.log("tags:", tag.tags);

            let hasMetadata = false;

            // 提取歌曲信息 - 优先使用TIT2(歌曲名)而不是TALB(专辑名)
            if (tag.tags && tag.tags.title) {
              this.state.songTitle = tag.tags.title;
              if (this.songTitleInput) {
                this.songTitleInput.value = tag.tags.title;
              }
              console.log("Extracted song title:", tag.tags.title);
              hasMetadata = true;
            }

            if (tag.tags && tag.tags.artist) {
              this.state.songArtist = tag.tags.artist;
              if (this.songArtistInput) {
                this.songArtistInput.value = tag.tags.artist;
              }
              console.log("Extracted song artist:", tag.tags.artist);
              hasMetadata = true;
            }

            // 提取封面图片
            if (tag.tags && tag.tags.picture) {
              console.log("Found cover image:", tag.tags.picture);
              const { data, format } = tag.tags.picture;
              let base64String = "";
              for (let i = 0; i < data.length; i++) {
                base64String += String.fromCharCode(data[i]);
              }
              const base64 = `data:${format};base64,${window.btoa(
                base64String
              )}`;
              this.state.coverUrl = base64;
              if (this.coverUrl) {
                const maxLength = 65536;
                if (base64.length > maxLength) {
                  const prefix = `data:${format};base64,`;
                  const availableChars = maxLength - prefix.length;
                  let truncatedBase64 = prefix + base64.substring(prefix.length, prefix.length + availableChars);
                  while (truncatedBase64.length % 4 !== 0) {
                    truncatedBase64 = truncatedBase64.substring(0, truncatedBase64.length - 1);
                  }
                  this.coverUrl.value = truncatedBase64;
                } else {
                  this.coverUrl.value = base64;
                }
              }
              this.background.setAlbum(resolveDefaultCover(base64));
              this.extractAndProcessCoverColor(base64);
              this.applyDominantColorAsCSSVariable();
              this.updateBackground();
              this.updateFileInputDisplay("coverFile", `Base64 Encoded Input (Embedded ${format})`);
              console.log(
                "Extracted cover image, format:",
                format,
                "size:",
                data.length
              );
              hasMetadata = true;
            }

            this.updateSongInfo();
            this.updateMediaSessionMetadata();

            if (hasMetadata) {
              this.showStatus(t("status.metadataParseSuccess"));
            } else {
              this.parseAudioMetadataFallback(file);
            }
          },
          onError: (error: any) => {
            this.showStatus(t("status.metadataParseFailed"), true);
            this.parseAudioMetadataFallback(file);
          },
        });
      } else {
        console.log("jsmediatags library not loaded");
        this.showStatus(t("status.metadataLibNotLoaded"), true);
        this.parseAudioMetadataFallback(file);
      }
    } catch (error) {
      this.showStatus(t("status.metadataParseError"), true);
      this.parseAudioMetadataFallback(file);
    }
  }

  private async parseAudioMetadataFallback(file: File) {
    try {
      // 备用方案：从文件名提取信息
      const fileName = file.name;
      const nameWithoutExt = fileName.replace(/\.[^/.]+$/, ""); // 移除扩展名

      // 尝试从文件名解析歌曲信息（格式：艺术家 - 歌曲名）
      const parts = nameWithoutExt.split(" - ");
      if (parts.length >= 2) {
        this.state.songArtist = parts[0].trim();
        this.state.songTitle = parts[1].trim();

        if (this.songArtistInput) {
          this.songArtistInput.value = this.state.songArtist;
        }
        if (this.songTitleInput) {
          this.songTitleInput.value = this.state.songTitle;
        }

        console.log("Parsing from filename:", {
          artist: this.state.songArtist,
          title: this.state.songTitle,
        });
        this.updateSongInfo();
        this.updateMediaSessionMetadata();
        this.showStatus(t("status.extractedSongInfo"));
      } else {
        const altParts = nameWithoutExt.split(" – ");
        if (altParts.length >= 2) {
          this.state.songArtist = altParts[0].trim();
          this.state.songTitle = altParts[1].trim();

          if (this.songArtistInput) {
            this.songArtistInput.value = this.state.songArtist;
          }
          if (this.songTitleInput) {
            this.songTitleInput.value = this.state.songTitle;
          }

          console.log("Parsing from filename (long dash):", {
            artist: this.state.songArtist,
            title: this.state.songTitle,
          });
          this.updateSongInfo();
          this.updateMediaSessionMetadata();
          this.showStatus(t("status.extractedSongInfo"));
        } else {
          this.state.songTitle = nameWithoutExt;
          if (this.songTitleInput) {
            this.songTitleInput.value = this.state.songTitle;
          }
          this.updateSongInfo();
          this.updateMediaSessionMetadata();
          this.showStatus(t("status.usedFilenameAsTitle"));
        }
      }

      // 尝试使用Web Audio API获取一些基本信息
      try {
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log("Audio info:", {
          duration: audioBuffer.duration,
          sampleRate: audioBuffer.sampleRate,
          numberOfChannels: audioBuffer.numberOfChannels,
        });
      } catch (audioError) {
        console.log("Web Audio API parsing failed:", audioError);
      }
    } catch (error) {
      console.log("Fallback parsing method failed:", error);
      this.showStatus(t("status.cannotParseAudioInfo"), true);
    }
  }

  private showStatus(message: string, isError = false) {
    if (this.status && this.statusText) {
      this.statusText.textContent = message;
      this.status.style.display = "block";

      if (isError) {
        this.status.style.background = "rgba(255, 0, 0, 0.9)";
      } else {
        this.status.style.background = "var(--dominant-color-dark)";
      }

      setTimeout(() => {
        if (this.status) {
          this.status.style.display = "none";
        }
      }, 3000);
    }
  }

  // 辅助函数：为元素添加长按和右键功能（兼容Safari）
  private addLongPressAndRightClickHandler(
    element: HTMLElement,
    callback: (e?: MouseEvent | TouchEvent) => void,
    longPressTime = 3000
  ) {
    if (!element) return;

    let timer: number;
    let isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    // 鼠标事件
    element.addEventListener("mousedown", (e) => {
      timer = window.setTimeout(() => callback(e), longPressTime);
    });

    element.addEventListener("mouseup", () => {
      clearTimeout(timer);
    });

    element.addEventListener("mouseleave", () => {
      clearTimeout(timer);
    });

    // 右键事件
    element.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      callback(e);
      return false; // 为Safari返回false
    });

    // 触摸事件
    element.addEventListener("touchstart", (e) => {
      // 使用标记来跟踪是否是长按
      let isLongPress = false;
      timer = window.setTimeout(() => {
        isLongPress = true;
        callback(e);
      }, longPressTime);
      // 不再阻止默认事件，允许正常点击
    }, { passive: true });

    element.addEventListener("touchend", (e) => {
      clearTimeout(timer);
      // 不阻止默认事件，允许正常点击行为
    });

    element.addEventListener("touchcancel", () => {
      clearTimeout(timer);
    }, { passive: true });
  }

  private showAutoPlayHint() {
    const hint = document.createElement("div");
    hint.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--dominant-color-dark);
      color: white;
      padding: 20px;
      border-radius: 10px;
      z-index: 100;
      text-align: center;
      max-width: 300px;
      font-size: 14px;
    `;
    const title = document.createElement("div");
    title.style.marginBottom = "15px";
    title.style.fontSize = "16px";
    title.textContent = t("hint.autoplay.title");

    const body = document.createElement("div");
    body.style.marginBottom = "15px";
    body.textContent = t("hint.autoplay.body");

    const instruction = document.createElement("div");
    instruction.style.marginBottom = "15px";
    instruction.textContent = t("hint.autoplay.instruction");

    const button = document.createElement("button");
    button.textContent = t("hint.autoplay.button");
    button.title = t("button.autoplayDismiss");
    button.setAttribute("aria-label", t("hint.autoplay.button"));
    button.style.cssText = `
        background: #007bff;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 5px;
        cursor: pointer;
      `;
    button.addEventListener("click", () => {
      hint.remove();
    });

    hint.appendChild(title);
    hint.appendChild(body);
    hint.appendChild(instruction);
    hint.appendChild(button);
    document.body.appendChild(hint);

    setTimeout(() => {
      if (hint.parentElement) {
        hint.remove();
      }
    }, 3000);
  }

  public loadFromURLParams(): boolean {
    this.urlOverrides.clear();
    const urlParams = new URLSearchParams(window.location.search);
    const music = urlParams.get("music");
    const lyric = urlParams.get("lyric");
    const cover = urlParams.get("cover");
    const title = urlParams.get("title");
    const artist = urlParams.get("artist");
    const hasAutoParam = urlParams.has("auto");
    const autoPlay =
      urlParams.get("auto") === "1" || urlParams.get("auto") === "true";
    const currentTime = null; // 固定为 null，忽略 URL 参数 t
    const endTime = urlParams.get("te");

    this.updateDynamicCoverFromUrlParams(urlParams);

    let styleParamsChanged = false;

    const processStyleParam = (
      queryKey: string,
      config: { property: keyof PlayerState; parse?: (raw: string, defaultValue: any) => any }
    ) => {
      const raw = urlParams.get(queryKey);
      if (raw === null) {
        return;
      }
      const { property, parse } = config;
      const defaultValue = DEFAULT_PLAYER_STATE[property];
      const parsed =
        parse ? parse(raw, defaultValue) : parseUrlParamValue(raw, defaultValue);
      if (parsed === undefined) {
        return;
      }
      (this.state as any)[property] = parsed;
      this.urlOverrides.add(property);
      this.applyUrlStyleSideEffects(property, parsed);
      styleParamsChanged = true;
    };

    if (!music) {
      if (this.controlPanel) {
        this.controlPanel.style.width = "320px";
        this.controlPanel.style.right = "20px";
        this.controlPanel.style.opacity = "1";
      }
    }

    if (music) {
      this.urlOverrides.add("musicUrl");
      this.urlOverrides.add("musicUrlInput");
      this.state.musicUrl = music;
      if (this.musicUrl) {
        this.musicUrl.value = music;
      }
    }
    if (lyric) {
      this.urlOverrides.add("lyricUrl");
      this.urlOverrides.add("lyricUrlInput");
      this.state.lyricUrl = lyric;
      if (this.lyricUrl) {
        this.lyricUrl.value = lyric;
      }
    }
    if (cover) {
      this.urlOverrides.add("coverUrl");
      this.urlOverrides.add("coverUrlInput");
      this.state.coverUrl = cover;
      if (this.coverUrl) {
        this.coverUrl.value = cover;
      }
    }
    if (title) {
      this.urlOverrides.add("songTitle");
      this.urlOverrides.add("songTitleInput");
      if (this.songTitleInput) this.songTitleInput.value = title;
      this.state.songTitle = title;
    }
    if (artist) {
      this.urlOverrides.add("songArtist");
      this.urlOverrides.add("songArtistInput");
      if (this.songArtistInput) this.songArtistInput.value = artist;
      this.state.songArtist = artist;
    }

    if (title || artist) {
      this.refreshPageMetadata(title ?? undefined, artist ?? undefined);
    }

    Object.entries(URL_ALIAS_CONFIG).forEach(([queryKey, config]) => {
      processStyleParam(queryKey, config);
    });

    for (const property of STYLE_PARAM_KEYS) {
      processStyleParam(property as string, { property });
    }

    const controlPointCode = urlParams.get('controlPointCode');
    if (controlPointCode !== null) {
      this.urlOverrides.add('controlPointCode');
      this.pendingControlPointCodeFromUrl = controlPointCode;
      if (this.controlPointCodeInput) {
        this.controlPointCodeInput.value = controlPointCode;
      }
      styleParamsChanged = true;
    }

    if (currentTime) {
      this.urlOverrides.add("rangeStartTime");
    }
    if (endTime) {
      this.urlOverrides.add("rangeEndTime");
      this.urlOverrides.add("isRangeMode");
    }

    if (music || lyric || cover || title || artist) {
      this.updateSongInfo();
    }

    if (music || lyric || cover) {
      this.hasAutoLoadedFromUrl = true;
      this.loadFromURLs({ persist: false }).then(() => {
        // t 参数固定为 0，不从 URL 读取
        console.log('[AMLL] 设置播放时间为 0，忽略 URL 参数 t');
        if (this.audio) {
          this.audio.currentTime = 0;
          this.state.rangeStartTime = 0;
          console.log('[AMLL] 已设置 audio.currentTime = 0, rangeStartTime = 0');
        } else {
          console.log('[AMLL] audio 对象不存在，无法设置播放时间');
        }

        if (endTime) {
          const te = parseFloat(endTime);
          if (!isNaN(te) && te !== 0 && (!currentTime || parseFloat(currentTime) <= te)) {
            this.state.rangeEndTime = te;
            this.state.isRangeMode = true;
          }
        }

        if ((hasAutoParam ? autoPlay : this.state.autoPlay) && this.audio) {
          this.audio.play().catch(() => {
            this.showAutoPlayHint();
          });
        }
      });
      return styleParamsChanged;
    }

    if (currentTime && this.audio) {
      const time = parseFloat(currentTime);
      if (!isNaN(time) && time >= 0) {
        this.audio.currentTime = time;
      }
    }

    return styleParamsChanged;
  }

  public start() {
    this.isHydratingSettings = true;
    this.loadBackgroundSettings();
    const urlStyleParamsChanged = this.loadFromURLParams();

    this.updateBackgroundUI();
    this.updateBackground({ skipSave: true });
    this.syncBackgroundBeatState();

    this.isHydratingSettings = false;

    if (urlStyleParamsChanged) {
      this.saveBackgroundSettings({ backgroundOnly: true });
    }

    this.startAnimationLoop();
    this.background.resume();
    this.syncBackgroundBeatState();

    const urlParams = new URLSearchParams(window.location.search);
    const hasMusicParam = urlParams.has("music");
    if (!hasMusicParam) {
      if (this.playControls) {
        this.playControls.style.bottom = "10px";
        this.playControls.style.opacity = "1";
      }
      if (this.progressBar) {
        this.progressBar.style.width = "72vw";
      }
    }

    this.isInitialized = true;
    this.initAlbumCoverEffects();
    this.scheduleFluidBackgroundRefresh("start-fallback", 500);

    if (this.urlLyricDelayOverride !== null) {
      if (this.lyricDelayInput) {
        this.lyricDelayInput.value = this.urlLyricDelayOverride.toString();
      }
      this.applyLyricDelay(this.urlLyricDelayOverride, { skipSave: true });
      this.urlLyricDelayOverride = null;
    }

    if (this.pendingControlPointCodeFromUrl) {
      if (this.controlPointCodeInput) {
        this.controlPointCodeInput.value = this.pendingControlPointCodeFromUrl;
      }
      this.applyControlPointCode();
      this.pendingControlPointCodeFromUrl = null;
    }

    if (!this.hasAutoLoadedFromUrl) {
      setTimeout(() => {
        this.hasAutoLoadedFromUrl = true;
        this.loadFromUrlBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }, 0);
    }
  }

  private startAnimationLoop() {
    let lastTime = -1;

    const frame = (time: number) => {
      this.stats.end();

      if (lastTime === -1) {
        lastTime = time;
      }

      this.lyricPlayer.update(time - lastTime);
      lastTime = time;

      this.stats.begin();
      requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  }

  // 获取播放器实例（用于外部调用）
  public getAudio(): HTMLAudioElement {
    return this.audio;
  }

  public getLyricPlayer(): BaseDomLyricPlayer {
    return this.lyricPlayer;
  }

  public getBackground(): BackgroundRender<
    PixiRenderer | MeshGradientRenderer
  > {
    return this.background;
  }

  private async extractAndProcessCoverColor(imageUrl: string): Promise<void> {
    try {
      const img = new Image();

      // 只有在非base64和非blob URL时才设置crossOrigin
      if (!imageUrl.startsWith('data:image/') && !imageUrl.startsWith('blob:')) {
        img.crossOrigin = 'Anonymous';
      }

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageUrl;
      });
      const [r, g, b] = this.colorThief.getColor(img);
      try {
        const palette = this.colorThief.getPalette(img, AMLL_PALETTE_TARGET);
        if (Array.isArray(palette) && palette.length) {
          const hslPalette = palette.map((rgb) => {
            const hex = `#${rgb[0].toString(16).padStart(2, '0')}${rgb[1].toString(16).padStart(2, '0')}${rgb[2].toString(16).padStart(2, '0')}`;
            const hsl = hexToHsl(hex);
            if (!hsl) return null;
            const origS = clamp(hsl.s, 0, 100);
            return { h: hsl.h, l: hsl.l, baseS: clamp(origS - 50, 0, 100), origS };
          }).filter(Boolean) as Array<{ h: number; l: number; baseS: number; origS?: number }>;
          hslPalette.sort((a, b) => (a.h - b.h) || (a.l - b.l));
          if (hslPalette.length) {
            this.coverPaletteHsl = hslPalette;
            this.beatState.basePaletteHsl = hslPalette.map((entry) => ({ ...entry }));
            this.beatState.lastColors = null;
          }
        }
      } catch {
        // ignore palette failures
      }
      const hsl = this.rgbToHsl(r, g, b);
      hsl[2] = 0.8;
      const [newR, newG, newB] = this.hslToRgb(hsl[0], hsl[1], hsl[2]);
      this.dominantColor = this.rgbToHex(newR, newG, newB);
      // 计算颜色亮度并自动决定是否需要反转使用相对亮度公式: L = (0.299*R + 0.587*G + 0.114*B)/255
      const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const shouldInvert = brightness >= 0.5;
      this.applyDominantColorAsCSSVariable();
      if (this.invertColorsCheckbox) {
        if (this.state.backgroundType === 'cover') {
          if (this.state.originalInvertColors === null && this.state.originalInvertColors === undefined) {
            this.invertColorsCheckbox.checked = shouldInvert;
            this.invertColors(shouldInvert);
          } else {
            this.invertColorsCheckbox.checked = this.state.originalInvertColors;
            this.invertColors(this.state.originalInvertColors);
          }
        }
      }
    } catch (error) {
      this.setDefaultColors();
      this.applyDominantColorAsCSSVariable();
    }
  }

  /**
   * RGB转HSL
   */
  private rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // 灰色
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }

      h /= 6;
    }

    return [h, s, l];
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r, g, b;

    if (s === 0) {
      r = g = b = l; // 灰色
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private lightenColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * amount * 100);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  private darkenColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * amount * 100);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return '#' + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
      (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
      (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
  }

  private saveBackgroundSettings(options?: { backgroundOnly?: boolean }) {
    if (this.isHydratingSettings) {
      return;
    }

    const baseSettings = readStoredSettings();

    const backgroundSettings = {
      backgroundType: this.state.backgroundType,
      backgroundDynamic: this.state.backgroundDynamic,
      backgroundFlowSpeed: this.state.backgroundFlowSpeed,
      backgroundColorMask: this.state.backgroundColorMask,
      backgroundMaskColor: this.state.backgroundMaskColor,
      backgroundMaskOpacity: this.state.backgroundMaskOpacity,
      showFPS: this.state.showFPS,
      coverBlurLevel: this.state.coverBlurLevel,
      invertColors: this.state.invertColors,
      manualDominantColor: this.state.manualDominantColor,
      manualDominantColorLight: this.state.manualDominantColorLight,
      manualDominantColorDark: this.state.manualDominantColorDark,
      roundedCover: this.state.roundedCover,
      coverRotationSpeed: this.state.coverRotationSpeed,
      backgroundRenderScale: this.state.backgroundRenderScale,
      backgroundLowFreqVolume: this.state.backgroundLowFreqVolume,
      backgroundBeatEnabled: this.state.backgroundBeatEnabled,
      coverStyle: this.state.coverStyle,
      backgroundFPS: this.state.backgroundFPS,
    };

    const fullSettings = options?.backgroundOnly
      ? backgroundSettings
      : {
          ...backgroundSettings,
          marqueeEnabled: this.state.marqueeEnabled,
          lyricAlignPosition: this.state.lyricAlignPosition,
          lyricFontSize: this.state.lyricFontSize,
          lyricDelay: this.state.lyricDelay,
          hidePassedLyrics: this.state.hidePassedLyrics,
          enableLyricBlur: this.state.enableLyricBlur,
          enableLyricScale: this.state.enableLyricScale,
          enableLyricSpring: this.state.enableLyricSpring,
          wordFadeWidth: this.state.wordFadeWidth,
          lyricAlignAnchor: this.state.lyricAlignAnchor,
          showTranslatedLyric: this.state.showTranslatedLyric,
          showRomanLyric: this.state.showRomanLyric,
          swapLyricPositions: this.state.swapLyricPositions,
          showbgLyric: this.state.showbgLyric,
          swapDuetsPositions: this.state.swapDuetsPositions,
          advanceLyricTiming: this.state.advanceLyricTiming,
          singleLyrics: this.state.singleLyrics,
          posYSpringMass: this.state.posYSpringMass,
          posYSpringDamping: this.state.posYSpringDamping,
          posYSpringStiffness: this.state.posYSpringStiffness,
          posYSpringSoft: this.state.posYSpringSoft,
          scaleSpringMass: this.state.scaleSpringMass,
          scaleSpringDamping: this.state.scaleSpringDamping,
          scaleSpringStiffness: this.state.scaleSpringStiffness,
          scaleSpringSoft: this.state.scaleSpringSoft,
          playbackRate: this.state.playbackRate,
          volume: this.state.volume,
          loopPlay: this.state.loopPlay,
          showRemainingTime: this.state.showRemainingTime,
          autoPlay: this.state.autoPlay,
          musicUrl: this.state.musicUrl,
          lyricUrl: this.state.lyricUrl,
          coverUrl: this.state.coverUrl,
          songTitle: this.state.songTitle,
          songArtist: this.state.songArtist,
          musicUrlInput: this.musicUrl?.value || '',
          lyricUrlInput: this.lyricUrl?.value || '',
          coverUrlInput: this.coverUrl?.value || '',
          songTitleInput: this.songTitleInput?.value || '',
          songArtistInput: this.songArtistInput?.value || '',
          isRangeMode: this.state.isRangeMode,
          rangeStartTime: this.state.rangeStartTime,
          rangeEndTime: this.state.rangeEndTime,
          controlPointCode: this.controlPointCodeInput?.value || '',
        };

    const settings = {
      ...baseSettings,
      ...fullSettings,
    };

    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }

  private loadBackgroundSettings() {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const settings = JSON.parse(saved);
        const defaults = DEFAULT_PLAYER_STATE;
        const hasSetting = (key: string) => Object.prototype.hasOwnProperty.call(settings, key);

        if (hasSetting('backgroundType')) {
          this.state.backgroundType = typeof settings.backgroundType === 'string' ? settings.backgroundType : defaults.backgroundType;
        }
        if (hasSetting('backgroundDynamic')) {
          this.state.backgroundDynamic = typeof settings.backgroundDynamic === 'boolean' ? settings.backgroundDynamic : defaults.backgroundDynamic;
        }
        if (hasSetting('backgroundFlowSpeed')) {
          this.state.backgroundFlowSpeed = typeof settings.backgroundFlowSpeed === 'number' ? settings.backgroundFlowSpeed : defaults.backgroundFlowSpeed;
        }
        if (hasSetting('backgroundColorMask')) {
          this.state.backgroundColorMask = typeof settings.backgroundColorMask === 'boolean' ? settings.backgroundColorMask : defaults.backgroundColorMask;
        }
        if (hasSetting('backgroundMaskColor')) {
          this.state.backgroundMaskColor = typeof settings.backgroundMaskColor === 'string' ? settings.backgroundMaskColor : defaults.backgroundMaskColor;
        }
        if (hasSetting('backgroundMaskOpacity')) {
          this.state.backgroundMaskOpacity = typeof settings.backgroundMaskOpacity === 'number' ? settings.backgroundMaskOpacity : defaults.backgroundMaskOpacity;
        }
        if (hasSetting('showFPS')) {
          this.state.showFPS = typeof settings.showFPS === 'boolean' ? settings.showFPS : defaults.showFPS;
        }
        if (hasSetting('coverBlurLevel')) {
          this.state.coverBlurLevel = typeof settings.coverBlurLevel === 'number' ? settings.coverBlurLevel : defaults.coverBlurLevel;
        }
        if (hasSetting('invertColors')) {
          this.state.invertColors = typeof settings.invertColors === 'boolean' ? settings.invertColors : defaults.invertColors;
        }
        if (hasSetting('manualDominantColor')) {
          this.state.manualDominantColor = typeof settings.manualDominantColor === 'string' ? settings.manualDominantColor : defaults.manualDominantColor;
        }
        if (hasSetting('manualDominantColorLight')) {
          this.state.manualDominantColorLight = typeof settings.manualDominantColorLight === 'string' ? settings.manualDominantColorLight : defaults.manualDominantColorLight;
        }
        if (hasSetting('manualDominantColorDark')) {
          this.state.manualDominantColorDark = typeof settings.manualDominantColorDark === 'string' ? settings.manualDominantColorDark : defaults.manualDominantColorDark;
        }
        if (hasSetting('roundedCover')) {
          this.state.roundedCover = typeof settings.roundedCover === 'number' ? settings.roundedCover : defaults.roundedCover;
        }
        if (hasSetting('marqueeEnabled')) {
          this.state.marqueeEnabled = typeof settings.marqueeEnabled === 'boolean' ? settings.marqueeEnabled : defaults.marqueeEnabled;
        }
        if (hasSetting('coverRotationSpeed')) {
          this.state.coverRotationSpeed = typeof settings.coverRotationSpeed === 'number' ? settings.coverRotationSpeed : defaults.coverRotationSpeed;
        }
        if (hasSetting('backgroundRenderScale')) {
          this.state.backgroundRenderScale = typeof settings.backgroundRenderScale === 'number' ? settings.backgroundRenderScale : defaults.backgroundRenderScale;
        }
        if (hasSetting('lyricAlignPosition')) {
          this.state.lyricAlignPosition = typeof settings.lyricAlignPosition === 'number' ? settings.lyricAlignPosition : defaults.lyricAlignPosition;
        }
        if (hasSetting('lyricFontSize')) {
          this.state.lyricFontSize = typeof settings.lyricFontSize === 'number' ? settings.lyricFontSize : defaults.lyricFontSize;
        }
        if (hasSetting('lyricDelay')) {
          this.state.lyricDelay = typeof settings.lyricDelay === 'number' ? settings.lyricDelay : defaults.lyricDelay;
        }
        if (hasSetting('hidePassedLyrics')) {
          this.state.hidePassedLyrics = typeof settings.hidePassedLyrics === 'boolean' ? settings.hidePassedLyrics : defaults.hidePassedLyrics;
        }
        if (hasSetting('enableLyricBlur')) {
          this.state.enableLyricBlur = typeof settings.enableLyricBlur === 'boolean' ? settings.enableLyricBlur : defaults.enableLyricBlur;
        }
        if (hasSetting('enableLyricScale')) {
          this.state.enableLyricScale = typeof settings.enableLyricScale === 'boolean' ? settings.enableLyricScale : defaults.enableLyricScale;
        }
        if (hasSetting('enableLyricSpring')) {
          this.state.enableLyricSpring = typeof settings.enableLyricSpring === 'boolean' ? settings.enableLyricSpring : defaults.enableLyricSpring;
        }
        if (hasSetting('wordFadeWidth')) {
          this.state.wordFadeWidth = typeof settings.wordFadeWidth === 'number' ? settings.wordFadeWidth : defaults.wordFadeWidth;
        }
        if (hasSetting('lyricAlignAnchor')) {
          this.state.lyricAlignAnchor = typeof settings.lyricAlignAnchor === 'string' ? settings.lyricAlignAnchor : defaults.lyricAlignAnchor;
        }
        if (hasSetting('showTranslatedLyric')) {
          this.state.showTranslatedLyric = typeof settings.showTranslatedLyric === 'boolean' ? settings.showTranslatedLyric : defaults.showTranslatedLyric;
        }
        if (hasSetting('showRomanLyric')) {
          this.state.showRomanLyric = typeof settings.showRomanLyric === 'boolean' ? settings.showRomanLyric : defaults.showRomanLyric;
        }
        if (hasSetting('swapLyricPositions')) {
          this.state.swapLyricPositions = typeof settings.swapLyricPositions === 'boolean' ? settings.swapLyricPositions : defaults.swapLyricPositions;
        }
        if (hasSetting('showbgLyric')) {
          this.state.showbgLyric = typeof settings.showbgLyric === 'boolean' ? settings.showbgLyric : defaults.showbgLyric;
        }
        if (hasSetting('swapDuetsPositions')) {
          this.state.swapDuetsPositions = typeof settings.swapDuetsPositions === 'boolean' ? settings.swapDuetsPositions : defaults.swapDuetsPositions;
        }
        if (hasSetting('advanceLyricTiming')) {
          this.state.advanceLyricTiming = typeof settings.advanceLyricTiming === 'boolean' ? settings.advanceLyricTiming : defaults.advanceLyricTiming;
        }
        if (hasSetting('singleLyrics')) {
          this.state.singleLyrics = typeof settings.singleLyrics === 'boolean' ? settings.singleLyrics : defaults.singleLyrics;
        }
        if (hasSetting('backgroundLowFreqVolume')) {
          this.state.backgroundLowFreqVolume = typeof settings.backgroundLowFreqVolume === 'number' ? settings.backgroundLowFreqVolume : defaults.backgroundLowFreqVolume;
        }
        if (hasSetting('backgroundBeatEnabled')) {
          this.state.backgroundBeatEnabled = typeof settings.backgroundBeatEnabled === 'boolean' ? settings.backgroundBeatEnabled : defaults.backgroundBeatEnabled;
        }
        if (hasSetting('coverStyle')) {
          this.state.coverStyle = typeof settings.coverStyle === 'string' ? settings.coverStyle : defaults.coverStyle;
        }
        if (hasSetting('posYSpringMass')) {
          this.state.posYSpringMass = typeof settings.posYSpringMass === 'number' ? settings.posYSpringMass : defaults.posYSpringMass;
        }
        if (hasSetting('backgroundFPS')) {
          this.state.backgroundFPS = typeof settings.backgroundFPS === 'number' ? settings.backgroundFPS : defaults.backgroundFPS;
        }
        if (hasSetting('posYSpringDamping')) {
          this.state.posYSpringDamping = typeof settings.posYSpringDamping === 'number' ? settings.posYSpringDamping : defaults.posYSpringDamping;
        }
        if (hasSetting('posYSpringStiffness')) {
          this.state.posYSpringStiffness = typeof settings.posYSpringStiffness === 'number' ? settings.posYSpringStiffness : defaults.posYSpringStiffness;
        }
        if (hasSetting('posYSpringSoft')) {
          this.state.posYSpringSoft = typeof settings.posYSpringSoft === 'boolean' ? settings.posYSpringSoft : defaults.posYSpringSoft;
        }
        if (hasSetting('scaleSpringMass')) {
          this.state.scaleSpringMass = typeof settings.scaleSpringMass === 'number' ? settings.scaleSpringMass : defaults.scaleSpringMass;
        }
        if (hasSetting('scaleSpringDamping')) {
          this.state.scaleSpringDamping = typeof settings.scaleSpringDamping === 'number' ? settings.scaleSpringDamping : defaults.scaleSpringDamping;
        }
        if (hasSetting('scaleSpringStiffness')) {
          this.state.scaleSpringStiffness = typeof settings.scaleSpringStiffness === 'number' ? settings.scaleSpringStiffness : defaults.scaleSpringStiffness;
        }
        if (hasSetting('scaleSpringSoft')) {
          this.state.scaleSpringSoft = typeof settings.scaleSpringSoft === 'boolean' ? settings.scaleSpringSoft : defaults.scaleSpringSoft;
        }
        if (hasSetting('playbackRate')) {
          this.state.playbackRate = typeof settings.playbackRate === 'number' ? settings.playbackRate : defaults.playbackRate;
        }
        if (hasSetting('volume')) {
          this.state.volume = typeof settings.volume === 'number' ? settings.volume : defaults.volume;
        }
        if (hasSetting('loopPlay')) {
          this.state.loopPlay = typeof settings.loopPlay === 'boolean' ? settings.loopPlay : defaults.loopPlay;
        }
        if (hasSetting('showRemainingTime')) {
          this.state.showRemainingTime = typeof settings.showRemainingTime === 'boolean' ? settings.showRemainingTime : defaults.showRemainingTime;
        }
        if (hasSetting('autoPlay')) {
          this.state.autoPlay = typeof settings.autoPlay === 'boolean' ? settings.autoPlay : defaults.autoPlay;
        }
        if (hasSetting('musicUrl') && !this.urlOverrides.has('musicUrl')) {
          this.state.musicUrl = typeof settings.musicUrl === 'string' ? settings.musicUrl : defaults.musicUrl;
        }
        if (hasSetting('lyricUrl') && !this.urlOverrides.has('lyricUrl')) {
          this.state.lyricUrl = typeof settings.lyricUrl === 'string' ? settings.lyricUrl : defaults.lyricUrl;
        }
        if (hasSetting('coverUrl') && !this.urlOverrides.has('coverUrl')) {
          this.state.coverUrl = typeof settings.coverUrl === 'string' ? settings.coverUrl : defaults.coverUrl;
        }
        if (hasSetting('songTitle') && !this.urlOverrides.has('songTitle')) {
          this.state.songTitle = typeof settings.songTitle === 'string' ? settings.songTitle : defaults.songTitle;
        }
        if (hasSetting('songArtist') && !this.urlOverrides.has('songArtist')) {
          this.state.songArtist = typeof settings.songArtist === 'string' ? settings.songArtist : defaults.songArtist;
        }
        if (hasSetting('isRangeMode')) {
          this.state.isRangeMode = typeof settings.isRangeMode === 'boolean' ? settings.isRangeMode : defaults.isRangeMode;
        }
        if (hasSetting('rangeStartTime')) {
          this.state.rangeStartTime = typeof settings.rangeStartTime === 'number' ? settings.rangeStartTime : defaults.rangeStartTime;
        }
        if (hasSetting('rangeEndTime')) {
          this.state.rangeEndTime = typeof settings.rangeEndTime === 'number' ? settings.rangeEndTime : defaults.rangeEndTime;
        }

        this.state.originalInvertColors = this.state.invertColors;
        this.audio.playbackRate = this.state.playbackRate;
        this.audio.volume = this.state.volume / 100;

        if (hasSetting('musicUrlInput') && this.musicUrl && typeof settings.musicUrlInput === 'string' && !this.urlOverrides.has('musicUrlInput')) {
          this.musicUrl.value = settings.musicUrlInput;
        }
        if (hasSetting('lyricUrlInput') && this.lyricUrl && typeof settings.lyricUrlInput === 'string' && !this.urlOverrides.has('lyricUrlInput')) {
          this.lyricUrl.value = settings.lyricUrlInput;
        }
        if (hasSetting('coverUrlInput') && this.coverUrl && typeof settings.coverUrlInput === 'string' && !this.urlOverrides.has('coverUrlInput')) {
          this.coverUrl.value = settings.coverUrlInput;
        }
        if (hasSetting('songTitleInput') && this.songTitleInput && typeof settings.songTitleInput === 'string' && !this.urlOverrides.has('songTitleInput')) {
          this.songTitleInput.value = settings.songTitleInput;
        }
        if (hasSetting('songArtistInput') && this.songArtistInput && typeof settings.songArtistInput === 'string' && !this.urlOverrides.has('songArtistInput')) {
          this.songArtistInput.value = settings.songArtistInput;
        }

        this.updateSongInfo();
        if (this.songTitle) {
          this.checkAndUpdateMarquee(this.songTitle);
        }
        if (this.songArtist) {
          this.checkAndUpdateMarquee(this.songArtist);
        }

        if (hasSetting('controlPointCode') && this.controlPointCodeInput && !this.urlOverrides.has('controlPointCode') && typeof settings.controlPointCode === 'string') {
          this.controlPointCodeInput.value = settings.controlPointCode;
        }

        if (this.lyricDelayInput) {
          this.lyricDelayInput.value = this.state.lyricDelay.toString();
        }
        this.applyLyricDelay(this.state.lyricDelay, { skipSave: true });

        this.updateBackgroundUI();
        this.updateBackground();
        this.updateFPSDisplay();
        this.updateRoundedCover();
        this.updateCoverStyle();
        this.updateLyricsDisplay();
        this.updateMarqueeSettings();
        this.lyricPlayer.setAlignPosition(this.state.lyricAlignPosition);
        this.updateLyricFontSize();
        this.invertColors(this.state.invertColors);
        this.lyricPlayer.setEnableBlur(this.state.enableLyricBlur);
        this.lyricPlayer.setEnableScale(this.state.enableLyricScale);
        this.lyricPlayer.setEnableSpring(this.state.enableLyricSpring);
        this.lyricPlayer.setWordFadeWidth(this.state.wordFadeWidth);
        this.lyricPlayer.setLinePosYSpringParams({ mass: this.state.posYSpringMass, damping: this.state.posYSpringDamping, stiffness: this.state.posYSpringStiffness, soft: this.state.posYSpringSoft });
        this.lyricPlayer.setLineScaleSpringParams({ mass: this.state.scaleSpringMass, damping: this.state.scaleSpringDamping, stiffness: this.state.scaleSpringStiffness, soft: this.state.scaleSpringSoft });
        const dpr = window.devicePixelRatio || 1;
        this.background.setRenderScale(this.state.backgroundRenderScale * dpr);
        this.updateTimeDisplay();

        if (hasSetting('controlPointCode') && !this.urlOverrides.has('controlPointCode') && typeof settings.controlPointCode === 'string') {
          this.applyControlPointCode();
        }
      }

      if (this.lyricAlignPositionValue) {
        this.lyricAlignPositionValue.textContent = this.state.lyricAlignPosition.toFixed(1);
      }
      if (this.lyricFontSizeValue) {
        this.lyricFontSizeValue.textContent = `${this.state.lyricFontSize}%`;
      }
      if (this.springPosYMassValue) {
        this.springPosYMassValue.textContent = this.state.posYSpringMass.toFixed(1);
      }
      if (this.springPosYDampingValue) {
        this.springPosYDampingValue.textContent = this.state.posYSpringDamping.toString();
      }
      if (this.springPosYStiffnessValue) {
        this.springPosYStiffnessValue.textContent = this.state.posYSpringStiffness.toString();
      }
      if (this.springScaleMassValue) {
        this.springScaleMassValue.textContent = this.state.scaleSpringMass.toFixed(1);
      }
      if (this.springScaleDampingValue) {
        this.springScaleDampingValue.textContent = this.state.scaleSpringDamping.toString();
      }
      if (this.springScaleStiffnessValue) {
        this.springScaleStiffnessValue.textContent = this.state.scaleSpringStiffness.toString();
      }
      if (this.hidePassedLyricsCheckbox) {
        this.hidePassedLyricsCheckbox.checked = this.state.hidePassedLyrics;
      }
      if (this.enableLyricBlur) {
        this.enableLyricBlur.checked = this.state.enableLyricBlur;
      }
      if (this.enableLyricScale) {
        this.enableLyricScale.checked = this.state.enableLyricScale;
      }
      if (this.enableLyricSpring) {
        this.enableLyricSpring.checked = this.state.enableLyricSpring;
        const springDesc = document.getElementById('spring-desc');
        if (springDesc) {
          springDesc.style.display = this.state.enableLyricSpring ? 'block' : 'none';
        }
      }
      if (this.wordFadeWidthInput) {
        this.wordFadeWidthInput.value = this.state.wordFadeWidth.toString();
      }
      if (this.wordFadeWidthValue) {
        this.wordFadeWidthValue.textContent = this.state.wordFadeWidth.toFixed(2);
      }
      if (this.showbgLyricCheckbox) {
        this.showbgLyricCheckbox.checked = this.state.showbgLyric;
      }
      if (this.swapDuetsPositionsCheckbox) {
        this.swapDuetsPositionsCheckbox.checked = this.state.swapDuetsPositions;
      }
      this.urlOverrides.clear();
    } catch (error) {
      console.log('加载背景设置失败:', error);
    }
  }

  private updateBackgroundUI() {
    if (this.bgFlowSpeed) this.bgFlowSpeed.value = this.state.backgroundFlowSpeed.toString();
    if (this.bgFlowSpeedValue) this.bgFlowSpeedValue.textContent = this.state.backgroundFlowSpeed.toFixed(1);
    if (this.bgColorMask) this.bgColorMask.checked = this.state.backgroundColorMask;
    if (this.bgMaskColor) this.bgMaskColor.value = this.state.backgroundMaskColor;
    if (this.bgMaskOpacity) this.bgMaskOpacity.value = this.state.backgroundMaskOpacity.toString();
    if (this.bgMaskOpacityValue) this.bgMaskOpacityValue.textContent = `${this.state.backgroundMaskOpacity}%`;
    if (this.showFPSCheckbox) this.showFPSCheckbox.checked = this.state.showFPS;
    if (this.backgroundStyleSelect) this.backgroundStyleSelect.value = this.state.backgroundType;
    if (this.coverBlurLevel) this.coverBlurLevel.value = this.state.coverBlurLevel.toString();
    if (this.coverBlurLevelValue) this.coverBlurLevelValue.textContent = `${this.state.coverBlurLevel}%`;
    if (this.invertColorsCheckbox) this.invertColorsCheckbox.checked = this.state.invertColors;
    if (this.dominantColorInput && this.isColorsInitialized) {
      this.dominantColorInput.value = this.state.manualDominantColor || this.originalDominant;
    }
    if (this.dominantColorLightInput && this.isColorsInitialized) {
      this.dominantColorLightInput.value = this.state.manualDominantColorLight || this.originalLight;
    }
    if (this.dominantColorDarkInput && this.isColorsInitialized) {
      this.dominantColorDarkInput.value = this.state.manualDominantColorDark || this.originalDark;
    }
    if (this.roundedCoverSlider) this.roundedCoverSlider.value = this.state.roundedCover.toString();
    if (this.roundedCoverValue) this.roundedCoverValue.textContent = `${this.state.roundedCover}%`;
    if (this.coverRotationSlider) this.coverRotationSlider.value = this.state.coverRotationSpeed.toString();
    if (this.coverRotationValue) this.coverRotationValue.textContent = `${this.state.coverRotationSpeed}rpm`;
    if (this.enableMarqueeCheckbox) this.enableMarqueeCheckbox.checked = this.state.marqueeEnabled;
    if (this.bgRenderScale) {
      this.bgRenderScale.value = this.state.backgroundRenderScale.toString();
    }
    if (this.bgRenderScaleValue) {
      this.bgRenderScaleValue.textContent = this.state.backgroundRenderScale.toFixed(2);
    }
    if (this.bgFPS) {
      this.bgFPS.value = this.state.backgroundFPS.toString();
    }
    if (this.bgFPSValue) {
      this.bgFPSValue.textContent = `${this.state.backgroundFPS}fps`;
    }
    if (this.lyricAlignPosition) {
      this.lyricAlignPosition.value = this.state.lyricAlignPosition.toString();
    }
    if (this.lyricAlignPositionValue) {
      this.lyricAlignPositionValue.textContent = this.state.lyricAlignPosition.toFixed(1);
    }
    if (this.lyricFontSize) {
      this.lyricFontSize.value = this.state.lyricFontSize.toString();
    }
    if (this.lyricFontSizeValue) {
      this.lyricFontSizeValue.textContent = `${this.state.lyricFontSize}%`;
    }
    if (this.hidePassedLyricsCheckbox) {
      this.hidePassedLyricsCheckbox.checked = this.state.hidePassedLyrics;
    }
    if (this.fluidDesc) this.fluidDesc.style.display = this.state.backgroundType === 'fluid' ? 'block' : 'none';
    if (this.coverDesc) this.coverDesc.style.display = this.state.backgroundType === 'cover' ? 'block' : 'none';
    if (this.solidDesc) this.solidDesc.style.display = this.state.backgroundType === 'solid' ? 'block' : 'none';

    if (this.solidOptions) {
      const showSolidOptions = this.state.backgroundType === 'cover' && this.state.backgroundColorMask && this.state.backgroundMaskOpacity === 0;
      this.setOptionsVisibility(this.solidOptions, showSolidOptions, ['neumorphismA', 'neumorphismB']);
    }

    if (this.loopPlayCheckbox) {
      this.loopPlayCheckbox.checked = this.state.loopPlay;
    }
    if (this.playbackRateControl) {
      this.playbackRateControl.value = this.state.playbackRate.toString();
    }
    if (this.playbackRateValue) {
      this.playbackRateValue.textContent = `${this.state.playbackRate.toFixed(2)}x`;
    }
    this.updatePlaybackRateIcon(this.state.playbackRate);
    if (this.volumeControl) {
      this.volumeControl.value = this.state.volume.toString();
    }
    if (this.volumeValue) {
      this.volumeValue.textContent = `${Math.round(this.state.volume)}%`;
    }
    this.audio.playbackRate = this.state.playbackRate;
    this.audio.volume = this.state.volume / 100;
    this.updateVolumeIcon(Math.round(this.state.volume));

    if (this.showbgLyricCheckbox) {
      this.showbgLyricCheckbox.checked = this.state.showbgLyric;
    }
    if (this.swapDuetsPositionsCheckbox) {
      this.swapDuetsPositionsCheckbox.checked = this.state.swapDuetsPositions;
    }
    if (this.advanceLyricTimingCheckbox) {
      this.advanceLyricTimingCheckbox.checked = this.state.advanceLyricTiming;
    }
    if (this.backgroundBeatCheckbox) {
      this.backgroundBeatCheckbox.checked = this.state.backgroundBeatEnabled;
    }

    if (this.bgLowFreqVolume) {
      this.bgLowFreqVolume.value = this.state.backgroundLowFreqVolume.toString();
    }
    if (this.bgLowFreqVolumeValue) {
      const mapToFrequency = (value: number): string => {
        const frequency = 80 + (value * 40); // 0->80, 1->120
        return `${frequency.toFixed(0)}hz`;
      };
      this.bgLowFreqVolumeValue.textContent = mapToFrequency(this.state.backgroundLowFreqVolume);
    }

    const springPosYSoftDiv = document.getElementById('springPosYSoft')?.parentElement;
    if (springPosYSoftDiv) {
      springPosYSoftDiv.style.display = this.state.posYSpringDamping < 1 ? 'flex' : 'none';
    }
    const springScaleSoftDiv = document.getElementById('springScaleSoft')?.parentElement;
    if (springScaleSoftDiv) {
      springScaleSoftDiv.style.display = this.state.scaleSpringDamping < 1 ? 'flex' : 'none';
    }
    this.syncBackgroundBeatState();
  }

  private initCoverBlurBackground() {
    this.coverBlurBackground.style.position = "absolute";
    this.coverBlurBackground.style.top = "0";
    this.coverBlurBackground.style.left = "0";
    this.coverBlurBackground.style.width = "100%";
    this.coverBlurBackground.style.height = "100%";
    this.coverBlurBackground.style.backgroundSize = "cover";
    this.coverBlurBackground.style.backgroundPosition = "center";
    this.coverBlurBackground.style.backgroundRepeat = "no-repeat";
    this.coverBlurBackground.style.filter = "blur(20px)";
    this.coverBlurBackground.style.transform = `scale(${this.coverBlurBaseScale})`;
    this.coverBlurBackground.style.transformOrigin = "center";
    this.coverBlurBackground.style.willChange = "transform";
    this.coverBlurBackground.style.zIndex = "0";
    this.coverBlurBackground.style.display = "none";
  }

  private ensureBeatAudioAnalyser() {
    if (this.beatState.analyser || !this.audio) return;
    const AudioContextRef = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextRef) return;
    const audioContext = new AudioContextRef();
    const source = audioContext.createMediaElementSource(this.audio);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.85;
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    this.beatState.audioContext = audioContext;
    this.beatState.analyser = analyser;
    this.beatState.freqData = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
  }

  private getBeatRenderer() {
    const renderer = (this.background as any)?.renderer
      || (this.background as any)?._renderer
      || (this.background as any)?.['renderer'];
    return renderer || null;
  }

  private extractPaletteFromImageData(imageData: ImageData | null, targetCount = AMLL_PALETTE_TARGET) {
    if (!imageData || !imageData.width || !imageData.height) return [];
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const step = Math.max(1, Math.floor(AMLL_PALETTE_PIXELATE));
    const samples: Array<{ r: number; g: number; b: number }> = [];
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const idx = (y * width + x) * 4;
        const alpha = data[idx + 3] ?? 255;
        if (alpha < 16) continue;
        samples.push({
          r: (data[idx] || 0) / 255,
          g: (data[idx + 1] || 0) / 255,
          b: (data[idx + 2] || 0) / 255
        });
      }
    }
    if (!samples.length) return [];
    const count = Math.max(1, targetCount);
    const centers = new Array(count).fill(null).map((_, i) => {
      const pos = count === 1 ? 0 : Math.floor((i / (count - 1)) * (samples.length - 1));
      const pick = samples[pos] || samples[0];
      return { r: pick.r, g: pick.g, b: pick.b };
    });
    for (let iter = 0; iter < 8; iter += 1) {
      const sums = new Array(count).fill(null).map(() => ({ r: 0, g: 0, b: 0, n: 0 }));
      for (const sample of samples) {
        let best = 0;
        let bestDist = Number.POSITIVE_INFINITY;
        for (let i = 0; i < count; i += 1) {
          const c = centers[i];
          const dr = sample.r - c.r;
          const dg = sample.g - c.g;
          const db = sample.b - c.b;
          const dist = dr * dr + dg * dg + db * db;
          if (dist < bestDist) {
            bestDist = dist;
            best = i;
          }
        }
        const sum = sums[best];
        sum.r += sample.r;
        sum.g += sample.g;
        sum.b += sample.b;
        sum.n += 1;
      }
      for (let i = 0; i < count; i += 1) {
        const sum = sums[i];
        if (sum.n > 0) {
          centers[i] = { r: sum.r / sum.n, g: sum.g / sum.n, b: sum.b / sum.n };
        } else {
          const fallback = samples[(i * 97) % samples.length];
          centers[i] = { r: fallback.r, g: fallback.g, b: fallback.b };
        }
      }
    }
    const palette = centers.map((rgb) => {
      const hsl = hexToHsl(
        `#${Math.round(rgb.r * 255).toString(16).padStart(2, '0')}${Math.round(rgb.g * 255).toString(16).padStart(2, '0')}${Math.round(rgb.b * 255).toString(16).padStart(2, '0')}`
      );
      if (!hsl) return null;
      const origS = clamp(hsl.s, 0, 100);
      return { h: hsl.h, l: hsl.l, baseS: clamp(origS - 50, 0, 100), origS };
    }).filter(Boolean) as Array<{ h: number; l: number; baseS: number; origS?: number }>;
    palette.sort((a, b) => (a.h - b.h) || (a.l - b.l));
    return palette;
  }

  private ensureBeatBasePalette() {
    if (this.beatState.basePaletteHsl.length) return;
    const renderer = this.beatState.renderer;
    if (!renderer) return;
    const imageData = renderer.currentImageData || renderer._currentImageData || null;
    const palette = this.extractPaletteFromImageData(imageData, AMLL_PALETTE_TARGET);
    if (palette.length) {
      this.beatState.basePaletteHsl = palette;
      return;
    }
    if (this.coverPaletteHsl.length) {
      this.beatState.basePaletteHsl = this.coverPaletteHsl.map((entry) => ({ ...entry }));
    }
  }

  private getActiveMesh(renderer: any) {
    if (!renderer) return null;
    const states = renderer.meshStates || renderer._meshStates;
    if (!Array.isArray(states) || states.length === 0) return null;
    return states[states.length - 1].mesh || null;
  }

  private getMeshSize(mesh: any) {
    const controlPoints = mesh && (mesh._controlPoints || mesh.controlPoints);
    if (!controlPoints) return null;
    const width = controlPoints.width ?? controlPoints._width;
    const height = controlPoints.height ?? controlPoints._height;
    if (!width || !height) return null;
    return { width, height };
  }

  private applyColorsToMesh(mesh: any, colors: Array<{ r: number; g: number; b: number }>) {
    const size = this.getMeshSize(mesh);
    if (!size || !colors.length) return;
    const width = size.width;
    const height = size.height;
    if (!this.beatState.lastColors || this.beatState.lastColors.length !== colors.length) {
      this.beatState.lastColors = colors.map((c) => ({ r: c.r, g: c.g, b: c.b }));
    }
    const blended = colors.map((target, index) => {
      const prev = this.beatState.lastColors?.[index] || target;
      const r = prev.r + (target.r - prev.r) * this.beatState.smoothing;
      const g = prev.g + (target.g - prev.g) * this.beatState.smoothing;
      const b = prev.b + (target.b - prev.b) * this.beatState.smoothing;
      return { r, g, b };
    });
    this.beatState.lastColors = blended;
    const maxIndex = Math.max(1, colors.length - 1);
    const indexForPoint = (x: number, y: number) => {
      const scale = Math.max(1, AMLL_NOISE_SCALE);
      const nx = (x / Math.max(1, width - 1)) * scale;
      const ny = (y / Math.max(1, height - 1)) * scale;
      const hash = Math.sin(nx * 127.1 + ny * 311.7) * 43758.5453;
      const frac = hash - Math.floor(hash);
      return Math.floor(frac * (maxIndex + 1));
    };
    for (let x = 0; x < width; x += 1) {
      for (let y = 0; y < height; y += 1) {
        const colorIndex = indexForPoint(x, y);
        const color = blended[colorIndex] || blended[blended.length - 1];
        const point = mesh.getControlPoint ? mesh.getControlPoint(x, y) : null;
        if (!point || !point.color) continue;
        point.color[0] = color.r;
        point.color[1] = color.g;
        point.color[2] = color.b;
      }
    }
    if (typeof mesh.updateMesh === 'function') {
      mesh.updateMesh();
    }
  }

  private applyBasePaletteToMesh(mesh: any) {
    const size = this.getMeshSize(mesh);
    if (!size || !this.beatState.basePaletteHsl.length) return;
    const width = size.width;
    const height = size.height;
    const maxIndex = Math.max(1, this.beatState.basePaletteHsl.length - 1);
    const indexForPoint = (x: number, y: number) => {
      const scale = Math.max(1, AMLL_NOISE_SCALE);
      const nx = (x / Math.max(1, width - 1)) * scale;
      const ny = (y / Math.max(1, height - 1)) * scale;
      const hash = Math.sin(nx * 127.1 + ny * 311.7) * 43758.5453;
      const frac = hash - Math.floor(hash);
      return Math.floor(frac * (maxIndex + 1));
    };
    for (let x = 0; x < width; x += 1) {
      for (let y = 0; y < height; y += 1) {
        const colorIndex = indexForPoint(x, y);
        const base = this.beatState.basePaletteHsl[colorIndex]
          || this.beatState.basePaletteHsl[this.beatState.basePaletteHsl.length - 1];
        const rgb = hslToRgb(base.h, base.origS ?? (base.baseS + 50), base.l);
        const point = mesh.getControlPoint ? mesh.getControlPoint(x, y) : null;
        if (!point || !point.color) continue;
        point.color[0] = rgb.r;
        point.color[1] = rgb.g;
        point.color[2] = rgb.b;
      }
    }
    if (typeof mesh.updateMesh === 'function') {
      mesh.updateMesh();
    }
  }

  private captureMeshColors(mesh: any) {
    const size = this.getMeshSize(mesh);
    if (!size) return;
    const width = size.width;
    const height = size.height;
    const colors = new Array(width * height);
    for (let x = 0; x < width; x += 1) {
      for (let y = 0; y < height; y += 1) {
        const point = mesh.getControlPoint ? mesh.getControlPoint(x, y) : null;
        if (!point || !point.color) {
          colors[y * width + x] = null;
          continue;
        }
        colors[y * width + x] = [point.color[0], point.color[1], point.color[2]];
      }
    }
    this.beatState.originalMeshColors = colors;
    this.beatState.originalMeshSize = { width, height };
  }

  private restoreMeshColors(mesh: any) {
    const size = this.getMeshSize(mesh);
    const stored = this.beatState.originalMeshColors;
    const storedSize = this.beatState.originalMeshSize;
    if (!size || !stored || !storedSize) return false;
    if (size.width !== storedSize.width || size.height !== storedSize.height) return false;
    const width = size.width;
    const height = size.height;
    for (let x = 0; x < width; x += 1) {
      for (let y = 0; y < height; y += 1) {
        const point = mesh.getControlPoint ? mesh.getControlPoint(x, y) : null;
        const color = stored[y * width + x];
        if (!point || !point.color || !color) continue;
        point.color[0] = color[0];
        point.color[1] = color[1];
        point.color[2] = color[2];
      }
    }
    if (typeof mesh.updateMesh === 'function') {
      mesh.updateMesh();
    }
    return true;
  }

  private parseBeatCurve(buffer: ArrayBuffer): BeatCurve | null {
    if (!buffer || buffer.byteLength < 12) return null;
    const view = new DataView(buffer);
    const magic = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3)
    );
    if (magic !== AMLL_BEAT_CURVE_MAGIC && magic !== AMLL_BEAT_CURVE_MAGIC_LEVELS) return null;
    const version = view.getUint8(4);
    if (version !== 1) return null;
    const bandCount = view.getUint8(5);
    const frameMs = view.getUint16(6, true);
    const frameCount = view.getUint32(8, true);
    if (!bandCount || !frameMs || !frameCount) return null;
    const dataOffset = 12;
    const bytesPerFrame = magic === AMLL_BEAT_CURVE_MAGIC_LEVELS ? bandCount + 1 : bandCount;
    const expected = dataOffset + frameCount * bytesPerFrame;
    if (buffer.byteLength < expected) return null;
    const data = new Uint8Array(buffer, dataOffset, frameCount * bytesPerFrame);
    const mode: BeatCurveMode = magic === AMLL_BEAT_CURVE_MAGIC_LEVELS ? 'levels' : 'gain';
    const curve: BeatCurve = mode === 'levels'
      ? { bandCount, frameMs, frameCount, data, mode }
      : { bandCount, frameMs, frameCount, data, mode };
    return curve;
  }

  private clearBeatCurvePolling() {
    if (this.beatCurvePollTimer) {
      clearTimeout(this.beatCurvePollTimer);
      this.beatCurvePollTimer = null;
    }
    this.beatCurveRequestInFlight = false;
  }

  private getBeatCurveJsonPath(): string | null {
    const candidates = [this.state.lyricUrl, this.state.musicUrl];
    for (const candidate of candidates) {
      if (!candidate) continue;
      const trimmed = candidate.trim();
      if (!trimmed) continue;
      let path = trimmed;
      if (/^https?:\/\//i.test(trimmed)) {
        try {
          path = new URL(trimmed).pathname || trimmed;
        } catch {
          path = trimmed;
        }
      }
      path = path.split("?")[0].split("#")[0].replace(/\\/g, "/");
      if (!path) continue;
      let relative = "";
      if (path.startsWith("/songs/")) {
        relative = path.slice(1);
      } else if (path.startsWith("songs/")) {
        relative = path;
      } else {
        continue;
      }
      const lastSlash = relative.lastIndexOf("/");
      const lastDot = relative.lastIndexOf(".");
      if (lastDot <= lastSlash) continue;
      return `${relative.slice(0, lastDot)}.json`;
    }
    return null;
  }

  private async loadBeatCurve(beatPath: string) {
    if (!beatPath) {
      this.beatState.beatCurve = null;
      return;
    }
    try {
      const url = normalizeBackendUrl(beatPath);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Beat curve request failed: ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      const curve = this.parseBeatCurve(buffer);
      if (!curve) {
        throw new Error('Invalid beat curve');
      }
      this.beatState.beatCurve = curve;
    } catch (error) {
      console.warn('[AMLL] Beat curve load failed:', error);
      this.beatState.beatCurve = null;
    }
  }

  private async requestBeatCurveFromServer() {
    if (!this.state.backgroundBeatEnabled) return;
    if (this.beatCurveRequestInFlight) return;
    this.beatCurveRequestInFlight = true;
    try {
      const jsonPath = this.getBeatCurveJsonPath();
      const response = await fetch('/amll/generate_beat_curve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonPath ? { json_path: jsonPath } : {})
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok && response.status !== 202) {
        console.warn('[AMLL] Beat curve request failed', response.status);
        return;
      }
      if (payload && payload.status === 'success' && payload.curve) {
        this.beatCurvePath = payload.curve;
        await this.loadBeatCurve(payload.curve);
        return;
      }
      if (payload && payload.status === 'pending') {
        this.beatCurvePollTimer = window.setTimeout(() => this.requestBeatCurveFromServer(), 2000);
      }
    } catch (error) {
      console.warn('[AMLL] Beat curve request failed', error);
    } finally {
      this.beatCurveRequestInFlight = false;
    }
  }

  private ensureBeatCurveAuto() {
    if (!this.state.backgroundBeatEnabled) return;
    if (this.beatState.beatCurve) return;
    if (this.beatCurvePath) {
      this.loadBeatCurve(this.beatCurvePath);
      return;
    }
    this.requestBeatCurveFromServer();
  }

  private sampleBeatCurve(targetBands: number): BeatCurveSample | null {
    const curve = this.beatState.beatCurve;
    if (!curve || !this.audio) return null;
    const timeMs = Number.isFinite(this.audio.currentTime) ? this.audio.currentTime * 1000 : 0;
    const frameFloat = Math.max(0, timeMs / curve.frameMs);
    const maxFrame = Math.max(0, curve.frameCount - 1);
    const frameIndex = Math.min(maxFrame, Math.floor(frameFloat));
    const nextIndex = Math.min(maxFrame, frameIndex + 1);
    const frameFrac = frameFloat - frameIndex;
    const bytesPerFrame = curve.mode === 'levels' ? curve.bandCount + 1 : curve.bandCount;
    const baseOffset = frameIndex * bytesPerFrame;
    const nextOffset = nextIndex * bytesPerFrame;
    if (curve.mode === 'levels') {
      const levels = new Array(targetBands).fill(0);
      if (curve.bandCount === 1) {
        const v0 = curve.data[baseOffset] || 0;
        const v1 = curve.data[nextOffset] || v0;
        const value = lerp(v0, v1, frameFrac) / 255;
        levels.fill(value);
      } else {
        for (let i = 0; i < targetBands; i += 1) {
          const srcPos = targetBands === 1
            ? 0
            : (i / Math.max(1, targetBands - 1)) * (curve.bandCount - 1);
          const srcIndex = Math.floor(srcPos);
          const srcNext = Math.min(curve.bandCount - 1, srcIndex + 1);
          const srcFrac = srcPos - srcIndex;
          const a0 = lerp(
            curve.data[baseOffset + srcIndex] || 0,
            curve.data[baseOffset + srcNext] || 0,
            srcFrac
          );
          const a1 = lerp(
            curve.data[nextOffset + srcIndex] || 0,
            curve.data[nextOffset + srcNext] || 0,
            srcFrac
          );
          levels[i] = lerp(a0, a1, frameFrac) / 255;
        }
      }
      const g0 = curve.data[baseOffset + curve.bandCount] || 0;
      const g1 = curve.data[nextOffset + curve.bandCount] || g0;
      const globalEnergy = lerp(g0, g1, frameFrac) / 255;
      return { mode: 'levels', levels, globalEnergy };
    }
    const gains = new Array(targetBands).fill(AMLL_GAIN_MIN);
    if (curve.bandCount === 1) {
      const v0 = curve.data[baseOffset] || 0;
      const v1 = curve.data[nextOffset] || v0;
      const value = lerp(v0, v1, frameFrac) / 255;
      const gain = AMLL_GAIN_MIN + value * (AMLL_GAIN_MAX - AMLL_GAIN_MIN);
      gains.fill(gain);
    } else {
      for (let i = 0; i < targetBands; i += 1) {
        const srcPos = targetBands === 1
          ? 0
          : (i / Math.max(1, targetBands - 1)) * (curve.bandCount - 1);
        const srcIndex = Math.floor(srcPos);
        const srcNext = Math.min(curve.bandCount - 1, srcIndex + 1);
        const srcFrac = srcPos - srcIndex;
        const a0 = lerp(
          curve.data[baseOffset + srcIndex] || 0,
          curve.data[baseOffset + srcNext] || 0,
          srcFrac
        );
        const a1 = lerp(
          curve.data[nextOffset + srcIndex] || 0,
          curve.data[nextOffset + srcNext] || 0,
          srcFrac
        );
        const value = lerp(a0, a1, frameFrac) / 255;
        gains[i] = AMLL_GAIN_MIN + value * (AMLL_GAIN_MAX - AMLL_GAIN_MIN);
      }
    }
    return { mode: 'gain', gains };
  }

  private getBandLevels() {
    const bandCount = this.beatState.basePaletteHsl.length || 1;
    const levels = new Array(bandCount).fill(0);
    const curveSample = this.sampleBeatCurve(bandCount);
    if (curveSample && curveSample.mode === 'levels') {
      this.beatState.globalEnergy = curveSample.globalEnergy;
      return curveSample.levels;
    }
    const analyser = this.beatState.analyser;
    const freqData = this.beatState.freqData;
    if (!analyser || !freqData) return levels;
    analyser.getByteFrequencyData(freqData);
    const totalBins = freqData.length;
    const nyquist = (this.beatState.audioContext && this.beatState.audioContext.sampleRate)
      ? this.beatState.audioContext.sampleRate / 2
      : 22050;
    const minFreq = 40;
    const maxFreq = 14000;
    const logMin = Math.log10(minFreq);
    const logMax = Math.log10(maxFreq);
    const binForFreq = (freq: number) => {
      const clamped = clamp(freq, minFreq, maxFreq);
      const ratio = clamped / nyquist;
      return Math.max(0, Math.min(totalBins - 1, Math.round(ratio * (totalBins - 1))));
    };
    let sumRaw = 0;
    for (let i = 0; i < bandCount; i += 1) {
      const t0 = bandCount === 1 ? 0 : i / bandCount;
      const t1 = bandCount === 1 ? 1 : (i + 1) / bandCount;
      const f0 = 10 ** (logMin + (logMax - logMin) * t0);
      const f1 = 10 ** (logMin + (logMax - logMin) * t1);
      const start = binForFreq(f0);
      const end = Math.max(start + 1, binForFreq(f1));
      let sumSq = 0;
      let peak = 0;
      let count = 0;
      for (let j = start; j < end; j += 1) {
        const v = freqData[j] || 0;
        sumSq += v * v;
        if (v > peak) peak = v;
        count += 1;
      }
      const rms = Math.sqrt(sumSq / Math.max(1, count)) / 255;
      const peakNorm = peak / 255;
      const level = 0.7 * rms + 0.3 * peakNorm;
      const emphasized = Math.pow(clamp(level, 0, 1), 1.15);
      sumRaw += emphasized;
      const stats = this.beatState.bandStats[i] || { ema: emphasized, dev: 0.05 };
      const emaAlpha = 0.02;
      const devAlpha = 0.05;
      stats.ema = stats.ema + (emphasized - stats.ema) * emaAlpha;
      const deviation = Math.abs(emphasized - stats.ema);
      stats.dev = stats.dev + (deviation - stats.dev) * devAlpha;
      this.beatState.bandStats[i] = stats;
      let gain = null;
      if (curveSample && curveSample.mode === 'gain') {
        gain = curveSample.gains[i] ?? 1;
      }
      if (gain == null) {
        gain = clamp(0.6 / (stats.dev + 0.02), 0.6, 3.0);
      }
      const adjusted = clamp(stats.ema + (emphasized - stats.ema) * gain, 0, 1);
      levels[i] = adjusted;
    }
    this.beatState.globalEnergy = bandCount ? sumRaw / bandCount : 0;
    if (!Number.isFinite(this.beatState.globalEnergy)) {
      this.beatState.globalEnergy = 0;
    }
    const lowBandCount = Math.min(3, bandCount);
    const lowBandThreshold = 0.15;
    const lowBandGain = 1.2;
    for (let i = 0; i < lowBandCount; i += 1) {
      const value = levels[i];
      const normalized = Math.max(0, (value - lowBandThreshold) / Math.max(0.001, 1 - lowBandThreshold));
      levels[i] = clamp(normalized * lowBandGain, 0, 1);
    }
    return levels;
  }

  private buildDynamicColors() {
    const levels = this.getBandLevels();
    const globalEnergy = this.beatState.globalEnergy || 0;
    const darken = clamp(globalEnergy, 0, 1) * AMLL_DARKEN_MAX;
    return this.beatState.basePaletteHsl.map((base, index) => {
      const level = levels[index] || 0;
      const delta = AMLL_LIGHTNESS_MIN_DELTA
        + level * (AMLL_LIGHTNESS_MAX_DELTA - AMLL_LIGHTNESS_MIN_DELTA)
        - darken;
      const lightness = clamp(base.l + delta, 0, 100);
      const sat = clamp(base.origS ?? (base.baseS + 50), 0, 100);
      const rgb = hslToRgb(base.h, sat, lightness);
      return { r: rgb.r, g: rgb.g, b: rgb.b };
    });
  }

  private tickBeatPalette() {
    if (!this.beatState.enabled) {
      this.beatState.rafId = null;
      return;
    }
    const renderer = this.beatState.renderer;
    const mesh = this.getActiveMesh(renderer);
    if (mesh) {
      if (!this.beatState.originalMeshColors) {
        this.captureMeshColors(mesh);
      }
      this.ensureBeatBasePalette();
      const colors = this.buildDynamicColors();
      if (colors.length) {
        this.applyColorsToMesh(mesh, colors);
      }
    }
    this.beatState.rafId = requestAnimationFrame(() => this.tickBeatPalette());
  }

  private startBeatPaletteLoop() {
    if (this.beatState.rafId != null) return;
    this.beatState.rafId = requestAnimationFrame(() => this.tickBeatPalette());
  }

  private stopBeatPaletteLoop(clearBackground = true) {
    if (this.beatState.rafId != null) {
      cancelAnimationFrame(this.beatState.rafId);
    }
    this.beatState.rafId = null;
    this.beatState.enabled = false;
    this.beatState.lastColors = null;
    const renderer = this.beatState.renderer;
    const mesh = this.getActiveMesh(renderer);
    if (mesh) {
      if (!this.restoreMeshColors(mesh)) {
        this.applyBasePaletteToMesh(mesh);
      }
    }
    this.beatState.renderer = null;
    this.beatState.basePaletteHsl = [];
    this.beatState.originalMeshColors = null;
    this.beatState.originalMeshSize = null;
    this.beatState.bandStats = [];
    this.beatState.globalEnergy = 0;
    if (clearBackground) {
      this.beatState.beatCurve = null;
    }
  }

  private attachBeatPaletteDriver() {
    if (!this.state.backgroundBeatEnabled) return;
    if (this.state.backgroundType !== 'fluid') return;
    const renderer = this.getBeatRenderer();
    if (!renderer) return;
    this.beatState.renderer = renderer;
    this.beatState.enabled = true;
    this.beatState.basePaletteHsl = [];
    this.beatState.bandStats = [];
    this.beatState.globalEnergy = 0;
    if (!this.beatState.beatCurve || this.beatState.beatCurve.mode === 'gain') {
      this.ensureBeatAudioAnalyser();
    }
    this.ensureBeatBasePalette();
    this.startBeatPaletteLoop();
    this.ensureBeatCurveAuto();
  }

  private resetBeatPaletteCache() {
    this.beatState.basePaletteHsl = [];
    this.beatState.lastColors = null;
    this.beatState.originalMeshColors = null;
    this.beatState.originalMeshSize = null;
    this.beatState.bandStats = [];
  }

  private syncBackgroundBeatState() {
    if (!this.state.backgroundBeatEnabled || this.state.backgroundType !== 'fluid') {
      this.stopBeatPaletteLoop(true);
      return;
    }
    if (!this.state.isPlaying) {
      this.stopBeatPaletteLoop(false);
      return;
    }
    if (this.beatState.audioContext && this.beatState.audioContext.state === 'suspended') {
      this.beatState.audioContext.resume().catch(() => {});
    }
    this.attachBeatPaletteDriver();
  }

  // 更新背景显示
  private applyControlPointCode() {
    if (!this.controlPointCodeInput || !this.background) {
      return;
    }

    this.saveBackgroundSettings();

    const code = this.controlPointCodeInput.value.trim();
    if (!code) {
      try {
        const renderer = this.background['renderer'];
        if (!renderer || !(renderer instanceof MeshGradientRenderer)) {
          return;
        }

        renderer['manualControl'] = false;
        renderer.setAlbum(resolveDefaultCover(this.state.coverUrl));
      } catch (error) {
        console.error('Failed to reset to default control points:', error);
      }

      return;
    }

    try {
      const renderer = this.background['renderer'];
      if (!renderer || !(renderer instanceof MeshGradientRenderer)) {
        return;
      }

      let presetData;
      try {
        presetData = JSON.parse(code);
      } catch (jsonError) {
        try {
          presetData = eval(`(${code})`);
        } catch (evalError) {
          console.error('Failed to parse control point code:', jsonError, evalError);
          return;
        }
      }

      if (!presetData) {
        return;
      }

      let width = 4; // 默认值
      let height = 4; // 默认值
      let controlPointsData: any[] = [];

      if (typeof presetData === 'object' && 'width' in presetData && 'height' in presetData && 'conf' in presetData) {
        // 格式3: {width, height, conf: [...]} - CONTROL_POINT_PRESETS格式
        width = presetData.width;
        height = presetData.height;
        controlPointsData = presetData.conf;
      } else if (Array.isArray(presetData)) {
        // 支持两种格式: [width, height, [cx, cy, x, y, ur, vr, up, vp], ...] 或 [[cx, cy, x, y, ur, vr, up, vp], ...]
        if (typeof presetData[0] === 'number' && typeof presetData[1] === 'number') {
          // 格式1: [width, height, [cx, cy, x, y, ur, vr, up, vp], ...]
          width = presetData[0];
          height = presetData[1];
          controlPointsData = presetData.slice(2);
        } else if (Array.isArray(presetData[0])) {
          // 格式2: [[cx, cy, x, y, ur, vr, up, vp], ...]
          controlPointsData = presetData;
          // 从控制点数据中计算width和height
          let maxCx = 0;
          let maxCy = 0;
          for (const cp of controlPointsData) {
            if (Array.isArray(cp) && cp.length >= 2) {
              maxCx = Math.max(maxCx, cp[0]);
              maxCy = Math.max(maxCy, cp[1]);
            }
          }
          width = maxCx + 1;
          height = maxCy + 1;
        } else {
          return;
        }
      } else {
        return;
      }

      renderer['manualControl'] = true;

      if (!renderer['meshStates'] || renderer['meshStates'].length === 0) {
        renderer.setAlbum(resolveDefaultCover(this.state.coverUrl));

        if (!renderer['meshStates'] || renderer['meshStates'].length === 0) {
          return;
        }
      }

      const latestMeshState = renderer['meshStates'][renderer['meshStates'].length - 1];
      if (!latestMeshState || !latestMeshState['mesh']) {
        return;
      }

      const mesh = latestMeshState['mesh'];

      width = Math.max(2, width);
      height = Math.max(2, height);

      if (mesh['resizeControlPoints']) {
        try {
          mesh['resizeControlPoints'](width, height);
        } catch (error) {
          return;
        }

        const uPower = 2 / (width - 1);
        const vPower = 2 / (height - 1);
        let appliedCount = 0;

        for (let i = 0; i < controlPointsData.length; i++) {
          const cpData = controlPointsData[i];
          if (Array.isArray(cpData) && cpData.length >= 8) {
            // 格式: [cx, cy, x, y, ur, vr, up, vp]
            const cx = cpData[0];
            const cy = cpData[1];
            const x = cpData[2];
            const y = cpData[3];
            const ur = cpData[4];
            const vr = cpData[5];
            const up = cpData[6];
            const vp = cpData[7];
            if (cx >= 0 && cx < width && cy >= 0 && cy < height) {
              const cp = mesh['getControlPoint'](cx, cy);
              if (cp) {
                try {
                  cp['location'].x = x;
                  cp['location'].y = y;
                  cp['uRot'] = (ur * Math.PI) / 180; // 转换角度为弧度
                  cp['vRot'] = (vr * Math.PI) / 180; // 转换角度为弧度
                  cp['uScale'] = uPower * up;
                  cp['vScale'] = vPower * vp;
                  appliedCount++;
                } catch (error) {
                  console.warn(`Failed to apply control point at (${cx}, ${cy}):`, error);
                }
              }
            } else {
            }
          }
        }

        mesh['updateMesh']();
      }
    } catch (error) {
      console.error('Failed to apply control points:', error);
    }
  }

  private updateBackground(options?: { skipSave?: boolean }) {
    const currentCover = resolveDefaultCover(this.state.coverUrl);

    if (this.state.backgroundType === 'cover') {
      this.background.getElement().style.display = "none";
      this.coverBlurBackground.style.display = "block";
      this.coverBlurBackground.style.backgroundImage = `url(${currentCover})`;
      if (this.state.backgroundColorMask) {
        const opacity = this.state.backgroundMaskOpacity / 100;
        const color = this.state.backgroundMaskColor;
        this.coverBlurBackground.style.backgroundColor = color;
        this.coverBlurBackground.style.backgroundBlendMode = 'multiply';
        this.coverBlurBackground.style.opacity = opacity.toString();
      } else {
        this.coverBlurBackground.style.backgroundColor = 'transparent';
        this.coverBlurBackground.style.backgroundBlendMode = 'normal';
        this.coverBlurBackground.style.opacity = '1';
      }

      const mappedBlurLevel = (this.state.coverBlurLevel / 100) * 100;
      this.coverBlurBackground.style.filter = `blur(${mappedBlurLevel}px)`;
      this.invertColors(this.state.invertColors, { skipSave: options?.skipSave });
    } else if (this.state.backgroundType === 'solid') {
      this.background.getElement().style.display = "none";
      this.coverBlurBackground.style.display = "none";
    } else {
      this.background.getElement().style.display = "block";
      this.coverBlurBackground.style.display = "none";
      this.background.setAlbum(currentCover);
      this.background.setStaticMode(!this.state.backgroundDynamic);
      this.background.setFlowSpeed(this.state.backgroundFlowSpeed);
    }

    const dpr = window.devicePixelRatio || 1;
    this.background.setRenderScale(this.state.backgroundRenderScale * dpr);
    this.resetBeatPaletteCache();
    this.syncBackgroundBeatState();
  }

  private updateFPSDisplay() {
    if (this.stats) {
      this.stats.dom.style.display = this.state.showFPS ? 'block' : 'none';
    }
  }

  private updatePlaybackRateIcon(rate: number) {
    if (this.speedLowIcon) this.speedLowIcon.style.display = 'none';
    if (this.speedMediumIcon) this.speedMediumIcon.style.display = 'none';
    if (this.speedHighIcon) this.speedHighIcon.style.display = 'none';
    if (rate < 0.75 && this.speedLowIcon) {
      this.speedLowIcon.style.display = 'block';
    } else if (rate >= 0.76 && rate <= 1.5 && this.speedMediumIcon) {
      this.speedMediumIcon.style.display = 'block';
    } else if (this.speedHighIcon) {
      this.speedHighIcon.style.display = 'block';
    }
  }

  private updateVolumeIcon(volume: number) {
    if (this.volumeOffIcon) this.volumeOffIcon.style.display = 'none';
    if (this.volumeLowIcon) this.volumeLowIcon.style.display = 'none';
    if (this.volumeMediumIcon) this.volumeMediumIcon.style.display = 'none';
    if (this.volumeHighIcon) this.volumeHighIcon.style.display = 'none';
    if (volume === 0 && this.volumeOffIcon) {
      this.volumeOffIcon.style.display = 'block';
    } else if (volume > 0 && volume <= 35 && this.volumeLowIcon) {
      this.volumeLowIcon.style.display = 'block';
    } else if (volume > 35 && volume <= 65 && this.volumeMediumIcon) {
      this.volumeMediumIcon.style.display = 'block';
    } else if (this.volumeHighIcon) {
      this.volumeHighIcon.style.display = 'block';
    }
  }

  private applyLyricDelay(value: number, options?: { skipSave?: boolean }) {
    this.state.lyricDelay = value;
    this.pendingLyricDelay = value;

    if (!this.lyricPlayer) {
      return;
    }

    if (!this.audio) {
      this.lyricPlayer.setCurrentTime(value);
      this.pendingLyricDelay = null;
      return;
    }

    if (this.processedLyricLines.length === 0) {
      return;
    }

    const adjustedTime = this.audio.currentTime * 1000 + value;
    this.lyricPlayer.setCurrentTime(adjustedTime);
    this.pendingLyricDelay = null;

    if (!options?.skipSave) {
      this.saveBackgroundSettings();
    }
  }

  private initAlbumCoverEffects() {
    if (!this.albumCoverContainer) return;

    this.albumCoverContainer.addEventListener('mouseenter', this.handleAlbumCoverHover.bind(this));
    this.albumCoverContainer.addEventListener('mousemove', this.handleAlbumCoverHover.bind(this));
    this.albumCoverContainer.addEventListener('mouseleave', this.resetAlbumCoverEffects.bind(this));
    this.albumCoverContainer.addEventListener('touchstart', this.handleAlbumCoverTouch.bind(this), { passive: true });
    this.albumCoverContainer.addEventListener('touchmove', this.handleAlbumCoverTouch.bind(this), { passive: true });
    this.albumCoverContainer.addEventListener('touchend', this.resetAlbumCoverEffects.bind(this));
  }

  private handleAlbumCoverHover(e: MouseEvent) {
    if (!this.albumCoverContainer) return;

    const rect = this.albumCoverContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    let tiltX = -((y - centerY) / centerY) * 20;
    let tiltY = -((centerX - x) / centerX) * 20;
    const isTop = y < centerY;
    const isLeft = x < centerX;
    const decayFactor = 0.6;
    if (isTop && isLeft) {
      tiltX *= decayFactor;
    } else if (isTop && !isLeft) {
      tiltX *= decayFactor;
      tiltY *= decayFactor;
    } else if (!isTop && isLeft) {
    } else {
      tiltY *= decayFactor;
    }

    this.applyLiquifyEffect(tiltX, tiltY, 0.95);
  }

  private handleAlbumCoverTouch(e: TouchEvent) {
    if (!this.albumCoverContainer || e.touches.length === 0) return;

    const touch = e.touches[0];
    const rect = this.albumCoverContainer.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    let tiltX = -((y - centerY) / centerY) * 20;
    let tiltY = -((centerX - x) / centerX) * 20;
    const isTop = y < centerY;
    const isLeft = x < centerX;
    const decayFactor = 0.6;
    if (isTop && isLeft) {
      tiltX *= decayFactor;
    } else if (isTop && !isLeft) {
      tiltX *= decayFactor;
      tiltY *= decayFactor;
    } else if (!isTop && isLeft) {
    } else {
      tiltY *= decayFactor;
    }

    this.applyLiquifyEffect(tiltX, tiltY, 0.95);
  }

  private applyLiquifyEffect(tiltX: number, tiltY: number, scale: number) {
    if (!this.albumCoverContainer) return;

    this.albumCoverContainer.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(${scale})`;

    this.albumCoverContainer.style.boxShadow = `0 25px 35px rgba(0, 0, 0, 0.25), 0 15px 20px rgba(0, 0, 0, 0.2)`;
  }

  private resetAlbumCoverEffects() {
    if (!this.albumCoverContainer) return;
    this.albumCoverContainer.style.transform = '';
    this.albumCoverContainer.style.boxShadow = '0 20px 25px rgba(0, 0, 0, 0.18), 0 10px 25px rgba(0, 0, 0, 0.18)';
  }
}

async function bootstrapPlayer(): Promise<void> {
  const blocked = await shouldBlockWithVersionGate();
  if (blocked) {
    return;
  }

  const player = new WebLyricsPlayer();
  (window as any).player = player;
  (window as any).globalLyricPlayer = player.getLyricPlayer();
  (window as any).globalBackground = player.getBackground();
  player.start();
}

void bootstrapPlayer();
