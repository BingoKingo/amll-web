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
  parseESLyRiC,
  parseLyRiCA2,
  convertToTTML,
} from "./lyric-parsers";
import { isAssFormat, parseAss, assToTTML } from "./ass-parser";
import { isLqeFormat, parseLqe, lqeToTTML } from "./lqe-parser";
import { isLylFormat, parseLyl, lylToTTML } from "./lyl-parser";
import { isSrtFormat, parseSrt, srtToTTML } from "./srt-parser";

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

class DomLyricPlayer extends BaseDomLyricPlayer {
  updateColors() {
    const element = this.getElement();
    if (element) {
      element.style.color = getComputedStyle(document.documentElement).getPropertyValue('--dominant-color-light');
    }
  }
}
import type { spring } from "@applemusic-like-lyrics/core";
type SpringParams = spring.SpringParams;

(window as any).lyrics = lyrics;

// 播放器状态
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
  coverBlurLevel: number;
  backgroundMaskOpacity: number;
  showFPS: boolean;
}

class WebLyricsPlayer {
  private audio: HTMLAudioElement;
  private lyricPlayer: DomLyricPlayer;
  private background: BackgroundRender<PixiRenderer | MeshGradientRenderer>;
  private coverBlurBackground: HTMLDivElement;
  private stats: Stats;
  private state: PlayerState;
  private isInitialized = false;
  private hasLyrics = false;

  // 初始化多语言支持
  private initI18n() {
    // 设置HTML的lang属性
    document.documentElement.lang = getCurrentLanguage();

    // 应用翻译到所有带data-i18n属性的元素
    const i18nElements = document.querySelectorAll("[data-i18n]");
    i18nElements.forEach((el) => {
      const key = el.getAttribute("data-i18n") as any;
      if (key) {
        el.textContent = t(key);
      }
    });

    // 应用翻译到所有带data-i18n-placeholder属性的元素
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
    const musicFile = document.getElementById('musicFile') as HTMLInputElement;
    const lyricFile = document.getElementById('lyricFile') as HTMLInputElement;
    const coverFile = document.getElementById('coverFile') as HTMLInputElement;

    musicFile.addEventListener('change', (e) => {
      const hasFile = (e.target as HTMLInputElement).files?.length > 0;
      const uploadIcon = document.getElementById('musicFileBtn')?.querySelector('.upload-icon') as HTMLElement;
      const uploadedIcon = document.getElementById('musicFileBtn')?.querySelector('.uploaded-icon') as HTMLElement;
      if (uploadIcon && uploadedIcon) {
        uploadIcon.style.display = hasFile ? 'none' : 'block';
        uploadedIcon.style.display = hasFile ? 'block' : 'none';
      }
    });

    lyricFile.addEventListener('change', (e) => {
      const hasFile = (e.target as HTMLInputElement).files?.length > 0;
      const uploadIcon = document.getElementById('lyricFileBtn')?.querySelector('.upload-icon') as HTMLElement;
      const uploadedIcon = document.getElementById('lyricFileBtn')?.querySelector('.uploaded-icon') as HTMLElement;
      if (uploadIcon && uploadedIcon) {
        uploadIcon.style.display = hasFile ? 'none' : 'block';
        uploadedIcon.style.display = hasFile ? 'block' : 'none';
      }
    });

    coverFile.addEventListener('change', (e) => {
      const hasFile = (e.target as HTMLInputElement).files?.length > 0;
      const uploadIcon = document.getElementById('coverFileBtn')?.querySelector('.upload-icon') as HTMLElement;
      const uploadedIcon = document.getElementById('coverFileBtn')?.querySelector('.uploaded-icon') as HTMLElement;
      if (uploadIcon && uploadedIcon) {
        uploadIcon.style.display = hasFile ? 'none' : 'block';
        uploadedIcon.style.display = hasFile ? 'block' : 'none';
      }
    });
  }

  private resetUploadButtons() {
    // 重置上传按钮状态
    const uploadIcons = document.querySelectorAll('.upload-icon') as NodeListOf<HTMLElement>;
    const uploadedIcons = document.querySelectorAll('.uploaded-icon') as NodeListOf<HTMLElement>;

    uploadIcons.forEach((icon) => {
      icon.style.display = 'block';
    });

    uploadedIcons.forEach((icon) => {
      icon.style.display = 'none';
    });
  }
  private colorThief: ColorThief;
  private dominantColor: string = '#222222';

  constructor() {
    this.initI18n();
    this.audio = document.createElement("audio");
    this.audio.volume = 0.5;
    this.audio.preload = "auto";
    this.colorThief = new ColorThief();

    this.lyricPlayer = new DomLyricPlayer();
    if (this.lyricPlayer.element) {
      this.lyricPlayer.element.style.width = "100%";
      this.lyricPlayer.element.style.height = "100%";
      this.lyricPlayer.element.style.zIndex = "3";
      this.lyricPlayer.element.style.position = "relative";
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
      backgroundColorMask: false,
      backgroundMaskColor: '#000000',
      backgroundMaskOpacity: 30,
      showFPS: false,
      coverBlurLevel: 40,
      invertColors: false
    };
    this.hasLyrics = false;

    this.setDefaultColors();
    this.initColors();
    this.background = BackgroundRender.new(MeshGradientRenderer);
    this.coverBlurBackground = document.createElement('div');
    this.stats = new Stats();

    this.initEventListeners();
    this.initBackground();
    this.setupAudioEvents();
    this.setupLyricEvents();
    this.initStats();
    this.initUI();
  }

  private setDefaultColors(): void {
    document.documentElement.style.setProperty('--dominant-color', 'rgb(253 156 155)');
    document.documentElement.style.setProperty('--dominant-color-light', 'rgb(255 207 206)');
    document.documentElement.style.setProperty('--dominant-color-dark', 'rgb(100 3 2)');
  }

  // 为进度条添加滚轮调节功能
  private setupWheelControl(inputId: string, valueId: string, step: number) {
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (!input) return;

    input.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = Math.sign((e as WheelEvent).deltaY) * -1; // 反转滚轮方向
      const currentValue = parseFloat(input.value);
      const min = parseFloat(input.min);
      const max = parseFloat(input.max);
      const newValue = Math.min(max, Math.max(min, currentValue + delta * step));

      input.value = newValue.toString();
      document.getElementById(valueId)!.textContent = `${newValue}${inputId === 'bgFlowSpeed' ? '' : '%'}`;

      input.dispatchEvent(new Event('input'));
    });
  }
  private initGUI() {
    this.gui = new GUI();
    this.gui.hide();
    this.gui.close();

    // 添加背景控制选项
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
      .add(bgControls, "dynamicBackground")
      .name(t("dynamicBackground"))
      .onChange((value: boolean) => {
        (window as any).player.getBackground().setStaticMode(!value);
      });
    bgFolder
      .add(bgControls, "flowSpeed", 0, 10, 0.1)
      .name(t("flowSpeed"))
      .onChange((value: number) => {
        (window as any).player.getBackground().setFlowSpeed(value);
      });
    bgFolder
      .add(bgControls, "toggleBackground")
      .name(t("toggleBackgroundMode"));
  }

  private initEventListeners() {
    this.loadBackgroundSettings();
    this.setupDragAndDropEvents();

    document.getElementById('coverBlurLevel')?.addEventListener('input', (e) => {
      const blurLevel = (e.target as HTMLInputElement).value;
      const mappedBlurLevel = (blurLevel / 100) * 50; // 映射0~100%到0px~50px
      this.coverBlurBackground.style.filter = `blur(${mappedBlurLevel}px)`;
      document.getElementById('coverBlurLevelValue')!.textContent = `${blurLevel}%`;
      this.state.coverBlurLevel = parseFloat(blurLevel);
      this.saveBackgroundSettings();
    });

    this.setupWheelControl('coverBlurLevel', 'coverBlurLevelValue', 1);
    this.setupWheelControl('bgFlowSpeed', 'bgFlowSpeedValue', 0.1);
    this.setupWheelControl('bgMaskOpacity', 'bgMaskOpacityValue', 5);
    this.setupWheelControl('volume', 'volumeValue', 0.05);
    this.setupWheelControl('playbackRate', 'playbackRateValue', 0.1);

    document.getElementById('invertColors')?.addEventListener('change', (e) => {
      this.invertColors((e.target as HTMLInputElement).checked);
      this.state.invertColors = (e.target as HTMLInputElement).checked;
      this.saveBackgroundSettings();
    });

    document
      .getElementById("albumCoverLarge")
      ?.addEventListener("click", () => {
        const coverFileInput = document.getElementById(
          "coverFile"
        ) as HTMLInputElement;
        if (coverFileInput) {
          coverFileInput.click();
        }
      });

    document.getElementById("songTitle")?.addEventListener("click", (e) => {
      const titleElement = e.target as HTMLElement;
      const currentTitle = titleElement.textContent || "";

      titleElement.classList.remove('marquee');

      const input = document.createElement("input");
      input.type = "text";
      input.value = currentTitle;
      input.style.cssText = `
        width: 100%;
        background: transparent;
        border: none;
        color: var(--dominant-color-light);
        font-size: inherit;
        font-weight: inherit;
        text-align: center;
        outline: none;
      `;

      titleElement.textContent = "";
      titleElement.appendChild(input);
      input.focus();

      input.addEventListener("blur", () => {
        this.state.songTitle = input.value;
        titleElement.textContent = input.value;
        const songTitleInput = document.getElementById("songTitleInput") as HTMLInputElement;
        if (songTitleInput) {
          songTitleInput.value = input.value;
        }
        this.updateSongInfo();
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          this.state.songTitle = input.value;
          titleElement.textContent = input.value;
          const songTitleInput = document.getElementById("songTitleInput") as HTMLInputElement;
          if (songTitleInput) {
            songTitleInput.value = input.value;
          }
          this.updateSongInfo();
        }
      });
    });

    document.getElementById("songArtist")?.addEventListener("click", (e) => {
      const artistElement = e.target as HTMLElement;
      const currentArtist = artistElement.textContent || "";

      artistElement.classList.remove('marquee');

      const input = document.createElement("input");
      input.type = "text";
      input.value = currentArtist;
      input.style.cssText = `
        width: 100%;
        background: transparent;
        border: none;
        color: var(--dominant-color-light);
        opacity: 0.8;
        font-size: inherit;
        text-align: center;
        outline: none;
      `;

      artistElement.textContent = "";
      artistElement.appendChild(input);
      input.focus();

      input.addEventListener("blur", () => {
        this.state.songArtist = input.value;
        artistElement.textContent = input.value;
        const songArtistInput = document.getElementById("songArtistInput") as HTMLInputElement;
        if (songArtistInput) {
          songArtistInput.value = input.value;
        }
        this.updateSongInfo();
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          this.state.songArtist = input.value;
          artistElement.textContent = input.value;
          const songArtistInput = document.getElementById("songArtistInput") as HTMLInputElement;
          if (songArtistInput) {
            songArtistInput.value = input.value;
          }
          this.updateSongInfo();
        }
      });
    });

    document
      .getElementById("songInfoTopLeft")
      ?.addEventListener("click", () => {
        this.toggleControlPanel();
      });

    document.getElementById("musicFileBtn")?.addEventListener("click", () => {
      const musicFileInput = document.getElementById("musicFile") as HTMLInputElement;
      if (musicFileInput) {
        musicFileInput.click();
      }
    });

    document.getElementById("lyricFileBtn")?.addEventListener("click", () => {
      const lyricFileInput = document.getElementById("lyricFile") as HTMLInputElement;
      if (lyricFileInput) {
        lyricFileInput.click();
      }
    });

    document.getElementById("coverFileBtn")?.addEventListener("click", () => {
      const coverFileInput = document.getElementById("coverFile") as HTMLInputElement;
      if (coverFileInput) {
        coverFileInput.click();
      }
    });

    // 文件上传事件
    document.getElementById("musicFile")?.addEventListener("change", (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.loadMusicFromFile(file);
      }
    });

    document.getElementById("lyricFile")?.addEventListener("change", (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.loadLyricFromFile(file);
      }
    });

    document.getElementById("coverFile")?.addEventListener("change", (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.loadCoverFromFile(file);
      }
    });

    // 歌曲信息输入事件
    document
      .getElementById("songTitleInput")
      ?.addEventListener("input", (e) => {
        this.state.songTitle = (e.target as HTMLInputElement).value;
        this.updateSongInfo();
      });

    document
      .getElementById("songArtistInput")
      ?.addEventListener("input", (e) => {
        this.state.songArtist = (e.target as HTMLInputElement).value;
        this.updateSongInfo();
      });

    // 循环播放开关
    document.getElementById("loopPlay")?.addEventListener("change", (e) => {
      this.state.loopPlay = (e.target as HTMLInputElement).checked;
    });

    const playbackRateControl = document.getElementById(
      "playbackRate"
    ) as HTMLInputElement;
    const playbackRateValue = document.getElementById("playbackRateValue");

    if (playbackRateControl && playbackRateValue) {
      playbackRateControl.addEventListener("input", (e) => {
        const rate = parseFloat((e.target as HTMLInputElement).value);
        if (!isNaN(rate)) {
          this.audio.playbackRate = rate;
          playbackRateValue.textContent = rate.toFixed(2) + "x";
          this.updatePlaybackRateIcon(rate);
        }
      });
      const initialRate = parseFloat(playbackRateControl.value);
      this.updatePlaybackRateIcon(initialRate);
    }

    const volumeControl = document.getElementById(
      "volumeControl"
    ) as HTMLInputElement;
    const volumeValue = document.getElementById("volumeValue");

    if (volumeControl && volumeValue) {
      volumeControl.value = (this.audio.volume * 100).toString();
      volumeValue.textContent = Math.round(this.audio.volume * 100) + "%";
      this.updateVolumeIcon(Math.round(this.audio.volume * 100));

      volumeControl.addEventListener("input", (e) => {
        const volume = parseInt((e.target as HTMLInputElement).value);
        if (!isNaN(volume)) {
          this.audio.volume = volume / 100;
          volumeValue.textContent = volume + "%";
          this.updateVolumeIcon(volume);
        }
      });
      volumeControl.addEventListener("wheel", (e) => {
        e.preventDefault();
        const step = 5;
        const currentValue = parseInt(volumeControl.value);
        let newValue = currentValue;

        if (e.deltaY < 0) {
          newValue = Math.min(100, currentValue + step);
        } else {
          newValue = Math.max(0, currentValue - step);
        }

        if (newValue !== currentValue) {
          volumeControl.value = newValue.toString();
          this.audio.volume = newValue / 100;
          volumeValue.textContent = newValue + "%";
          this.updateVolumeIcon(newValue);
        }
      }, { passive: false });
    }

    // 歌词延迟调整
    const lyricDelayInput = document.getElementById(
      "lyricDelayInput"
    ) as HTMLInputElement;
    if (lyricDelayInput) {
      lyricDelayInput.addEventListener("input", (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        if (!isNaN(value)) {
          this.state.lyricDelay = value;
        }
      });

      lyricDelayInput.addEventListener(
        "wheel",
        (e) => {
          e.preventDefault();
          const delta = e.deltaY < 0 ? 100 : -100;
          const newValue = parseInt(lyricDelayInput.value || "0") + delta;
          lyricDelayInput.value = newValue.toString();
          this.state.lyricDelay = newValue;
        },
        { passive: false }
      );

      lyricDelayInput.addEventListener("keydown", (e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          const delta = e.key === "ArrowUp" ? 100 : -100;
          const newValue = parseInt(lyricDelayInput.value || "0") + delta;
          lyricDelayInput.value = newValue.toString();
          this.state.lyricDelay = newValue;
        }
      });
    }

    document.getElementById('bgDynamic')?.addEventListener('change', (e) => {
      this.state.backgroundDynamic = (e.target as HTMLInputElement).checked;
      if (this.state.backgroundType === 'fluid') {
        this.background.setStaticMode(!this.state.backgroundDynamic);
      }
      this.saveBackgroundSettings();
    });

    document.getElementById('bgFlowSpeed')?.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.state.backgroundFlowSpeed = value;
      // 只有在AMLL背景模式下才应用流动速度
      if (this.state.backgroundType === 'fluid') {
        this.background.setFlowSpeed(value);
      }
      document.getElementById('bgFlowSpeedValue')!.textContent = value.toFixed(1);
      this.saveBackgroundSettings();
    });

    // 颜色蒙版控制事件
    document.getElementById('bgColorMask')?.addEventListener('change', (e) => {
      this.state.backgroundColorMask = (e.target as HTMLInputElement).checked;
      this.updateBackground();
      this.saveBackgroundSettings();
    });

    document.getElementById('bgMaskColor')?.addEventListener('input', (e) => {
      this.state.backgroundMaskColor = (e.target as HTMLInputElement).value;
      this.updateBackground();
      this.saveBackgroundSettings();
    });

    document.getElementById('bgMaskOpacity')?.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.state.backgroundMaskOpacity = value;
      this.updateBackground();
      document.getElementById('bgMaskOpacityValue')!.textContent = value + '%';
      this.saveBackgroundSettings();
    });

    // FPS显示控制
    document.getElementById('showFPS')?.addEventListener('change', (e) => {
      this.state.showFPS = (e.target as HTMLInputElement).checked;
      this.updateFPSDisplay();
      this.saveBackgroundSettings();
    });

    // 按钮事件
    document.getElementById("loadFromUrl")?.addEventListener("click", () => {
      this.loadFromURLs();
    });

    document.getElementById("musicUrl")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.loadFromURLs();
      }
    });

    document.getElementById("lyricUrl")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.loadFromURLs();
      }
    });

    document.getElementById("coverUrl")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.loadFromURLs();
      }
    });

    document.getElementById("loadFiles")?.addEventListener("click", () => {
      this.loadFromFiles();
    });

    document.getElementById("resetPlayer")?.addEventListener("click", () => {
      this.resetPlayer();
    });

    document.getElementById("playPauseBtn")?.addEventListener("click", () => {
      if (this.audio.src) {
        this.togglePlayPause();
      } else {
        this.openFilePicker();
      }
    });

    const fullscreenButton = document.getElementById("fullscreenBtn");
    if (fullscreenButton) {
      let fullscreenButtonLongPressTimer: number;
      let isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

      fullscreenButton.addEventListener("click", () => {
        this.toggleFullscreen();
      });

      fullscreenButton.addEventListener("mousedown", () => {
        fullscreenButtonLongPressTimer = window.setTimeout(() => {
          const lyricFileInput = document.getElementById(
            "lyricFile"
          ) as HTMLInputElement;
          if (lyricFileInput) lyricFileInput.click();
        }, 3000);
      });

      fullscreenButton.addEventListener("mouseup", () => {
        clearTimeout(fullscreenButtonLongPressTimer);
      });

      fullscreenButton.addEventListener("mouseleave", () => {
        clearTimeout(fullscreenButtonLongPressTimer);
      });

      fullscreenButton.addEventListener("contextmenu", (e) => {
        e.preventDefault(); // 阻止默认右键菜单
        const lyricFileInput = document.getElementById(
          "lyricFile"
        ) as HTMLInputElement;
        if (lyricFileInput) lyricFileInput.click();
        return false; // 为Safari返回false
      });

      fullscreenButton.addEventListener("touchstart", (e) => {
        let isLongPress = false;
        fullscreenButtonLongPressTimer = window.setTimeout(() => {
          isLongPress = true;
          const lyricFileInput = document.getElementById(
            "lyricFile"
          ) as HTMLInputElement;
          if (lyricFileInput) lyricFileInput.click();
        }, 3000);
      }, { passive: true });

      fullscreenButton.addEventListener("touchend", () => {
        clearTimeout(fullscreenButtonLongPressTimer);
      }, { passive: true });

      fullscreenButton.addEventListener("touchcancel", () => {
        clearTimeout(fullscreenButtonLongPressTimer);
      }, { passive: true });
    }

    document.getElementById("toggleControls")?.addEventListener("click", () => {
      this.toggleControlPanel();
    });

    document.getElementById("progressBar")?.addEventListener("click", (e) => {
      this.seekToPosition(e);
    });

    document.getElementById("progressBar")?.addEventListener("wheel", (e) => {
      e.preventDefault();
      const seekAmount = e.deltaY > 0 ? -1 : 1;
      if (this.audio && this.state.duration > 0) {
        const newTime = Math.max(
          0,
          Math.min(this.state.duration, this.audio.currentTime + seekAmount)
        );
        this.audio.currentTime = newTime;
        this.state.currentTime = newTime;
        this.updateProgress();
        this.updateTimeDisplay();
      }
    }, { passive: false });

    document.addEventListener("keydown", (e) => {
      this.handleKeyboard(e);
    });

    this.setupTouchEvents();

    window.addEventListener("resize", () => {
      this.adjustLyricPosition();
    });

    document.addEventListener("fullscreenchange", () => {
      const enterIcon = document.querySelector('.fullscreen-enter') as HTMLElement;
      const exitIcon = document.querySelector('.fullscreen-exit') as HTMLElement;

      if (document.fullscreenElement) {
        if (enterIcon && exitIcon) {
          enterIcon.style.display = 'none';
          exitIcon.style.display = 'inline';
        }
      } else {
        if (enterIcon && exitIcon) {
          enterIcon.style.display = 'inline';
          exitIcon.style.display = 'none';
        }
      }
    });

    window
      .matchMedia("(orientation: portrait)")
      .addEventListener("change", () => {
        this.adjustLyricPosition();
      });
  }

  private initBackground() {
    this.background = BackgroundRender.new(MeshGradientRenderer);
    this.background.setFPS(144);
    this.background.setRenderScale(1);
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

    const backgroundStyleSelect = document.getElementById("backgroundStyle") as HTMLSelectElement;
    if (backgroundStyleSelect) {
      backgroundStyleSelect.addEventListener("change", (e) => {
        const value = (e.target as HTMLSelectElement).value;
        this.switchBackgroundStyle(value);
      });

      backgroundStyleSelect.addEventListener("keydown", (e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          const delta = e.key === "ArrowUp" ? -1 : 1;
          const newIndex = Math.max(0, Math.min(backgroundStyleSelect.options.length - 1, backgroundStyleSelect.selectedIndex + delta));
          backgroundStyleSelect.selectedIndex = newIndex;
          this.switchBackgroundStyle(backgroundStyleSelect.value);
        }
      });

      backgroundStyleSelect.addEventListener("wheel", (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 1 : -1;
        const newIndex = Math.max(0, Math.min(backgroundStyleSelect.options.length - 1, backgroundStyleSelect.selectedIndex + delta));
        backgroundStyleSelect.selectedIndex = newIndex;
        this.switchBackgroundStyle(backgroundStyleSelect.value);
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

    this.originalDark = dark || 'rgb(100 3 2)';
    this.originalLight = light || 'rgb(255 207 206)';
    this.originalDominant = dominant || 'rgb(253 156 155)';

    this.isColorsInitialized = true;
  }

  private invertColors(checked: boolean) {
    const invertCheckbox = document.getElementById("invertColors") as HTMLInputElement;
    if (!invertCheckbox) return;

    if (!this.isColorsInitialized) {
      this.initColors();
    }

    if (checked) {
      document.documentElement.style.setProperty('--dominant-color-dark', this.originalDominant);
      document.documentElement.style.setProperty('--dominant-color-light', this.originalDark);
      document.documentElement.style.setProperty('--dominant-color', this.originalLight);
    } else {
      document.documentElement.style.setProperty('--dominant-color-dark', this.originalDark);
      document.documentElement.style.setProperty('--dominant-color-light', this.originalLight);
      document.documentElement.style.setProperty('--dominant-color', this.originalDominant);
    }
    if (this.lyricPlayer) this.lyricPlayer.updateColors();
    this.applyDominantColorAsCSSVariable();
  }

  private switchBackgroundStyle(style: string) {
    if (!this.background) return;

    const player = document.getElementById("amll-lyric-player");
    const fluidDesc = document.getElementById("fluid-desc");
    const coverDesc = document.getElementById("cover-desc");
    const solidDesc = document.getElementById("solid-desc");

    if (fluidDesc) fluidDesc.style.display = style === "fluid" ? "block" : "none";
    if (coverDesc) coverDesc.style.display = style === "cover" ? "block" : "none";
    if (solidDesc) solidDesc.style.display = style === "solid" ? "block" : "none";

    switch (style) {
      case "fluid":
        this.background.setFlowSpeed(4);
        if (player) player.style.background = "";
        this.state.backgroundType = 'fluid';
        this.updateBackground();
        this.updateBackgroundUI();
        this.saveBackgroundSettings();
        break;
      case "cover":
        this.background.setAlbum(this.state.coverUrl || "./assets/icon-512x512.png");
        if (player) player.style.background = "";
        this.state.backgroundType = 'cover';
        this.updateBackground();
        this.updateBackgroundUI();
        this.saveBackgroundSettings();
        break;
      case "solid":
        this.background.setAlbum("");
        if (player) player.style.background = "transparent";
        this.state.backgroundType = 'solid';
        this.updateBackground();
        this.updateBackgroundUI();
        this.saveBackgroundSettings();
        const solidInvertCheckbox = document.getElementById("invertColors") as HTMLInputElement;
        if (solidInvertCheckbox) {
          solidInvertCheckbox.onchange = () => {
            this.applyDominantColorAsCSSVariable();
          };
          if (solidInvertCheckbox.checked) {
            this.applyDominantColorAsCSSVariable();
          }
        }
        break;
      default:
        break;
    }
  }

  private setupAudioEvents() {
    this.audio.addEventListener("loadedmetadata", () => {
      this.state.duration = this.audio.duration;
      this.updateTimeDisplay();
      this.updateMediaSessionMetadata();

      if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
        setTimeout(() => {
          this.updateMediaSessionMetadata();
        }, 100);
      }
    });

    this.audio.addEventListener("timeupdate", () => {
      this.state.currentTime = this.audio.currentTime;
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

      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
      }
    });

    this.audio.addEventListener("pause", () => {
      this.state.isPlaying = false;
      this.updatePlayButton();
      this.lyricPlayer.pause();

      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
      }
    });

    this.audio.addEventListener("ended", () => {
      this.state.isPlaying = false;
      this.updatePlayButton();
      if (this.state.loopPlay) {
        this.audio.currentTime = 0;
        this.audio.play();
      }

      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "none";
      }
    });

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
    const lyricsPanel = document.getElementById("lyricsPanel");
    if (!lyricsPanel) return;

    const oldHint = document.getElementById("lyricAreaHint");
    if (oldHint) oldHint.remove();

    if (!this.hasLyrics) {
      const hintElement = document.createElement("div");
      hintElement.id = "lyricAreaHint";
      hintElement.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: var(--dominant-color-light);
        font-size: 16px;
        text-align: center;
        pointer-events: auto;
        z-index: 3;
        width: 80%;
        padding: 30px;
        opacity: 0.7;
        transition: opacity 0.3s ease;
        cursor: pointer;
      `;
      hintElement.innerHTML = `
        <div style="margin-bottom: 15px; font-size: 22px; font-weight: 500;">${t(
        "clickToAddLyrics"
      )}</div>
        <div style="opacity: 0.6; line-height: 1.5;">*.ass, *.lqe, *.lrc, *.lyl, *lys, *.qrc, *.spl, *.srt, *.ttml, *.yrc</div>
      `;
      // <div style="opacity: 0.6; line-height: 1.5;">*.alrc, *.ass, *.json, *.krc, *.lqe, *.lrc, *.lyl, *.lys, *.qrc, *.srt, *.ttml, *.yrc</div>

      hintElement.addEventListener("click", (e) => {
        e.stopPropagation();
        const lyricFileInput = document.getElementById(
          "lyricFile"
        ) as HTMLInputElement;
        if (lyricFileInput) lyricFileInput.click();
      });

      hintElement.addEventListener("touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const lyricFileInput = document.getElementById(
          "lyricFile"
        ) as HTMLInputElement;
        if (lyricFileInput) lyricFileInput.click();
      }, { passive: false });

      lyricsPanel.appendChild(hintElement);
    }
  }

  private setupDragAndDropEvents() {
    const albumCover = document.getElementById("albumCoverLarge");
    const lyricsPanel = document.getElementById("lyricsPanel");

    if (albumCover) {
      albumCover.addEventListener("dragover", (e) => {
        e.preventDefault();
        albumCover.style.opacity = "0.7";
      });

      albumCover.addEventListener("dragleave", () => {
        albumCover.style.opacity = "1";
      });

      albumCover.addEventListener("drop", (e) => {
        e.preventDefault();
        albumCover.style.opacity = "1";

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

    if (lyricsPanel) {
      lyricsPanel.addEventListener("dragover", (e) => {
        e.preventDefault();
        lyricsPanel.style.border = "2px dashed rgba(255, 255, 255, 0.5)";
      });

      lyricsPanel.addEventListener("dragleave", () => {
        lyricsPanel.style.border = "none";
      });

      lyricsPanel.addEventListener("drop", (e) => {
        e.preventDefault();
        lyricsPanel.style.border = "none";

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
    const fileInput = document.getElementById(inputId) as HTMLInputElement;
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
    fileDisplay.style = `max-width: 100%;`;
    if (file instanceof File) {
      fileDisplay.textContent = `${file.name}`;
    } else {
      try {
        // Try to parse as URL first
        const url = new URL(file);
        const pathname = url.pathname;
        const filename = pathname.split('/').pop() || file;
        fileDisplay.textContent = `${filename}`;
      } catch {
        // If URL parsing fails, treat it as a direct display text
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
    const player = document.getElementById("player");
    const lyricsPanel = document.getElementById("lyricsPanel");

    if (lyricsPanel && this.lyricPlayer.element) {
      lyricsPanel.appendChild(this.lyricPlayer.element);
    }

    this.updateLyricAreaHint();

    const playButton = document.getElementById("playPauseBtn");
    if (playButton) {
      let playButtonLongPressTimer: number;

      playButton.addEventListener("click", (e) => {
        if (!this.state.musicUrl && !this.audio.src) {
          e.preventDefault();
          const musicFileInput = document.getElementById(
            "musicFile"
          ) as HTMLInputElement;
          if (musicFileInput) musicFileInput.click();
          return;
        }
      });

      let isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

      playButton.addEventListener("mousedown", () => {
        playButtonLongPressTimer = window.setTimeout(() => {
          const musicFileInput = document.getElementById(
            "musicFile"
          ) as HTMLInputElement;
          if (musicFileInput) musicFileInput.click();
        }, 3000);
      });

      playButton.addEventListener("mouseup", () => {
        clearTimeout(playButtonLongPressTimer);
      });

      playButton.addEventListener("mouseleave", () => {
        clearTimeout(playButtonLongPressTimer);
      });

      playButton.addEventListener("contextmenu", (e) => {
        e.preventDefault(); // 阻止默认右键菜单
        const musicFileInput = document.getElementById(
          "musicFile"
        ) as HTMLInputElement;
        if (musicFileInput) musicFileInput.click();
        return false; // 为Safari返回false
      });

      playButton.addEventListener("touchstart", (e) => {
        const touchStartTime = Date.now();

        let isLongPress = false;
        playButtonLongPressTimer = window.setTimeout(() => {
          isLongPress = true;
          const musicFileInput = document.getElementById(
            "musicFile"
          ) as HTMLInputElement;
          if (musicFileInput) musicFileInput.click();
        }, 3000);
      }, { passive: true });

      playButton.addEventListener("touchend", () => {
        clearTimeout(playButtonLongPressTimer);
      }, { passive: true });

      playButton.addEventListener("touchcancel", () => {
        clearTimeout(playButtonLongPressTimer);
      }, { passive: true });
    }

    if (player) {
      player.appendChild(this.audio);
      player.appendChild(this.background.getElement());
      player.appendChild(this.coverBlurBackground);

      if (lyricsPanel) {
        lyricsPanel.appendChild(this.lyricPlayer.getElement());

        lyricsPanel.addEventListener("click", (e) => {
          if (!this.hasLyrics) {
            const lyricFileInput = document.getElementById(
              "lyricFile"
            ) as HTMLInputElement;
            if (lyricFileInput) lyricFileInput.click();
          }
        });

        lyricsPanel.addEventListener("touchend", (e) => {
          if (!this.hasLyrics) {
            e.preventDefault();
            const lyricFileInput = document.getElementById(
              "lyricFile"
            ) as HTMLInputElement;
            if (lyricFileInput) lyricFileInput.click();
          }
        }, { passive: false });
      } else {
        // 如果找不到歌词面板，则添加到播放器容器
        player.appendChild(this.lyricPlayer.getElement());
      }
    }

    this.initCoverBlurBackground();
    this.updateBackground();
    // 设置默认封面
    this.background.setAlbum("./assets/icon-512x512.png");
    this.setDefaultColors();

    // 确保控制面板默认隐藏
    const controlPanel = document.getElementById("controlPanel");
    if (controlPanel) {
      controlPanel.style.display = "none";
    }

    this.adjustLyricPosition();
    this.updateAlbumSidePanel();
  }

  private async loadMusicFromFile(file: File) {
    try {
      // 检查文件类型，iOS Safari 可能会上传不同类型的音频文件
      const isAudioType = file.type.startsWith("audio/");
      const isValidExtension = /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name);

      if (!isAudioType && !isValidExtension) {
        this.showStatus(t("invalidMusicFile"), true);
        return;
      }

      const url = URL.createObjectURL(file);
      this.state.musicUrl = url;
      this.audio.crossOrigin = "anonymous"; // 允许跨域访问音频文件
      this.audio.src = url;
      this.audio.load();

      await this.parseAudioMetadata(file);

      this.updateMediaSessionMetadata();

      const controlPanel = document.getElementById("controlPanel");
      if (controlPanel) controlPanel.style.display = "none";

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
        this.showStatus(t("invalidLyricFile"), true);
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
      this.background.setAlbum(url);
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
    let musicUrl = (document.getElementById("musicUrl") as HTMLInputElement)
      ?.value;
    let lyricUrl = (document.getElementById("lyricUrl") as HTMLInputElement)
      ?.value;
    let coverUrl = (document.getElementById("coverUrl") as HTMLInputElement)
      ?.value;

    // 如果输入框为空，尝试从URL参数获取
    const urlParams = new URLSearchParams(window.location.search);

    if (!musicUrl) {
      const urlMusic = urlParams.get("music");
      if (urlMusic) {
        musicUrl = urlMusic;
        (document.getElementById("musicUrl") as HTMLInputElement).value =
          musicUrl;
      }
    }

    if (!lyricUrl) {
      const urlLyric = urlParams.get("lyric");
      if (urlLyric) {
        lyricUrl = urlLyric;
        (document.getElementById("lyricUrl") as HTMLInputElement).value =
          lyricUrl;
      }
    }

    if (!coverUrl) {
      const urlCover = urlParams.get("cover");
      if (urlCover) {
        coverUrl = urlCover;
        (document.getElementById("coverUrl") as HTMLInputElement).value =
          coverUrl;
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
        const playbackRateControl = document.getElementById(
          "playbackRate"
        ) as HTMLInputElement;
        const playbackRateValue = document.getElementById("playbackRateValue");
        if (playbackRateControl) {
          playbackRateControl.value = speed.toString();
          if (this.audio) {
            this.audio.playbackRate = speed;
          }
          if (playbackRateValue) {
            playbackRateValue.textContent = speed.toFixed(2) + "x";
          }
          this.updatePlaybackRateIcon(speed);
        }
      }
    }

    if (lyricDelayMs) {
      const delay = parseInt(lyricDelayMs);
      if (!isNaN(delay)) {
        const lyricDelayInput = document.getElementById(
          "lyricDelayInput"
        ) as HTMLInputElement;
        if (lyricDelayInput) {
          lyricDelayInput.value = delay.toString();
          this.state.lyricDelay = delay;
        }
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

        const volumeControl = document.getElementById(
          "volumeControl"
        ) as HTMLInputElement;
        const volumeValue = document.getElementById("volumeValue");
        if (volumeControl) {
          volumeControl.value = Math.round(vol * 100).toString();
          if (this.audio) {
            this.audio.volume = vol;
          }
          if (volumeValue) {
            volumeValue.textContent = Math.round(vol * 100) + "%";
          }
          this.updateVolumeIcon(Math.round(vol * 100));
        }
      }
    }

    if (urlParams.has("loop")) {
      const loopPlayCheckbox = document.getElementById(
        "loopPlay"
      ) as HTMLInputElement;
      if (loopPlayCheckbox) {
        loopPlayCheckbox.checked = loopPlay;
        this.state.loopPlay = loopPlay;
      }
    }

    const songTitleInput = document.getElementById(
      "songTitleInput"
    ) as HTMLInputElement;
    const songArtistInput = document.getElementById(
      "songArtistInput"
    ) as HTMLInputElement;

    if (!songTitleInput.value) {
      const urlTitle = urlParams.get("title");
      if (urlTitle) {
        songTitleInput.value = urlTitle;
        this.state.songTitle = urlTitle;
      }
    }

    if (!songArtistInput.value) {
      const urlArtist = urlParams.get("artist");
      if (urlArtist) {
        songArtistInput.value = urlArtist;
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

      this.updateMediaSessionMetadata();
      this.updateFileInputDisplay("musicFile", musicUrl);
    }

    if (lyricUrl) {
      this.state.lyricUrl = lyricUrl;
      try {
        const response = await fetch(lyricUrl);
        const text = await response.text();

        const isESFormat = isESLyRiCFormat(text);
        const isA2Format = isLyRiCA2Format(text);

        // 根据 URL 后缀或内容格式决定如何处理
        if (lyricUrl.endsWith(".lrc")) {
          if (isESFormat || isA2Format) {
            // 对于特殊格式的 .lrc 文件，使用对应的解析器
            await this.loadLyricContent(text, lyricUrl);
          } else {
            // 标准 LRC 格式
            await this.loadLyricContent(text, lyricUrl);
          }
        } else {
          // 对于其他扩展名，尝试检测格式
          await this.loadLyricContent(text, lyricUrl);
        }
        this.updateFileInputDisplay("lyricFile", lyricUrl);
      } catch (error) {
        this.showStatus(t("lyricsUrlLoadFailed"), true);
      }
    }

    if (coverUrl) {
      this.state.coverUrl = coverUrl;
      this.updateBackground();
      this.background.setAlbum(coverUrl);
      await this.extractAndProcessCoverColor(coverUrl);
      this.applyDominantColorAsCSSVariable();
      this.updateFileInputDisplay("coverFile", coverUrl);
    }

    this.updateSongInfo();

    const controlPanel = document.getElementById("controlPanel");
    if (controlPanel) controlPanel.style.display = "none";

    const title = this.state.songTitle;
    const artist = this.state.songArtist;
    if (title) {
      if (artist) {
        document.title = `${artist} - ${title} | AMLL Web Player`;
      } else {
        document.title = `${ title } | AMLL Web Player`;
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
    const musicFile = (document.getElementById("musicFile") as HTMLInputElement)
      ?.files?.[0];
    const lyricFile = (document.getElementById("lyricFile") as HTMLInputElement)
      ?.files?.[0];
    const coverFile = (document.getElementById("coverFile") as HTMLInputElement)
      ?.files?.[0];

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

  private async loadLyricContent(content: string, filename: string) {
    try {
      let lines: LyricLine[] = [];

      const isESFormat = isESLyRiCFormat(content);
      const isA2Format = isLyRiCA2Format(content);

      if (filename.endsWith(".ttml")) {
        lines = parseTTML(content).lines.map(this.mapTTMLLyric);
      } else if (filename.endsWith(".ass")) {
        // 解析 ASS 格式
        const ttmlContent = assToTTML(content);
        // 使用 TTML 解析器解析
        lines = parseTTML(ttmlContent).lines.map(this.mapTTMLLyric);
      } else if (filename.endsWith(".lrc")) {
        // 如果是 .lrc 文件，先检查是否为特殊格式
        if (isESFormat) {
          // 解析 ESLyRiC 格式
          const rawLines = parseESLyRiC(content);
          // 转换为 TTML 格式
          const ttmlContent = convertToTTML(rawLines);
          // 使用 TTML 解析器解析
          lines = parseTTML(ttmlContent).lines.map(this.mapTTMLLyric);
        } else if (isA2Format) {
          // 解析 LyRiC A2 格式
          const rawLines = parseLyRiCA2(content);
          // 转换为 TTML 格式
          const ttmlContent = convertToTTML(rawLines);
          // 使用 TTML 解析器解析
          lines = parseTTML(ttmlContent).lines.map(this.mapTTMLLyric);
        } else {
          // 标准 LRC 格式
          lines = parseLrc(content).map(this.mapLyric);
        }
      } else if (filename.endsWith(".yrc")) {
        lines = parseYrc(content).map(this.mapLyric);
      } else if (filename.endsWith(".lys")) {
        lines = parseLys(content).map(this.mapLyric);
      } else if (filename.endsWith(".qrc")) {
        lines = parseQrc(content).map(this.mapLyric);
      } else if (filename.endsWith(".lqe")) {
        // 检查是否为 Lyricify Syllable 格式
        if (content.includes('[lyrics: format@Lyricify Syllable]')) {
          lines = parseLys(content).map(this.mapLyric);
        } else {
          // 解析 LQE 格式
          const ttmlContent = lqeToTTML(content);
          // 使用 TTML 解析器解析
          lines = parseTTML(ttmlContent).lines.map(this.mapTTMLLyric);
        }
      } else if (filename.endsWith(".srt")) {
        // 解析 SRT 格式（先转 TTML）
        const ttmlContent = srtToTTML(content);
        lines = parseTTML(ttmlContent).lines.map(this.mapTTMLLyric);
      } else if (filename.endsWith(".lyl")) {
        // 解析 LYL 格式
        const ttmlContent = lylToTTML(content);
        // 使用 TTML 解析器解析
        lines = parseTTML(ttmlContent).lines.map(this.mapTTMLLyric);
      } else {
        // 对于未知扩展名的文件，尝试检测格式
        if (isESFormat) {
          const rawLines = parseESLyRiC(content);
          const ttmlContent = convertToTTML(rawLines);
          lines = parseTTML(ttmlContent).lines.map(this.mapTTMLLyric);
        } else if (isA2Format) {
          const rawLines = parseLyRiCA2(content);
          const ttmlContent = convertToTTML(rawLines);
          lines = parseTTML(ttmlContent).lines.map(this.mapTTMLLyric);
        } else if (isSrtFormat(content)) {
          // 内容检测为 SRT
          const ttmlContent = srtToTTML(content);
          lines = parseTTML(ttmlContent).lines.map(this.mapTTMLLyric);
        } else if (isLqeFormat(content)) {
          // 尝试作为 LQE 格式解析
          const ttmlContent = lqeToTTML(content);
          lines = parseTTML(ttmlContent).lines.map(this.mapTTMLLyric);
        } else if (isAssFormat(content)) {
          // 尝试作为 ASS 格式解析
          const ttmlContent = assToTTML(content);
          lines = parseTTML(ttmlContent).lines.map(this.mapTTMLLyric);
        } else if (isLylFormat(content)) {
          // 尝试作为 LYL 格式解析
          const ttmlContent = lylToTTML(content);
          lines = parseTTML(ttmlContent).lines.map(this.mapTTMLLyric);
        } else {
          // 尝试作为标准 LRC 解析
          lines = parseLrc(content).map(this.mapLyric);
        }
      }

      this.lyricPlayer.setLyricLines(lines);
      this.hasLyrics = lines.length > 0;

      const lyricsPanel = document.getElementById("lyricsPanel");
      if (lyricsPanel && this.hasLyrics) {
        const oldHint = document.getElementById("lyricAreaHint");
        if (oldHint) oldHint.remove();
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

  private togglePlayPause() {
    if (this.audio.paused) {
      this.audio.play();
    } else {
      this.audio.pause();
    }
  }

  private updatePlayButton() {
    const btn = document.getElementById("playPauseBtn");
    const landscapeBtn = document.getElementById("landscapePlayBtn");

    if (btn) {
      btn.innerHTML = this.state.isPlaying
        ? '<svg aria-hidden="true" width="1em" height="1em" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M5 2a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H5Zm8 0a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-2Z" fill="currentColor"></path></svg>'
        : '<svg aria-hidden="true" width="1em" height="1em" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M17.22 8.68a1.5 1.5 0 0 1 0 2.63l-10 5.5A1.5 1.5 0 0 1 5 15.5v-11A1.5 1.5 0 0 1 7.22 3.2l10 5.5Z" fill="currentColor"></path></svg>';
    }
  }

  private updateProgress() {
    const progressFill = document.getElementById("progressFill");
    const landscapeProgressFill = document.querySelector('.landscape-progress-fill') as HTMLElement;
    if (this.state.duration > 0) {
      const percentage = (this.state.currentTime / this.state.duration) * 100;
      if (progressFill) {
        progressFill.style.width = `${percentage}%`;
      } else {
        progressFill.style.width = "0%";
      }
      if (landscapeProgressFill) {
        landscapeProgressFill.style.width = `${percentage}%`;
      }
    }
  }

  private updateTimeDisplay() {
    const timeDisplay = document.getElementById("timeDisplay");
    const landscapeTimeDisplay = document.querySelector(".landscape-time") as HTMLElement;

    const currentTime = this.formatTime(this.state.currentTime);
    const duration = this.formatTime(this.state.duration);
    const timeText = `${currentTime} / ${duration}`;

    if (timeDisplay) {
      timeDisplay.textContent = timeText;
    }

    if (landscapeTimeDisplay) {
      landscapeTimeDisplay.textContent = timeText;
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }

  private seekToPosition(e: MouseEvent) {
    const progressBar = document.getElementById("progressBar");
    if (progressBar && this.state.duration > 0) {
      const rect = progressBar.getBoundingClientRect();
      const percentage = (e.clientX - rect.left) / rect.width;
      const newTime = percentage * this.state.duration;
      this.audio.currentTime = newTime;
    }
  }

  private toggleFullscreen() {
    const enterIcon = document.querySelector('.fullscreen-enter') as HTMLElement;
    const exitIcon = document.querySelector('.fullscreen-exit') as HTMLElement;

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      if (enterIcon && exitIcon) {
        enterIcon.style.display = 'none';
        exitIcon.style.display = 'inline';
      }
    } else {
      document.exitFullscreen();
      if (enterIcon && exitIcon) {
        enterIcon.style.display = 'inline';
        exitIcon.style.display = 'none';
      }
    }
  }

  private toggleControlPanel() {
    const panel = document.getElementById("controlPanel");
    if (panel) {
      panel.style.display = panel.style.display === "none" ? "block" : "none";
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
        break;
      case "ArrowRight":
        this.audio.currentTime = Math.min(
          this.audio.duration,
          this.audio.currentTime + 10
        );
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
          const showFPSCheckbox = document.getElementById('showFPS') as HTMLInputElement;
          if (showFPSCheckbox) {
            showFPSCheckbox.checked = this.state.showFPS;
          }
          this.saveBackgroundSettings();
          this.gui.domElement.style.display =
            this.gui.domElement.style.display === "none" ? "block" : "none";
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

    this.hasLyrics = false;
    this.lyricPlayer.setLyricLines([]);
    this.updateLyricAreaHint();
    this.updateFileInputDisplay("musicFile", "");
    this.updateFileInputDisplay("coverFile", "");
    this.updateFileInputDisplay("lyricFile", "");

    this.background.setAlbum("./assets/icon-512x512.png");
    this.setDefaultColors();

    this.state.lyricUrl = "";
    this.state.songTitle = "";
    this.state.songArtist = "";
    this.state.coverUrl = "";
    document.title = "AMLL Web Player";

    const songCover = document.getElementById(
      "songCoverTopLeft"
    ) as HTMLImageElement;
    if (songCover) {
      songCover.src = "./assets/icon-512x512.png";
      songCover.style.display = "none";
    }

    const albumCoverLarge = document.getElementById(
      "albumCoverLarge"
    ) as HTMLImageElement;
    if (albumCoverLarge) {
      albumCoverLarge.src = "./assets/icon-512x512.png";
    }

    const songTitleTopLeft = document.getElementById("songTitleTopLeft");
    if (songTitleTopLeft) {
      songTitleTopLeft.textContent = t("title");
    }

    const songArtistTopLeft = document.getElementById("songArtistTopLeft");
    if (songArtistTopLeft) {
      songArtistTopLeft.textContent = t("artist");
    }

    const songTitle = document.getElementById("songTitle");
    if (songTitle) {
      songTitle.textContent = t("title");
    }

    const songArtist = document.getElementById("songArtist");
    if (songArtist) {
      songArtist.textContent = t("artist");
    }

    const songTitleInput = document.getElementById(
      "songTitleInput"
    ) as HTMLInputElement;
    if (songTitleInput) {
      songTitleInput.value = "";
    }

    const songArtistInput = document.getElementById(
      "songArtistInput"
    ) as HTMLInputElement;
    if (songArtistInput) {
      songArtistInput.value = "";
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

    const loopPlayCheckbox = document.getElementById(
      "loopPlay"
    ) as HTMLInputElement;
    if (loopPlayCheckbox) {
      loopPlayCheckbox.checked = true;
    }

    const playbackRateControl = document.getElementById(
      "playbackRate"
    ) as HTMLInputElement;
    const playbackRateValue = document.getElementById("playbackRateValue");
    if (playbackRateControl) {
      playbackRateControl.value = "1.00";
      this.audio.playbackRate = 1.0;
      if (playbackRateValue) {
        playbackRateValue.textContent = "1.00x";
      }
      this.updatePlaybackRateIcon(1.0);
    }

    const volumeControl = document.getElementById(
      "volumeControl"
    ) as HTMLInputElement;
    const volumeValue = document.getElementById("volumeValue");
    if (volumeControl) {
      volumeControl.value = "50";
      this.audio.volume = 0.5;
      if (volumeValue) {
        volumeValue.textContent = "50%";
      }
      this.updateVolumeIcon(50);
    }

    const showFPSCheckbox = document.getElementById('showFPS') as HTMLInputElement;
    if (showFPSCheckbox) {
      showFPSCheckbox.checked = false;
    }

    const controlPanel = document.getElementById("controlPanel");
    if (controlPanel) controlPanel.style.display = "block";
    inputs.forEach((id) => {
      const input = document.getElementById(id) as HTMLInputElement;
      if (input) {
        if (input.type === "file") {
          input.value = "";
        } else {
          input.value = "";
        }
      }
    });

    const songInfoTopLeft = document.getElementById("songInfoTopLeft");
    if (songInfoTopLeft) {
      songInfoTopLeft.style.display = "none";
    }

    this.adjustLyricPosition();

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
      backgroundColorMask: false,
      backgroundMaskColor: '#000000',
      backgroundMaskOpacity: 30,
      showFPS: false,
      coverBlurLevel: 0,
      invertColors: false
    };

    // 清除localStorage中的BackgroundSettings
    localStorage.removeItem('amll_background_settings');
    
    // 更新背景UI和显示
    this.updateBackgroundUI();
    this.updateBackground();
    this.updateFPSDisplay();

    this.updatePlayButton();
    this.updateProgress();
    this.updateTimeDisplay();
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
        this.audio.currentTime = Math.max(this.audio.currentTime - skipTime, 0);
      });

      navigator.mediaSession.setActionHandler("seekforward", (details) => {
        const skipTime = details.seekOffset || 10;
        this.audio.currentTime = Math.min(
          this.audio.currentTime + skipTime,
          this.audio.duration
        );
      });

      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime !== undefined) {
          this.audio.currentTime = details.seekTime;
        }
      });

      navigator.mediaSession.setActionHandler("previoustrack", () => {
        this.audio.currentTime = 0;
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

  private updateSongInfo() {
    const songInfoTopLeft = document.getElementById("songInfoTopLeft");
    const songCover = document.getElementById(
      "songCoverTopLeft"
    ) as HTMLImageElement;
    const songTitle = document.getElementById("songTitleTopLeft");
    const songArtist = document.getElementById("songArtistTopLeft");
    const landscapeCover = document.querySelector('.landscape-cover') as HTMLElement;

    if (songInfoTopLeft && songCover && songTitle && songArtist) {
      if (this.state.coverUrl) {
        songCover.src = this.state.coverUrl;
        songCover.style.display = "block";
        if (landscapeCover) {
          landscapeCover.style.backgroundImage = `url(${this.state.coverUrl})`;
        }
      } else {
        songCover.style.display = "none";
        if (landscapeCover) {
          landscapeCover.style.backgroundImage = "none";
        }
      }

      songTitle.textContent = this.state.songTitle || t("title");
      songArtist.textContent = this.state.songArtist || t("artist");
      songInfoTopLeft.style.display = "block";
    }

    this.updateAlbumSidePanel();
    this.adjustLyricPosition();
    this.updateMediaSessionMetadata();
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
        const songInfoTopLeft = document.getElementById("songInfoTopLeft");
        if (songInfoTopLeft && songInfoTopLeft.style.display !== "none") {
          lyricElement.style.paddingTop = "120px";
        } else {
          lyricElement.style.paddingTop = "20px";
        }
      }
      this.updateLyricAreaHint();
    }
  }

  private updateAlbumSidePanel() {
    const albumCoverLarge = document.getElementById(
      "albumCoverLarge"
    ) as HTMLImageElement;
    const songTitle = document.getElementById("songTitle");
    const songArtist = document.getElementById("songArtist");

    if (albumCoverLarge && songTitle && songArtist) {
      if (this.state.coverUrl) {
        albumCoverLarge.src = this.state.coverUrl;
      } else {
        albumCoverLarge.src = "./assets/icon-512x512.png";
      }
      songTitle.textContent = this.state.songTitle || t("title");
      songArtist.textContent = this.state.songArtist || t("artist");
    }
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
      console.log("jsmediatags库:", jsmediatags);

      if (jsmediatags) {
        console.log("Calling jsmediatags.read...");
        jsmediatags.read(file, {
          onSuccess: (tag: any) => {
            console.log("Audio metadata parsed successfully, full data:", tag);
            console.log("tags对象:", tag.tags);

            let hasMetadata = false;

            // 提取歌曲信息 - 优先使用TIT2(歌曲名)而不是TALB(专辑名)
            if (tag.tags && tag.tags.title) {
              this.state.songTitle = tag.tags.title;
              (
                document.getElementById("songTitleInput") as HTMLInputElement
              ).value = tag.tags.title;
              console.log("Extracted song title:", tag.tags.title);
              hasMetadata = true;
            } else {
              console.log("No song title found");
            }

            if (tag.tags && tag.tags.artist) {
              this.state.songArtist = tag.tags.artist;
              (
                document.getElementById("songArtistInput") as HTMLInputElement
              ).value = tag.tags.artist;
              console.log("Extracted song artist:", tag.tags.artist);
              hasMetadata = true;
            } else {
              console.log("No song artist found");
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
              this.background.setAlbum(base64);
              this.extractAndProcessCoverColor(base64);
              this.applyDominantColorAsCSSVariable();
              this.updateBackground();
              this.updateFileInputDisplay("coverFile", "Embedded in audio file (base64 encoded)");
              console.log(
                "Extracted cover image, format:",
                format,
                "size:",
                data.length
              );
              hasMetadata = true;
            } else {
              console.log("No cover image found");
            }

            this.updateSongInfo();
            this.updateMediaSessionMetadata();

            if (hasMetadata) {
              this.showStatus(t("metadataParseSuccess"));
            } else {
              console.log("No metadata found, using fallback method");
              this.parseAudioMetadataFallback(file);
            }
          },
          onError: (error: any) => {
            console.log("Audio metadata parsing failed:", error);
            this.showStatus(t("metadataParseFailed"), true);
            // 尝试备用方案
            this.parseAudioMetadataFallback(file);
          },
        });
      } else {
        console.log("jsmediatags library not loaded");
        this.showStatus(t("metadataLibNotLoaded"), true);
        // 尝试备用方案
        this.parseAudioMetadataFallback(file);
      }
    } catch (error) {
      console.log("Audio metadata parsing error:", error);
      this.showStatus(t("metadataParseError"), true);
      // 尝试备用方案
      this.parseAudioMetadataFallback(file);
    }
  }

  private async parseAudioMetadataFallback(file: File) {
    try {
      console.log("Using fallback method to parse file:", file.name);

      // 备用方案：从文件名提取信息
      const fileName = file.name;
      const nameWithoutExt = fileName.replace(/\.[^/.]+$/, ""); // 移除扩展名

      // 尝试从文件名解析歌曲信息（格式：艺术家 - 歌曲名）
      const parts = nameWithoutExt.split(" - ");
      if (parts.length >= 2) {
        this.state.songArtist = parts[0].trim();
        this.state.songTitle = parts[1].trim();

        (document.getElementById("songArtistInput") as HTMLInputElement).value =
          this.state.songArtist;
        (document.getElementById("songTitleInput") as HTMLInputElement).value =
          this.state.songTitle;

        console.log("Parsing from filename:", {
          artist: this.state.songArtist,
          title: this.state.songTitle,
        });
        this.updateSongInfo();
        this.updateMediaSessionMetadata();
        this.showStatus(t("extractedSongInfo"));
      } else {
        // 尝试其他分隔符
        const altParts = nameWithoutExt.split(" – "); // 使用长破折号
        if (altParts.length >= 2) {
          this.state.songArtist = altParts[0].trim();
          this.state.songTitle = altParts[1].trim();

          (
            document.getElementById("songArtistInput") as HTMLInputElement
          ).value = this.state.songArtist;
          (
            document.getElementById("songTitleInput") as HTMLInputElement
          ).value = this.state.songTitle;

          console.log("Parsing from filename (long dash):", {
            artist: this.state.songArtist,
            title: this.state.songTitle,
          });
          this.updateSongInfo();
          this.updateMediaSessionMetadata();
          this.showStatus(t("extractedSongInfo"));
        } else {
          // 如果无法解析，使用文件名作为标题
          this.state.songTitle = nameWithoutExt;
          (
            document.getElementById("songTitleInput") as HTMLInputElement
          ).value = this.state.songTitle;
          console.log("Using filename as title:", this.state.songTitle);
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
    const status = document.getElementById("status");
    const statusText = document.getElementById("statusText");

    if (status && statusText) {
      statusText.textContent = message;
      status.style.display = "block";

      if (isError) {
        status.style.background = "rgba(255, 0, 0, 0.9)";
      } else {
        status.style.background = "var(--dominant-color-dark)";
      }

      setTimeout(() => {
        status.style.display = "none";
      }, 3000);
    }
  }

  // 辅助函数：为元素添加长按和右键功能（兼容Safari）
  private addLongPressAndRightClickHandler(
    element: HTMLElement,
    callback: () => void,
    longPressTime = 3000
  ) {
    if (!element) return;

    let timer: number;
    let isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    // 鼠标事件
    element.addEventListener("mousedown", () => {
      timer = window.setTimeout(callback, longPressTime);
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
      callback();
      return false; // 为Safari返回false
    });

    // 触摸事件
    element.addEventListener("touchstart", (e) => {
      // 使用标记来跟踪是否是长按
      let isLongPress = false;
      timer = window.setTimeout(() => {
        isLongPress = true;
        callback();
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
    // 创建自动播放提示
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
      z-index: 10;
      text-align: center;
      max-width: 300px;
      font-size: 14px;
    `;
    hint.innerHTML = `
      <div style="margin-bottom: 15px; font-size: 16px; font-weight: bold;">[INFO] 自动播放提示</div>
      <div style="margin-bottom: 15px;">由于浏览器安全策略，需要用户交互才能自动播放音频。</div>
      <div style="margin-bottom: 15px;">请点击播放按钮开始播放。</div>
      <button onclick="this.parentElement.remove()" style="
        background: #007bff;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 5px;
        cursor: pointer;
      ">知道了</button>
    `;
    document.body.appendChild(hint);

    // 5秒后自动消失
    setTimeout(() => {
      if (hint.parentElement) {
        hint.remove();
      }
    }, 3000);
  }

  // 从URL参数加载
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
      : true; // 未提供时默认开启自动播放

    const playbackSpeed = urlParams.get("x");
    const lyricDelayMs = urlParams.get("ms");
    const volume = urlParams.get("vol");
    const hasLoopParam = urlParams.has("loop");
    const loopPlay = hasLoopParam
      ? urlParams.get("loop") === "1" || urlParams.get("loop") === "true"
      : true; // 未提供时默认勾选循环
    const currentTime = urlParams.get("t");

    // 如果没有音乐URL，显示控制面板
    if (!music) {
      const controlPanel = document.getElementById("controlPanel");
      if (controlPanel) controlPanel.style.display = "block";
    }

    if (music) {
      (document.getElementById("musicUrl") as HTMLInputElement).value = music;
    }
    if (lyric) {
      (document.getElementById("lyricUrl") as HTMLInputElement).value = lyric;
    }
    if (cover) {
      (document.getElementById("coverUrl") as HTMLInputElement).value = cover;
    }
    if (title) {
      (document.getElementById("songTitleInput") as HTMLInputElement).value =
        title;
      this.state.songTitle = title;

      // 更新页面标题为"艺术家 - 标题"格式
      if (artist) {
        document.title = `${artist} - ${title} | AMLL Web Player`;
      } else {
        document.title = `${title} | AMLL Web Player`;
      }
    }
    if (artist) {
      (document.getElementById("songArtistInput") as HTMLInputElement).value =
        artist;
      this.state.songArtist = artist;
    }

    if (playbackSpeed) {
      const speed = parseFloat(playbackSpeed);
      if (!isNaN(speed) && speed > 0) {
        const playbackRateControl = document.getElementById(
          "playbackRate"
        ) as HTMLInputElement;
        const playbackRateValue = document.getElementById("playbackRateValue");
        if (playbackRateControl) {
          playbackRateControl.value = speed.toString();
          if (this.audio) {
            this.audio.playbackRate = speed;
          }
          if (playbackRateValue) {
            playbackRateValue.textContent = speed.toFixed(2) + "x";
          }
        }
      }
    }

    if (lyricDelayMs) {
      const delay = parseInt(lyricDelayMs);
      if (!isNaN(delay)) {
        const lyricDelayInput = document.getElementById(
          "lyricDelayInput"
        ) as HTMLInputElement;
        if (lyricDelayInput) {
          lyricDelayInput.value = delay.toString();
          this.state.lyricDelay = delay;
        }
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

        const volumeControl = document.getElementById(
          "volumeControl"
        ) as HTMLInputElement;
        const volumeValue = document.getElementById("volumeValue");
        if (volumeControl) {
          volumeControl.value = Math.round(vol * 100).toString();
          if (this.audio) {
            this.audio.volume = vol;
          }
          if (volumeValue) {
            volumeValue.textContent = Math.round(vol * 100) + "%";
          }
        }
      }
    }

    if (hasLoopParam) {
      const loopPlayCheckbox = document.getElementById(
        "loopPlay"
      ) as HTMLInputElement;
      if (loopPlayCheckbox) {
        loopPlayCheckbox.checked = loopPlay;
        this.state.loopPlay = loopPlay;
      }
    }

    // 如果有URL参数，自动加载
    if (music || lyric || cover) {
      this.loadFromURLs().then(() => {
        if (currentTime && this.audio) {
          const time = parseFloat(currentTime);
          if (!isNaN(time) && time >= 0) {
            this.audio.currentTime = time;
          }
        }

        // 如果启用自动播放（默认开启，除非显式关闭），则开始播放
        if (autoPlay && this.audio) {
          console.log("Auto-playing music");
          this.audio.play().catch((error) => {
            console.log("Auto-play failed, requires user interaction:", error);
            // 显示提示信息
            this.showAutoPlayHint();
          });
        }
      });
    }
  }

  // 启动播放器
  public start() {
    this.loadFromURLParams();
    this.startAnimationLoop();
    // 确保背景开始播放
    this.background.resume();
    this.isInitialized = true;
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

  public getLyricPlayer(): DomLyricPlayer {
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
      this.applyDominantColorAsCSSVariable();
      console.log('封面取色:', this.dominantColor);
    } catch (error) {
      console.error('封面取色失败:', error);
      this.dominantColor = '#808080';
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

  private applyDominantColorAsCSSVariable(): void {
    const invertCheckbox = document.getElementById("invertColors") as HTMLInputElement;
    const isInverted = invertCheckbox?.checked;

    if (isInverted) {
      document.documentElement.style.setProperty('--dominant-color', this.lightenColor(this.dominantColor, 0.2));
      document.documentElement.style.setProperty('--dominant-color-light', this.darkenColor(this.dominantColor, 0.6));
      document.documentElement.style.setProperty('--dominant-color-dark', this.dominantColor);
    } else {
      document.documentElement.style.setProperty('--dominant-color', this.dominantColor);
      document.documentElement.style.setProperty('--dominant-color-light', this.lightenColor(this.dominantColor, 0.2));
      document.documentElement.style.setProperty('--dominant-color-dark', this.darkenColor(this.dominantColor, 0.6));
    }
    if (this.lyricPlayer) this.lyricPlayer.updateColors();
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
      invertColors: this.state.invertColors
    };
    localStorage.setItem('amll_background_settings', JSON.stringify(settings));
  }

  private loadBackgroundSettings() {
    try {
      const saved = localStorage.getItem('amll_background_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.state.backgroundType = settings.backgroundType || 'current';
        this.state.backgroundDynamic = settings.backgroundDynamic !== undefined ? settings.backgroundDynamic : true;
        this.state.backgroundFlowSpeed = settings.backgroundFlowSpeed || 4;
        this.state.backgroundColorMask = settings.backgroundColorMask !== undefined ? settings.backgroundColorMask : false;
        this.state.backgroundMaskColor = settings.backgroundMaskColor || '#000000';
        this.state.backgroundMaskOpacity = settings.backgroundMaskOpacity !== undefined ? settings.backgroundMaskOpacity : 30;
        this.state.showFPS = settings.showFPS !== undefined ? settings.showFPS : false;
        this.state.coverBlurLevel = settings.coverBlurLevel !== undefined ? settings.coverBlurLevel : 40;
        this.state.invertColors = settings.invertColors !== undefined ? settings.invertColors : false;

        this.updateBackgroundUI();
        this.updateBackground();
        this.updateFPSDisplay();
      }
    } catch (error) {
      console.log('加载背景设置失败:', error);
    }
  }

  private updateBackgroundUI() {
    const bgDynamic = document.getElementById('bgDynamic') as HTMLInputElement;
    const bgFlowSpeed = document.getElementById('bgFlowSpeed') as HTMLInputElement;
    const bgFlowSpeedValue = document.getElementById('bgFlowSpeedValue');
    const bgColorMask = document.getElementById('bgColorMask') as HTMLInputElement;
    const bgMaskColor = document.getElementById('bgMaskColor') as HTMLInputElement;
    const bgMaskOpacity = document.getElementById('bgMaskOpacity') as HTMLInputElement;
    const bgMaskOpacityValue = document.getElementById('bgMaskOpacityValue');
    const showFPSCheckbox = document.getElementById('showFPS') as HTMLInputElement;
    const backgroundStyleSelect = document.getElementById('backgroundStyle') as HTMLSelectElement;
    const coverBlurLevel = document.getElementById('coverBlurLevel') as HTMLInputElement;
    const coverBlurLevelValue = document.getElementById('coverBlurLevelValue');
    const invertColorsCheckbox = document.getElementById('invertColors') as HTMLInputElement;
    const fluidDesc = document.getElementById('fluid-desc');
    const coverDesc = document.getElementById('cover-desc');
    const solidDesc = document.getElementById('solid-desc');

    if (bgDynamic) bgDynamic.checked = this.state.backgroundDynamic;
    if (bgFlowSpeed) bgFlowSpeed.value = this.state.backgroundFlowSpeed.toString();
    if (bgFlowSpeedValue) bgFlowSpeedValue.textContent = this.state.backgroundFlowSpeed.toFixed(1);
    if (bgColorMask) bgColorMask.checked = this.state.backgroundColorMask;
    if (bgMaskColor) bgMaskColor.value = this.state.backgroundMaskColor;
    if (bgMaskOpacity) bgMaskOpacity.value = this.state.backgroundMaskOpacity.toString();
    if (bgMaskOpacityValue) bgMaskOpacityValue.textContent = this.state.backgroundMaskOpacity + '%';
    if (showFPSCheckbox) showFPSCheckbox.checked = this.state.showFPS;
    if (backgroundStyleSelect) backgroundStyleSelect.value = this.state.backgroundType;
    if (coverBlurLevel) coverBlurLevel.value = this.state.coverBlurLevel.toString();
    if (coverBlurLevelValue) coverBlurLevelValue.textContent = this.state.coverBlurLevel + '%';
    if (invertColorsCheckbox) invertColorsCheckbox.checked = this.state.invertColors;
    if (fluidDesc) fluidDesc.style.display = this.state.backgroundType === 'fluid' ? 'block' : 'none';
    if (coverDesc) coverDesc.style.display = this.state.backgroundType === 'cover' ? 'block' : 'none';
    if (solidDesc) solidDesc.style.display = this.state.backgroundType === 'solid' ? 'block' : 'none';
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

      const mappedBlurLevel = (this.state.coverBlurLevel / 100) * 50; // 映射0~100%到0px~50px
      this.coverBlurBackground.style.filter = `blur(${mappedBlurLevel}px)`;
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

    this.invertColors(this.state.invertColors);
  }

  private updateFPSDisplay() {
    if (this.stats) {
      this.stats.dom.style.display = this.state.showFPS ? 'block' : 'none';
    }
  }

  private updatePlaybackRateIcon(rate: number) {
    const speedIcons = document.querySelectorAll('#speed-icons svg');
    speedIcons.forEach((icon) => {
      (icon as HTMLElement).style.display = 'none';
    });

    let targetIcon: HTMLElement | null = null;
    if (rate < 0.75) {
      targetIcon = document.querySelector('.speed-low');
    } else if (rate >= 0.76 && rate <= 1.5) {
      targetIcon = document.querySelector('.speed-medium');
    } else {
      targetIcon = document.querySelector('.speed-high');
    }

    if (targetIcon) {
      targetIcon.style.display = 'block';
    }
  }

  private updateVolumeIcon(volume: number) {
    const volumeIcons = document.querySelectorAll('#volume-icons svg');
    volumeIcons.forEach((icon) => {
      (icon as HTMLElement).style.display = 'none';
    });

    let targetIcon: HTMLElement | null = null;
    if (volume === 0) {
      targetIcon = document.querySelector('.volume-off');
    } else if (volume > 0 && volume <= 35) {
      targetIcon = document.querySelector('.volume-low');
    } else if (volume > 35 && volume <= 65) {
      targetIcon = document.querySelector('.volume-medium');
    } else {
      targetIcon = document.querySelector('.volume-high');
    }

    if (targetIcon) {
      targetIcon.style.display = 'block';
    }
  }
}

const player = new WebLyricsPlayer();
(window as any).player = player;
(window as any).globalLyricPlayer = player.getLyricPlayer();
(window as any).globalBackground = player.getBackground();
player.start();