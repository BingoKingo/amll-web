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
import { getCurrentLanguage, getTranslations, t } from "./i18n";
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
  coverStyle: 'normal' | 'innerShadow' | 'threeDShadow' | 'longShadow' | 'neumorphismA' | 'neumorphismB' | 'reflection' | 'cd' | 'vinyl' | 'colored';
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

class WebLyricsPlayer {
  private audio: HTMLAudioElement;
  private lyricPlayer: BaseDomLyricPlayer;
  private background: BackgroundRender<PixiRenderer | MeshGradientRenderer>;
  private coverBlurBackground: HTMLDivElement;
  private stats: Stats;
  private state: PlayerState;
  private rangeStartLine: HTMLElement | null = null;
  private rangeEndLine: HTMLElement | null = null;
  private rangeProgressBar: HTMLElement | null = null;
  private rangeSelectionCount = 0;
  private isInitialized = false;
  private hasLyrics = false;
  private gui: GUI | null = null;
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
  private hidePassedLyricsCheckbox: HTMLInputElement | null = null;
  private bgLowFreqVolume: HTMLInputElement | null = null;
  private bgLowFreqVolumeValue: HTMLElement | null = null;
  private fftDataRangeMin: HTMLInputElement | null = null;
  private fftDataRangeMinValue: HTMLElement | null = null;
  private fftDataRangeMax: HTMLInputElement | null = null;
  private fftDataRangeMaxValue: HTMLElement | null = null;
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

  private initI18n() {
    document.documentElement.lang = getCurrentLanguage();

    const i18nElements = document.querySelectorAll("[data-i18n]");
    i18nElements.forEach((el) => {
      const key = el.getAttribute("data-i18n") as any;
      if (key) {
        el.textContent = t(key);
      }
    });

    const placeholderElements = document.querySelectorAll(
      "[data-i18n-placeholder]"
    );
    placeholderElements.forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder") as any;
      if (key) {
        (el as HTMLInputElement).placeholder = t(key);
      }
    });
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
      this.albumCoverLarge.style.borderRadius = `${borderRadius}%`;
      this.albumCoverContainer.style.borderRadius = `${borderRadius}%`;
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

  private updateCoverRotation() {
    if (this.albumCoverLarge && this.albumCoverContainer) {
      this.albumCoverLarge.style.animation = 'none';

      if (this.state.coverRotationSpeed !== 0) {
        this.applyCoverRotation(this.albumCoverLarge, this.albumCoverContainer);
      } else {
        if (this.audio.paused) {
          this.albumCoverContainer.style.transform = 'scale(0.96)';
          this.albumCoverLarge.style.transform = 'scale(1)';
        } else {
          this.albumCoverContainer.style.transform = 'scale(1)';
          this.albumCoverLarge.style.transform = 'scale(1)';
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

  private applyCoverRotation(albumCoverLarge: HTMLImageElement, albumCoverContainer: HTMLElement) {
    const speed = Math.abs(this.state.coverRotationSpeed);
    const duration = 60 / speed;

    const animationName = this.state.coverRotationSpeed > 0 ? 'spin' : 'spinCounterclockwise';
    albumCoverLarge.style.animation = `${animationName} ${duration}s linear infinite`;

    if (this.audio.paused || albumCoverLarge.matches(':hover')) {
      albumCoverLarge.style.animationPlayState = 'paused';
      albumCoverContainer.style.transform = 'scale(0.96)';
      albumCoverLarge.style.transform = 'scale(1)';
    } else {
      albumCoverLarge.style.animationPlayState = 'running';
      albumCoverContainer.style.transform = 'scale(1)';
      albumCoverLarge.style.transform = 'scale(1)';
    }
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

    const updateTitleMarquee = () => {
      if (this.titleMarqueeInterval) {
        clearInterval(this.titleMarqueeInterval);
        this.titleMarqueeInterval = null;
      }

      if (!this.originalTitle) {
        this.originalTitle = document.title;
      }

      if (this.state.marqueeEnabled && (this.state.songTitle || this.state.songArtist)) {
        const songInfo = `${this.state.songArtist ? this.state.songArtist + ' - ' : ''}${this.state.songTitle}`;
        const fullTitle = `${songInfo} | AMLL Web Player`;

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
        if (this.state.songTitle || this.state.songArtist) {
          const songInfo = `${this.state.songArtist ? this.state.songArtist + ' - ' : ''}${this.state.songTitle}`;
          document.title = `${songInfo} | AMLL Web Player`;
        } else {
          document.title = this.originalTitle || 'AMLL Web Player';
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

  private updateFFTDataRange() {
    // 这里可以添加实际的FFT数据范围更新逻辑
    if (this.background && typeof (this.background as any).setFrequencyRange === 'function') {
      (this.background as any).setFrequencyRange(this.state.fftDataRangeMin, this.state.fftDataRangeMax);
    }
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
    this.hidePassedLyricsCheckbox = document.getElementById('hidePassedLyrics') as HTMLInputElement;
    this.bgLowFreqVolume = document.getElementById('bgLowFreqVolume') as HTMLInputElement;
    this.bgLowFreqVolumeValue = document.getElementById('bgLowFreqVolumeValue');
    this.fftDataRangeMin = document.getElementById('fftDataRangeMin') as HTMLInputElement;
    this.fftDataRangeMinValue = document.getElementById('fftDataRangeMinValue');
    this.fftDataRangeMax = document.getElementById('fftDataRangeMax') as HTMLInputElement;
    this.fftDataRangeMaxValue = document.getElementById('fftDataRangeMaxValue');
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
    this.solidOptions = document.querySelectorAll('.solid-option');
    this.recordOptions = document.querySelectorAll('.record-option');
  }

  constructor() {
    this.initI18n();
    this.audio = document.createElement("audio");
    this.audio.volume = 0.5;
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

    this.state = {
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
      lyricDelay: 0,
      backgroundType: 'fluid',
      backgroundDynamic: true,
      backgroundFlowSpeed: 4,
      backgroundColorMask: true,
      backgroundMaskColor: '#FFFFFF',
      backgroundMaskOpacity: 70,
      showFPS: false,
      coverBlurLevel: 100,
      isRangeMode: false,
      rangeStartTime: 0,
      rangeEndTime: 0,
      invertColors: false,
      originalInvertColors: false,
      manualDominantColor: null,
      manualDominantColorLight: null,
      manualDominantColorDark: null,
      marqueeEnabled: true,
      roundedCover: 55,
      coverRotationSpeed: 0,
      backgroundRenderScale: 1,
      backgroundFPS: 60,
      lyricAlignPosition: 0.4,
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
      coverStyle: 'normal',
      fftDataRangeMin: 1,
      fftDataRangeMax: 22050,
      posYSpringMass: 1,
      posYSpringDamping: 15,
      posYSpringStiffness: 100,
      posYSpringSoft: false,
      scaleSpringMass: 1,
      scaleSpringDamping: 20,
      scaleSpringStiffness: 100,
      scaleSpringSoft: false,
    };
    this.hasLyrics = false;

    this.setDefaultColors();
    this.initColors();
    this.background = BackgroundRender.new(MeshGradientRenderer);
    this.coverBlurBackground = document.createElement('div');
    this.stats = new Stats();
    this.initDOMCache();
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

    if (this.timeDisplay) {
      this.timeDisplay.addEventListener("click", () => {
        this.state.showRemainingTime = !this.state.showRemainingTime;
        this.updateTimeDisplay();
      });
      this.timeDisplay.style.cursor = "pointer";
    }

    if (this.landscapeTimeDisplay) {
      this.landscapeTimeDisplay.addEventListener("click", () => {
        this.state.showRemainingTime = !this.state.showRemainingTime;
        this.updateTimeDisplay();
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

    // FFT Data Range Min
    const fftDataRangeMin = this.fftDataRangeMin;
    const fftDataRangeMinValue = this.fftDataRangeMinValue;

    if (fftDataRangeMin && fftDataRangeMinValue) {
      fftDataRangeMinValue.textContent = `${fftDataRangeMin.value}Hz`;

      fftDataRangeMin.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        const maxRange = this.fftDataRangeMax;
        const fftDataRangeMaxValue = this.fftDataRangeMaxValue;
        let maxValue = 0;
        if (maxRange) {
          maxValue = parseInt(maxRange.value);
        }

        // 如果min > max，则max跟随min移动
        if (value > maxValue) {
          this.state.fftDataRangeMin = value;
          fftDataRangeMin.value = value.toString();
          this.state.fftDataRangeMax = value;
          if (maxRange) {
            maxRange.value = value.toString();
          }
          if (fftDataRangeMaxValue) {
            fftDataRangeMaxValue.textContent = `${value}Hz`;
          }
        } else {
          this.state.fftDataRangeMin = value;
        }

        fftDataRangeMinValue.textContent = `${this.state.fftDataRangeMin}Hz`;
        this.updateFFTDataRange();
        this.saveBackgroundSettings();
      });

      fftDataRangeMin.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = Math.sign((e as WheelEvent).deltaY) * -1; // 反转滚轮方向
        const currentValue = parseInt(fftDataRangeMin.value);
        const min = parseInt(fftDataRangeMin.min);
        const max = parseInt(fftDataRangeMin.max);
        const step = 1;
        const newValue = Math.min(max, Math.max(min, currentValue + delta * step));

        const maxRange = this.fftDataRangeMax;
        const fftDataRangeMaxValue = this.fftDataRangeMaxValue;
        let maxValue = 0;
        if (maxRange) {
          maxValue = parseInt(maxRange.value);
        }

        if (newValue > maxValue) {
          fftDataRangeMin.value = newValue.toString();
          this.state.fftDataRangeMin = newValue;
          if (maxRange) {
            maxRange.value = newValue.toString();
          }
          this.state.fftDataRangeMax = newValue;
          if (fftDataRangeMaxValue) {
            fftDataRangeMaxValue.textContent = `${newValue}Hz`;
          }
        } else {
          fftDataRangeMin.value = newValue.toString();
          this.state.fftDataRangeMin = newValue;
        }

        fftDataRangeMinValue.textContent = `${this.state.fftDataRangeMin}Hz`;
        this.updateFFTDataRange();
        this.saveBackgroundSettings();
      }, { passive: false });

      // FFT Data Range Max
      const fftDataRangeMax = this.fftDataRangeMax;
      const fftDataRangeMaxValue = this.fftDataRangeMaxValue;

      if (fftDataRangeMin && fftDataRangeMinValue) {
        fftDataRangeMinValue.textContent = `${fftDataRangeMin.value}Hz`;
      }
      if (fftDataRangeMax) {
        fftDataRangeMax.addEventListener('input', (e) => {
          const value = parseInt((e.target as HTMLInputElement).value);
          const minRange = this.fftDataRangeMin;
          let minValue = 0;

          if (minRange) {
            minValue = parseInt(minRange.value);
          }

          // 如果max < min，则min跟随max移动
          if (value < minValue) {
            this.state.fftDataRangeMax = value;
            fftDataRangeMax.value = value.toString();
            this.state.fftDataRangeMin = value;
            if (minRange) {
              minRange.value = value.toString();
              if (fftDataRangeMinValue) {
                fftDataRangeMinValue.textContent = `${value}Hz`;
              }
            }
          } else {
            this.state.fftDataRangeMax = value;
          }

          if (fftDataRangeMaxValue) {
            fftDataRangeMaxValue.textContent = `${this.state.fftDataRangeMax}Hz`;
          }
          this.updateFFTDataRange();
          this.saveBackgroundSettings();
        });

        fftDataRangeMax.addEventListener('wheel', (e) => {
          e.preventDefault();
          const delta = Math.sign((e as WheelEvent).deltaY) * -1; // 反转滚轮方向
          const currentValue = parseInt(fftDataRangeMax.value);
          const min = parseInt(fftDataRangeMax.min);
          const max = parseInt(fftDataRangeMax.max);
          const step = 1;
          const newValue = Math.min(max, Math.max(min, currentValue + delta * step));

          const minRange = this.fftDataRangeMin;
          let minValue = 0;

          if (minRange) {
            minValue = parseInt(minRange.value);
          }

          // 如果max < min，则min跟随max移动
          if (newValue < minValue) {
            fftDataRangeMax.value = newValue.toString();
            this.state.fftDataRangeMax = newValue;
            if (minRange) {
              minRange.value = newValue.toString();
              this.state.fftDataRangeMin = newValue;
              if (fftDataRangeMinValue) {
                fftDataRangeMinValue.textContent = `${newValue}Hz`;
              }
            }
          } else {
            fftDataRangeMax.value = newValue.toString();
            this.state.fftDataRangeMax = newValue;
          }

          if (fftDataRangeMaxValue) {
            fftDataRangeMaxValue.textContent = `${this.state.fftDataRangeMax}Hz`;
          }
          this.updateFFTDataRange();
          this.saveBackgroundSettings();
        }, { passive: false });
      }
    }

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
      const currentTitle = titleElement.textContent || "";

      if (currentTitle === "" || currentTitle === t("title")) {
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
      const currentArtist = artistElement.textContent || "";

      if (currentArtist === "" || currentArtist === t("artist")) {
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
      });

    this.songArtistInput
      ?.addEventListener("input", (e) => {
        this.state.songArtist = (e.target as HTMLInputElement).value;
        this.updateSongInfo();
      });

    this.songTitleInput
      ?.addEventListener("blur", (e) => {
        this.state.songTitle = (e.target as HTMLInputElement).value;
        this.updateSongInfo();
        if (this.songTitle) {
          this.checkAndUpdateMarquee(this.songTitle);
        }
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
      });

    if (this.playbackRateControl && this.playbackRateValue) {
      this.playbackRateControl.addEventListener("input", (e) => {
        const rate = parseFloat((e.target as HTMLInputElement).value);
        if (!isNaN(rate)) {
          this.audio.playbackRate = rate;
          if (this.playbackRateValue) {
            this.playbackRateValue.textContent = rate.toFixed(2) + "x";
          }
          this.updatePlaybackRateIcon(rate);
        }
      });
      const initialRate = parseFloat(this.playbackRateControl.value);
      this.updatePlaybackRateIcon(initialRate);
    }

    if (this.volumeControl && this.volumeValue) {
      this.volumeControl.value = (this.audio.volume * 100).toString();
      this.volumeValue.textContent = Math.round(this.audio.volume * 100) + "%";
      this.updateVolumeIcon(Math.round(this.audio.volume * 100));

      this.volumeControl.addEventListener("input", (e) => {
        const volume = parseInt((e.target as HTMLInputElement).value);
        if (!isNaN(volume) && this.volumeValue) {
          this.audio.volume = volume / 100;
          this.volumeValue.textContent = volume + "%";
          this.updateVolumeIcon(volume);
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

  private async detectMaxFPS(): Promise<number> {
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
    this.detectMaxFPS().then(maxFPS => {
      if (this.bgFPS) {
        this.bgFPS.max = maxFPS.toString();
        if (parseInt(this.bgFPS.value) > maxFPS || parseInt(this.bgFPS.value) === 60) {
          this.bgFPS.value = maxFPS.toString();
          this.state.backgroundFPS = maxFPS;
          if (this.bgFPSValue) {
            this.bgFPSValue.textContent = `${maxFPS}fps`;
          }
          this.background.setFPS(maxFPS);
          this.saveBackgroundSettings();
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

  private setDefaultColors(): void {
    document.documentElement.style.setProperty('--dominant-color', '#fd9c9b');
    document.documentElement.style.setProperty('--dominant-color-light', '#ffcfce');
    document.documentElement.style.setProperty('--dominant-color-dark', '#640302');
    document.documentElement.style.setProperty('--waveform-color', '#fd9c9b');

    this.originalDominant = '#fd9c9b';
    this.originalLight = '#ffcfce';
    this.originalDark = '#640302';
    this.isColorsInitialized = true;

    if (this.invertColorsCheckbox) {
      this.invertColors(this.invertColorsCheckbox.checked);
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

  private invertColors(checked: boolean): void {
    if (!this.invertColorsCheckbox) return;

    if (!this.isColorsInitialized) {
      this.initColors();
    }

    this.state.invertColors = checked;
    this.applyManualColors();
    this.saveBackgroundSettings();
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

  private switchBackgroundStyle(style: string) {
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
        this.saveBackgroundSettings();
        break;
      case "cover":
        this.background.setAlbum(this.state.coverUrl || "./assets/icon-512x512.png");
        if (this.player) this.player.style.background = "";
        this.state.backgroundType = 'cover';
        this.updateBackground();
        this.updateBackgroundUI();
        this.saveBackgroundSettings();
        break;
      case "solid":
        this.background.setAlbum("");
        if (this.player) this.player.style.background = "transparent";
        this.state.backgroundType = 'solid';
        this.updateBackground();
        this.updateBackgroundUI();
        this.saveBackgroundSettings();
        break;
      default:
        break;
    }

    if (style !== 'cover' && this.invertColorsCheckbox) {
      this.invertColorsCheckbox.checked = false;
      this.invertColors(false);
    }

    if (style === 'cover' && currentStyle !== 'cover' && this.invertColorsCheckbox) {
      const invertState = this.state.originalInvertColors !== null && this.state.originalInvertColors !== undefined ?
        this.state.originalInvertColors : this.state.invertColors;
      this.invertColorsCheckbox.checked = invertState;
      this.invertColors(invertState);
    }

    if (this.invertColorsCheckbox) {
      const isChecked = this.invertColorsCheckbox.checked;
      this.invertColorsCheckbox.onchange = () => {
        if (this.invertColorsCheckbox) {
          this.invertColors(this.invertColorsCheckbox.checked);
        }
      };
      if (isChecked && style === 'cover') {
        this.invertColors(isChecked);
      }
    }
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

      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
      }
    });

    this.audio.addEventListener("ended", () => {
      this.state.isPlaying = false;
      this.updatePlayButton();
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

    this.updateLyricAreaHint();
  }

  private updateLyricAreaHint() {
    if (!this.lyricsPanel) return;

    if (this.lyricAreaHint) this.lyricAreaHint.remove();

    if (!this.hasLyrics) {
      const hintElement = document.createElement("div");
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
      // *.alrc, *.ass, *.json, *.krc, *.lqe, *.lrc, *.lyl, *.lys, *.qrc, *.srt, *.ttml, *.yrc

      hintElement.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.lyricFile) this.lyricFile.click();
      });

      hintElement.addEventListener("touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.lyricFile) this.lyricFile.click();
      }, { passive: false });

      this.lyricsPanel.appendChild(hintElement);
    }
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
            this.showStatus("不支持的文件类型，请拖拽音频或图片文件", true);
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
    } else if (file === "Direct Input") {
      fileDisplay.textContent = file;
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
    this.updateBackground();
    this.background.setAlbum("./assets/icon-512x512.png");
    this.setDefaultColors();

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
        this.showStatus(t("musicLoadFailed"), true);
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
      this.showStatus(t("musicLoadSuccess"));
    } catch (error) {
      this.showStatus(t("musicLoadFailed"), true);
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

  private async loadCoverFromFile(file: File) {
    try {
      const url = URL.createObjectURL(file);
      this.state.coverUrl = url;
      this.updateBackground();
      this.background.setAlbum(url || "./assets/icon-512x512.png");
      await this.extractAndProcessCoverColor(url);
      this.applyDominantColorAsCSSVariable();
      this.updateBackground();
      this.updateSongInfo();
      this.updateFileInputDisplay("coverFile", file);
      this.showStatus(t("coverLoadSuccess"));
    } catch (error) {
      this.showStatus(t("coverLoadFailed"), true);
    }
  }

  private async loadFromURLs() {
    let musicUrl = this.musicUrl?.value;
    let lyricUrl = this.lyricUrl?.value;
    let coverUrl = this.coverUrl?.value;

    // 如果输入框为空，尝试从URL参数获取
    const urlParams = new URLSearchParams(window.location.search);

    if (!musicUrl) {
      const urlMusic = urlParams.get("music");
      if (urlMusic && this.musicUrl) {
        musicUrl = urlMusic;
        this.musicUrl.value = musicUrl;
        if (this.state.autoPlay) {
          this.togglePlayPause();
        } else {
          this.state.isPlaying = false;
          this.updatePlayButton();
        }
      }
    }

    if (!lyricUrl) {
      const urlLyric = urlParams.get("lyric");
      if (urlLyric && this.lyricUrl) {
        lyricUrl = urlLyric;
        this.lyricUrl.value = lyricUrl;
      }
    }

    if (!coverUrl) {
      const urlCover = urlParams.get("cover");
      if (urlCover && this.coverUrl) {
        coverUrl = urlCover;
        this.coverUrl.value = coverUrl;
      }
    }

    const playbackSpeed = urlParams.get("x");
    const lyricDelayMs = urlParams.get("ms");
    const volume = urlParams.get("vol");
    const loopPlay =
      urlParams.get("loop") === "1" || urlParams.get("loop") === "true";
    const currentTime = urlParams.get("t");

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
        }
      }
    }

    if (lyricDelayMs) {
      const delay = parseInt(lyricDelayMs);
      if (!isNaN(delay)) {
        if (this.lyricDelayInput) {
          this.lyricDelayInput.value = delay.toString();
        }
        this.applyLyricDelay(delay);
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
        }
      }
    }

    if (urlParams.has("loop")) {
      if (this.loopPlayCheckbox) {
        this.loopPlayCheckbox.checked = loopPlay;
        this.state.loopPlay = loopPlay;
      }
    }

    if (this.songTitleInput && !this.songTitleInput.value) {
      const urlTitle = urlParams.get("title");
      if (urlTitle) {
        this.songTitleInput.value = urlTitle;
        this.state.songTitle = urlTitle;
      }
    }

    if (this.songArtistInput && !this.songArtistInput.value) {
      const urlArtist = urlParams.get("artist");
      if (urlArtist) {
        this.songArtistInput.value = urlArtist;
        this.state.songArtist = urlArtist;
      }
    }

    if (this.state.songTitle) {
      if (this.state.songArtist) {
        document.title = `${this.state.songArtist} - ${this.state.songTitle} | AMLL Web Player`;
      } else {
        document.title = `${this.state.songTitle} | AMLL Web Player`;
      }
    }

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
          this.showStatus(t("lyricsUrlLoadFailed"), true);
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
        this.background.setAlbum(coverUrl || "./assets/icon-512x512.png");
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
          this.background.setAlbum(coverUrl || "./assets/icon-512x512.png");
          await this.extractAndProcessCoverColor(coverUrl);
          this.applyDominantColorAsCSSVariable();
          this.updateFileInputDisplay("coverFile", `Base64 Encoded Input (${contentType})`);
        } else {
          this.state.coverUrl = coverUrl;
          this.updateBackground();
          this.background.setAlbum(coverUrl || "./assets/icon-512x512.png");
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
      if (artist) {
        document.title = `${artist} - ${title} | AMLL Web Player`;
      } else {
        document.title = `${title} | AMLL Web Player`;
      }
    }

    if (currentTime && this.audio) {
      const time = parseFloat(currentTime);
      if (!isNaN(time) && time >= 0) {
        this.audio.currentTime = time;
      }
    }

    this.showStatus(t("loadFromUrlComplete"));
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
    if (!input.trim()) {
      return;
    }

    const urlPattern = /^https?:\/\/.+/;
    if (urlPattern.test(input.trim())) {
      this.state.coverUrl = input;
      this.updateBackground();
      this.background.setAlbum(input || "./assets/icon-512x512.png");
      await this.extractAndProcessCoverColor(input);
      this.applyDominantColorAsCSSVariable();
      this.updateFileInputDisplay("coverFile", input);
      return;
    }

    const base64Pattern = /^data:([^;]+)(;charset=([^;]+))?;base64,([A-Za-z0-9+/=]+)$/;
    const base64Match = input.trim().match(base64Pattern);
    if (base64Match) {
      const contentType = base64Match[1] || 'image/png';
      const charset = base64Match[3] || 'utf-8';
      this.state.coverUrl = input;
      this.updateBackground();
      this.background.setAlbum(input || "./assets/icon-512x512.png");
      await this.extractAndProcessCoverColor(input);
      this.applyDominantColorAsCSSVariable();
      this.updateFileInputDisplay("coverFile", `Base64 Encoded Input (${contentType})`);
      return;
    }

    this.state.coverUrl = input;
    this.updateBackground();
    this.background.setAlbum(input || "./assets/icon-512x512.png");
    await this.extractAndProcessCoverColor(input);
    this.applyDominantColorAsCSSVariable();
    this.updateFileInputDisplay("coverFile", input);
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
        const borderRadius = (this.state.roundedCover / 100) * 50;
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
            border-radius: ${borderRadius}%;
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
        // 长投影效果，仿照div长阴影样式实现，使用transform-origin、skew变换和动画效果，支持动态圆角（待实现）
        const borderRadiusL = (this.state.roundedCover / 100) * 50;
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
            border-radius: ${borderRadiusL}%;
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
        // 新拟态A - 浅色背景的凸起效果，支持动态圆角（待实现）
        const borderRadiusA = (this.state.roundedCover / 100) * 50;
        this.albumCoverContainer.style.boxShadow = '7px 7px 12px var(--dominant-color-dark), -7px -7px 12px var(--dominant-color-light), inset 0 0 0 var(--dominant-color-light), inset 0 0 0 var(--dominant-color-dark)';
        this.albumCoverContainer.style.borderRadius = `${borderRadiusA}%`;
        break;
      case "neumorphismB":
        // 新拟态B - 浅色背景的凹陷效果，使用伪元素实现，避免被图片覆盖，并随圆角变化（待实现）
        const borderRadiusB = (this.state.roundedCover / 100) * 50;
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
            border-radius: ${borderRadiusB}%;
          }
          #albumCoverLarge {
            position: relative;
            z-index: 5;
            border-radius: ${borderRadiusB}%;
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

    this.background.setAlbum("./assets/icon-512x512.png");
    this.setDefaultColors();
    this.isColorsInitialized = false;
    this.initColors();
    this.state.roundedCover = 55;
    this.updateRoundedCover();
    this.state.backgroundRenderScale = 1.00;
    const dpr = window.devicePixelRatio || 1;
    this.background.setRenderScale(1.00 * dpr);
    this.state.lyricAlignPosition = 0.5;
    this.lyricPlayer.setAlignPosition(0.5);
    this.state.hidePassedLyrics = false;
    this.lyricPlayer.setHidePassedLines(false);
    this.state.enableLyricBlur = true;
    this.lyricPlayer.setEnableBlur(true);
    this.state.enableLyricScale = true;
    this.lyricPlayer.setEnableScale(true);
    this.state.enableLyricSpring = true;
    this.lyricPlayer.setEnableSpring(true);
    this.state.wordFadeWidth = 0.50;
    this.lyricPlayer.setWordFadeWidth(0.50);
    this.state.backgroundFPS = 60;
    this.background.setFPS(60);
    this.state.showTranslatedLyric = true;
    this.state.showRomanLyric = true;
    this.state.swapLyricPositions = false;
    this.state.showbgLyric = true;
    this.state.swapDuetsPositions = false;
    this.state.singleLyrics = false;
    this.state.backgroundLowFreqVolume = 1;
    this.background.setLowFreqVolume(1);
    this.state.coverStyle = 'normal';

    this.state.lyricUrl = "";
    this.state.songTitle = "";
    this.state.songArtist = "";
    this.state.coverUrl = "";
    document.title = "AMLL Web Player";

    if (this.controlPointCodeInput) {
      this.controlPointCodeInput.value = '';
    }
    const renderer = this.background['renderer'];
    if (renderer && renderer instanceof MeshGradientRenderer) {
      renderer['manualControl'] = false;
    }

    if (this.albumCoverLarge) {
      this.albumCoverLarge.src = "./assets/icon-512x512.png";
    }

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
      this.loopPlayCheckbox.checked = true;
    }

    if (this.lyricAlignPositionValue) {
      this.lyricAlignPositionValue.textContent = '0.5';
    }

    if (this.enableLyricBlur) {
      this.enableLyricBlur.checked = true;
    }
    if (this.enableLyricScale) {
      this.enableLyricScale.checked = true;
    }
    if (this.enableLyricSpring) {
      this.enableLyricSpring.checked = true;
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
      this.bgLowFreqVolume.value = '1';
    }
    if (this.bgLowFreqVolumeValue) {
      this.bgLowFreqVolumeValue.textContent = '120hz'; // 1.0映射到120hz
    }
    if (this.posYSpringMassInput) {
      this.posYSpringMassInput.value = '1';
    }
    if (this.springPosYMassValue) {
      this.springPosYMassValue.textContent = '1.0';
    }
    if (this.posYSpringDampingInput) {
      this.posYSpringDampingInput.value = '15';
    }
    if (this.springPosYDampingValue) {
      this.springPosYDampingValue.textContent = '15';
    }
    if (this.posYSpringStiffnessInput) {
      this.posYSpringStiffnessInput.value = '100';
    }
    if (this.springPosYStiffnessValue) {
      this.springPosYStiffnessValue.textContent = '100';
    }
    if (this.posYSpringSoftCheckbox) {
      this.posYSpringSoftCheckbox.checked = false;
    }
    if (this.scaleSpringMassInput) {
      this.scaleSpringMassInput.value = '1';
    }
    if (this.springScaleMassValue) {
      this.springScaleMassValue.textContent = '1.0';
    }
    if (this.scaleSpringDampingInput) {
      this.scaleSpringDampingInput.value = '20';
    }
    if (this.springScaleDampingValue) {
      this.springScaleDampingValue.textContent = '20';
    }
    if (this.scaleSpringStiffnessInput) {
      this.scaleSpringStiffnessInput.value = '100';
    }
    if (this.springScaleStiffnessValue) {
      this.springScaleStiffnessValue.textContent = '100';
    }
    if (this.scaleSpringSoftCheckbox) {
      this.scaleSpringSoftCheckbox.checked = false;
    }

    if (this.controlPointCodeInput) {
      this.controlPointCodeInput.value = '';
    }

    if (this.background && this.background['renderer'] && typeof this.background['renderer']['setControlPoints'] === 'function') {
      try {
        this.background['renderer']['setControlPoints']([]);
      } catch (error) {
        console.error('Failed to reset control points:', error);
      }
    }

    if (this.playbackRateControl) {
      this.playbackRateControl.value = "1.00";
      this.audio.playbackRate = 1.0;
      if (this.playbackRateValue) {
        this.playbackRateValue.textContent = "1.00x";
      }
      this.updatePlaybackRateIcon(1.0);
    }

    if (this.volumeControl) {
      this.volumeControl.value = "50";
      this.audio.volume = 0.5;
      if (this.volumeValue) {
        this.volumeValue.textContent = "50%";
      }
      this.updateVolumeIcon(50);
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

    if (this.showTranslatedLyricCheckbox) this.showTranslatedLyricCheckbox.checked = true;
    if (this.showRomanLyricCheckbox) this.showRomanLyricCheckbox.checked = true;
    if (this.swapLyricPositionsCheckbox) this.swapLyricPositionsCheckbox.checked = false;
    this.updateLyricsDisplay();
    this.adjustLyricPosition();
    this.updatePlayButton();

    this.state = {
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
      lyricDelay: 0,
      backgroundType: 'fluid',
      backgroundDynamic: true,
      backgroundFlowSpeed: 4,
      backgroundColorMask: true,
      backgroundMaskColor: '#FFFFFF',
      backgroundMaskOpacity: 70,
      showFPS: false,
      coverBlurLevel: 100,
      invertColors: false,
      originalInvertColors: false,
      manualDominantColor: null,
      manualDominantColorLight: null,
      manualDominantColorDark: null,
      marqueeEnabled: true,
      roundedCover: 55,
      coverRotationSpeed: 0,
      backgroundRenderScale: 1,
      backgroundFPS: 60,
      lyricAlignPosition: 0.4,
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
      coverStyle: 'normal',
      fftDataRangeMin: 1,
      fftDataRangeMax: 22050,
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

    // 清除localStorage中的BackgroundSettings
    localStorage.removeItem('amll_background_settings');

    this.updateBackgroundUI();
    this.updateBackground();
    this.updateFPSDisplay();

    if (this.progressFill) {
      this.progressFill.style.width = "0%";
    }
    if (this.landscapeProgressFill) {
      this.landscapeProgressFill.style.width = "0%";
    }

    this.updateProgress();
    this.updateTimeDisplay();
    this.updateCoverRotation();
    this.showStatus(t("playerReset"));
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
      const coverUrl = this.state.coverUrl || "./assets/icon-512x512.png";

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
    if (this.state.songTitle) {
      if (this.state.songArtist) {
        document.title = `${this.state.songArtist} - ${this.state.songTitle} | AMLL Web Player`;
      } else {
        document.title = `${this.state.songTitle} | AMLL Web Player`;
      }
    }
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
        this.albumCoverLarge.src = "./assets/icon-512x512.png";
      }
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
              this.background.setAlbum(base64 || "./assets/icon-512x512.png");
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
              this.showStatus(t("metadataParseSuccess"));
            } else {
              this.parseAudioMetadataFallback(file);
            }
          },
          onError: (error: any) => {
            this.showStatus(t("metadataParseFailed"), true);
            this.parseAudioMetadataFallback(file);
          },
        });
      } else {
        console.log("jsmediatags library not loaded");
        this.showStatus(t("metadataLibNotLoaded"), true);
        this.parseAudioMetadataFallback(file);
      }
    } catch (error) {
      this.showStatus(t("metadataParseError"), true);
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
        this.showStatus(t("extractedSongInfo"));
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
          this.showStatus(t("extractedSongInfo"));
        } else {
          this.state.songTitle = nameWithoutExt;
          if (this.songTitleInput) {
            this.songTitleInput.value = this.state.songTitle;
          }
          this.updateSongInfo();
          this.updateMediaSessionMetadata();
          this.showStatus(t("usedFilenameAsTitle"));
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
      this.showStatus(t("cannotParseAudioInfo"), true);
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
    hint.innerHTML = `
      <div style="margin-bottom: 15px; font-size: 16px;">[INFO] 自动播放提示</div>
      <div style="margin-bottom: 15px;">由于浏览器安全策略，需要用户交互才能自动播放音频。</div>
      <div style="margin-bottom: 15px;">请点击播放按钮开始播放。</div>
      <button onclick="this.parentElement.remove()" title="Got it" style="
        background: #007bff;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 5px;
        cursor: pointer;
      ">知道了</button>
    `;
    document.body.appendChild(hint);

    setTimeout(() => {
      if (hint.parentElement) {
        hint.remove();
      }
    }, 3000);
  }

  public loadFromURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const music = urlParams.get("music");
    const lyric = urlParams.get("lyric");
    const cover = urlParams.get("cover");
    const title = urlParams.get("title");
    const artist = urlParams.get("artist");
    const hasAutoParam = urlParams.has("auto");
    const autoPlay = hasAutoParam
      ? urlParams.get("auto") === "1" || urlParams.get("auto") === "true"
      : true;
    this.state.autoPlay = autoPlay;
    const playbackSpeed = urlParams.get("x");
    const lyricDelayMs = urlParams.get("ms");
    const volume = urlParams.get("vol");
    const hasLoopParam = urlParams.has("loop");
    const loopPlay = hasLoopParam
      ? urlParams.get("loop") === "1" || urlParams.get("loop") === "true"
      : true;
    const currentTime = urlParams.get("t");
    const endTime = urlParams.get("te");
    if (!music) {
      if (this.controlPanel) {
        this.controlPanel.style.width = "320px";
        this.controlPanel.style.right = "20px";
        this.controlPanel.style.opacity = "1";
      }
    }

    if (music && this.musicUrl) {
      this.musicUrl.value = music;
    }
    if (lyric && this.lyricUrl) {
      this.lyricUrl.value = lyric;
    }
    if (cover && this.coverUrl) {
      this.coverUrl.value = cover;
    }
    if (title) {
      if (this.songTitleInput) this.songTitleInput.value = title;
      this.state.songTitle = title;

      if (artist) {
        document.title = `${artist} - ${title} | AMLL Web Player`;
      } else {
        document.title = `${title} | AMLL Web Player`;
      }
    }
    if (artist) {
      if (this.songArtistInput) this.songArtistInput.value = artist;
      this.state.songArtist = artist;
    }

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
        }
      }
    }

    if (lyricDelayMs) {
      const delay = parseInt(lyricDelayMs);
      if (!isNaN(delay)) {
        if (this.lyricDelayInput) {
          this.lyricDelayInput.value = delay.toString();
        }
        this.applyLyricDelay(delay);
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
        }
      }
    }

    if (hasLoopParam) {
      if (this.loopPlayCheckbox) {
        this.loopPlayCheckbox.checked = loopPlay;
        this.state.loopPlay = loopPlay;
      }
    }

    if (music || lyric || cover) {
      this.loadFromURLs().then(() => {
        if (currentTime && this.audio) {
          const time = parseFloat(currentTime);
          if (!isNaN(time) && time >= 0) {
            this.audio.currentTime = time;
            this.state.rangeStartTime = time;
          }
        }

        if (endTime) {
          const te = parseFloat(endTime);
          if (!isNaN(te) && te !== 0 && (!currentTime || parseFloat(currentTime) <= te)) {
            this.state.rangeEndTime = te;
            this.state.isRangeMode = true;
          }
        }

        if (autoPlay && this.audio) {
          this.audio.play().catch((error) => {
            this.showAutoPlayHint();
          });
        }
      });
    }
  }

  public start() {
    this.loadFromURLParams();
    this.loadBackgroundSettings();
    this.startAnimationLoop();
    this.background.resume();

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

  private saveBackgroundSettings() {
    const settings = {
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
      marqueeEnabled: this.state.marqueeEnabled,
      roundedCover: this.state.roundedCover,
      coverRotationSpeed: this.state.coverRotationSpeed,
      backgroundRenderScale: this.state.backgroundRenderScale,
      lyricAlignPosition: this.state.lyricAlignPosition,
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
      backgroundLowFreqVolume: this.state.backgroundLowFreqVolume,
      coverStyle: this.state.coverStyle,
      fftDataRangeMin: this.state.fftDataRangeMin,
      fftDataRangeMax: this.state.fftDataRangeMax,
      posYSpringMass: this.state.posYSpringMass,
      backgroundFPS: this.state.backgroundFPS,
      posYSpringDamping: this.state.posYSpringDamping,
      posYSpringStiffness: this.state.posYSpringStiffness,
      posYSpringSoft: this.state.posYSpringSoft,
      scaleSpringMass: this.state.scaleSpringMass,
      scaleSpringDamping: this.state.scaleSpringDamping,
      scaleSpringStiffness: this.state.scaleSpringStiffness,
      scaleSpringSoft: this.state.scaleSpringSoft,
      controlPointCode: this.controlPointCodeInput?.value || '',
    };
    localStorage.setItem('amll_background_settings', JSON.stringify(settings));
  }

  private loadBackgroundSettings() {
    try {
      const saved = localStorage.getItem('amll_background_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.state.backgroundType = settings.backgroundType || 'fluid';
        this.state.backgroundDynamic = settings.backgroundDynamic !== undefined ? settings.backgroundDynamic : true;
        this.state.backgroundFlowSpeed = settings.backgroundFlowSpeed || 4;
        this.state.backgroundColorMask = settings.backgroundColorMask !== undefined ? settings.backgroundColorMask : true;
        this.state.backgroundMaskColor = settings.backgroundMaskColor || '#FFFFFF';
        this.state.backgroundMaskOpacity = settings.backgroundMaskOpacity !== undefined ? settings.backgroundMaskOpacity : 70;
        this.state.showFPS = settings.showFPS !== undefined ? settings.showFPS : false;
        this.state.coverBlurLevel = settings.coverBlurLevel !== undefined ? settings.coverBlurLevel : 100;
        this.state.invertColors = settings.invertColors !== undefined ? settings.invertColors : false;
        this.state.originalInvertColors = this.state.invertColors;
        this.state.manualDominantColor = settings.manualDominantColor;
        this.state.manualDominantColorLight = settings.manualDominantColorLight;
        this.state.manualDominantColorDark = settings.manualDominantColorDark;
        this.state.roundedCover = settings.roundedCover !== undefined ? settings.roundedCover : 55;
        this.state.marqueeEnabled = settings.marqueeEnabled !== undefined ? settings.marqueeEnabled : true;
        this.state.coverRotationSpeed = settings.coverRotationSpeed !== undefined ? settings.coverRotationSpeed : 0;
        this.state.backgroundRenderScale = settings.backgroundRenderScale !== undefined ? settings.backgroundRenderScale : 1;
        this.state.lyricAlignPosition = settings.lyricAlignPosition !== undefined ? settings.lyricAlignPosition : 0.4;
        this.state.hidePassedLyrics = settings.hidePassedLyrics !== undefined ? settings.hidePassedLyrics : false;
        this.state.enableLyricBlur = settings.enableLyricBlur !== undefined ? settings.enableLyricBlur : true;
        this.state.enableLyricScale = settings.enableLyricScale !== undefined ? settings.enableLyricScale : true;
        this.state.enableLyricSpring = settings.enableLyricSpring !== undefined ? settings.enableLyricSpring : true;
        this.state.wordFadeWidth = settings.wordFadeWidth !== undefined ? settings.wordFadeWidth : 0.50;
        this.state.lyricAlignAnchor = settings.lyricAlignAnchor || 'center';
        this.state.showTranslatedLyric = settings.showTranslatedLyric !== undefined ? settings.showTranslatedLyric : true;
        this.state.showRomanLyric = settings.showRomanLyric !== undefined ? settings.showRomanLyric : true;
        this.state.swapLyricPositions = settings.swapLyricPositions !== undefined ? settings.swapLyricPositions : false;
        this.state.showbgLyric = settings.showbgLyric !== undefined ? settings.showbgLyric : true;
        this.state.swapDuetsPositions = settings.swapDuetsPositions !== undefined ? settings.swapDuetsPositions : false;
        this.state.advanceLyricTiming = settings.advanceLyricTiming !== undefined ? settings.advanceLyricTiming : false;
        this.state.singleLyrics = settings.singleLyrics !== undefined ? settings.singleLyrics : false;
        this.state.backgroundLowFreqVolume = settings.backgroundLowFreqVolume !== undefined ? settings.backgroundLowFreqVolume : 1;
        this.state.coverStyle = settings.coverStyle || 'normal';
        this.state.fftDataRangeMin = settings.fftDataRangeMin || 1;
        this.state.fftDataRangeMax = settings.fftDataRangeMax || 22050;
        this.state.posYSpringMass = settings.posYSpringMass !== undefined ? settings.posYSpringMass : 1;
        this.state.backgroundFPS = settings.backgroundFPS !== undefined ? settings.backgroundFPS : 60;
        this.state.posYSpringDamping = settings.posYSpringDamping !== undefined ? settings.posYSpringDamping : 15;
        this.state.posYSpringStiffness = settings.posYSpringStiffness !== undefined ? settings.posYSpringStiffness : 100;
        this.state.posYSpringSoft = settings.posYSpringSoft !== undefined ? settings.posYSpringSoft : false;
        this.state.scaleSpringMass = settings.scaleSpringMass !== undefined ? settings.scaleSpringMass : 1;
        this.state.scaleSpringDamping = settings.scaleSpringDamping !== undefined ? settings.scaleSpringDamping : 20;
        this.state.scaleSpringStiffness = settings.scaleSpringStiffness !== undefined ? settings.scaleSpringStiffness : 100;
        this.state.scaleSpringSoft = settings.scaleSpringSoft !== undefined ? settings.scaleSpringSoft : false;

        if (settings.controlPointCode && this.controlPointCodeInput) {
          this.controlPointCodeInput.value = settings.controlPointCode;
        }

        this.updateBackgroundUI();
        this.updateBackground();
        this.updateFPSDisplay();
        this.updateRoundedCover();
        this.updateCoverStyle();
        this.updateLyricsDisplay();
        this.updateMarqueeSettings();
        this.lyricPlayer.setAlignPosition(this.state.lyricAlignPosition);
        this.invertColors(this.state.invertColors);
        this.lyricPlayer.setEnableBlur(this.state.enableLyricBlur);
        this.lyricPlayer.setEnableScale(this.state.enableLyricScale);
        this.lyricPlayer.setEnableSpring(this.state.enableLyricSpring);
        this.lyricPlayer.setWordFadeWidth(this.state.wordFadeWidth);
        this.lyricPlayer.setLinePosYSpringParams({ mass: this.state.posYSpringMass, damping: this.state.posYSpringDamping, stiffness: this.state.posYSpringStiffness, soft: this.state.posYSpringSoft });
        this.lyricPlayer.setLineScaleSpringParams({ mass: this.state.scaleSpringMass, damping: this.state.scaleSpringDamping, stiffness: this.state.scaleSpringStiffness, soft: this.state.scaleSpringSoft });
        const dpr = window.devicePixelRatio || 1;
        this.background.setRenderScale(this.state.backgroundRenderScale * dpr);

        if (settings.controlPointCode) {
          this.applyControlPointCode();
        }
      }

      if (this.lyricAlignPositionValue) {
        this.lyricAlignPositionValue.textContent = this.state.lyricAlignPosition.toFixed(1);
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

    if (this.showbgLyricCheckbox) {
      this.showbgLyricCheckbox.checked = this.state.showbgLyric;
    }
    if (this.swapDuetsPositionsCheckbox) {
      this.swapDuetsPositionsCheckbox.checked = this.state.swapDuetsPositions;
    }
    if (this.advanceLyricTimingCheckbox) {
      this.advanceLyricTimingCheckbox.checked = this.state.advanceLyricTiming;
    }

    if (this.fftDataRangeMin && this.fftDataRangeMinValue) {
      this.fftDataRangeMin.value = this.state.fftDataRangeMin.toString();
      this.fftDataRangeMinValue.textContent = `${this.state.fftDataRangeMin}Hz`;
    }

    if (this.fftDataRangeMax && this.fftDataRangeMaxValue) {
      this.fftDataRangeMax.value = this.state.fftDataRangeMax.toString();
      this.fftDataRangeMaxValue.textContent = `${this.state.fftDataRangeMax}Hz`;
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
    this.coverBlurBackground.style.transform = "scale(1.1)";
    this.coverBlurBackground.style.zIndex = "0";
    this.coverBlurBackground.style.display = "none";
  }

  // 更新背景显示
  private applyControlPointCode() {
    if (!this.controlPointCodeInput || !this.background) {
      return;
    }

    const code = this.controlPointCodeInput.value.trim();
    if (!code) {
      try {
        const renderer = this.background['renderer'];
        if (!renderer || !(renderer instanceof MeshGradientRenderer)) {
          return;
        }

        renderer['manualControl'] = false;
        renderer.setAlbum(this.state.coverUrl || "./assets/icon-512x512.png");
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
        renderer.setAlbum(this.state.coverUrl || "./assets/icon-512x512.png");

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

  private updateBackground() {
    const currentCover = this.state.coverUrl || "./assets/icon-512x512.png";

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
      this.invertColors(this.state.invertColors);
    } else if (this.state.backgroundType === 'solid') {
      this.background.getElement().style.display = "none";
      this.coverBlurBackground.style.display = "none";
    } else {
      this.background.getElement().style.display = "block";
      this.coverBlurBackground.style.display = "none";
      this.background.setAlbum(currentCover || "./assets/icon-512x512.png");
      this.background.setStaticMode(!this.state.backgroundDynamic);
      this.background.setFlowSpeed(this.state.backgroundFlowSpeed);
    }

    const dpr = window.devicePixelRatio || 1;
    this.background.setRenderScale(this.state.backgroundRenderScale * dpr);
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

  private applyLyricDelay(value: number) {
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

const player = new WebLyricsPlayer();
(window as any).player = player;
(window as any).globalLyricPlayer = player.getLyricPlayer();
(window as any).globalBackground = player.getBackground();
player.start();
