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
import { getCurrentLanguage, getTranslations, t } from "./i18n";
import GUI from "lil-gui";
import Stats from "stats.js";
import type { LyricLine } from "@applemusic-like-lyrics/core";
import {
  BackgroundRender,
  MeshGradientRenderer,
  PixiRenderer,
} from "@applemusic-like-lyrics/core";
import {
  DomLyricPlayer,
  type LyricLineMouseEvent,
} from "@applemusic-like-lyrics/core";
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
}

class WebLyricsPlayer {
  private audio: HTMLAudioElement;
  private lyricPlayer: DomLyricPlayer;
  private background: BackgroundRender<PixiRenderer | MeshGradientRenderer>;
  private gui: GUI;
  private stats: Stats;
  private state: PlayerState;
  private isInitialized = false;
  private currentLanguage = 'zh-CN';
  private hasLyrics = false; // 添加一个变量来跟踪是否有歌词
  private translations = {
    'zh-CN': {
      'unknownSong': '未知歌曲',
      'unknownArtist': '未知作者',
      'musicFile': '音乐文件',
      'musicUrl': '或输入音乐URL',
      'lyricsFile': '歌词文件',
      'lyricsUrl': '或输入歌词URL',
      'coverImage': '封面图片',
      'coverUrl': '或输入封面URL',
      'songInfo': '歌曲信息',
      'title': '标题',
      'artist': '艺术家',
      'loopPlay': '循环播放',
      'loadFromUrl': '从URL加载',
      'loadFiles': '加载文件',
      'resetPlayer': '重置播放器',
      'language': '语言'
    },
    'en-US': {
      'unknownSong': 'Unknown Song',
      'unknownArtist': 'Unknown Artist',
      'musicFile': 'Music File',
      'musicUrl': 'or enter music URL',
      'lyricsFile': 'Lyrics File',
      'lyricsUrl': 'or enter lyrics URL',
      'coverImage': 'Cover Image',
      'coverUrl': 'or enter cover URL',
      'songInfo': 'Song Information',
      'title': 'Title',
      'artist': 'Artist',
      'loopPlay': 'Loop Playback',
      'loadFromUrl': 'Load from URL',
      'loadFiles': 'Load Files',
      'resetPlayer': 'Reset Player',
      'language': 'Language'
    },
    'ja-JP': {
      'unknownSong': '不明な曲',
      'unknownArtist': '不明なアーティスト',
      'musicFile': '音楽ファイル',
      'musicUrl': 'または音楽URLを入力',
      'lyricsFile': '歌詞ファイル',
      'lyricsUrl': 'または歌詞URLを入力',
      'coverImage': 'カバー画像',
      'coverUrl': 'またはカバーURLを入力',
      'songInfo': '曲情報',
      'title': 'タイトル',
      'artist': 'アーティスト',
      'loopPlay': 'ループ再生',
      'loadFromUrl': 'URLから読み込む',
      'loadFiles': 'ファイルを読み込む',
      'resetPlayer': 'プレーヤーをリセット',
      'language': '言語'
    }
  };

  // 初始化多语言支持
  private initI18n() {
    // 设置HTML的lang属性
    document.documentElement.lang = getCurrentLanguage();

    // 应用翻译到所有带data-i18n属性的元素
    const i18nElements = document.querySelectorAll('[data-i18n]');
    i18nElements.forEach(el => {
      const key = el.getAttribute('data-i18n') as any;
      if (key) {
        el.textContent = t(key);
      }
    });

    // 应用翻译到所有带data-i18n-placeholder属性的元素
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    placeholderElements.forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder') as any;
      if (key) {
        (el as HTMLInputElement).placeholder = t(key);
      }
    });
  }

  constructor() {
    // 初始化多语言支持
    this.initI18n();
    this.audio = document.createElement("audio");
    this.audio.volume = 0.18;
    this.audio.preload = "auto";

    this.lyricPlayer = new DomLyricPlayer();
    this.state = {
      musicUrl: "",
      lyricUrl: "",
      coverUrl: "",
      songTitle: "",
      songArtist: "",
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      loopPlay: true
    };
    this.hasLyrics = false; // 初始化时没有歌词

    this.initGUI();
    this.initEventListeners();
    this.initBackground();
    this.setupAudioEvents();
    this.setupLyricEvents();
    this.initStats();
    this.initUI();
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
        (window as any).player.getBackground().setStaticMode(!this.dynamicBackground);
      }
    };

    const bgFolder = this.gui.addFolder(t('backgroundControl'));
    bgFolder.add(bgControls, 'dynamicBackground').name(t('dynamicBackground')).onChange((value: boolean) => {
      (window as any).player.getBackground().setStaticMode(!value);
    });
    bgFolder.add(bgControls, 'flowSpeed', 0, 10, 0.1).name(t('flowSpeed')).onChange((value: number) => {
      (window as any).player.getBackground().setFlowSpeed(value);
    });
    bgFolder.add(bgControls, 'toggleBackground').name(t('toggleBackgroundMode'));
  }

  private initEventListeners() {
    // 设置拖拽相关事件
    this.setupDragAndDropEvents();
    
    // 专辑封面点击事件 - 替换封面
    document.getElementById('albumCoverLarge')?.addEventListener('click', () => {
      const coverFileInput = document.getElementById('coverFile') as HTMLInputElement;
      if (coverFileInput) {
        coverFileInput.click();
      }
    });

    // 标题点击事件 - 显示输入框
    document.getElementById('songTitle')?.addEventListener('click', (e) => {
      const titleElement = e.target as HTMLElement;
      const currentTitle = titleElement.textContent || '';

      const input = document.createElement('input');
      input.type = 'text';
      input.value = currentTitle;
      input.style.cssText = `
        width: 100%;
        background: transparent;
        border: none;
        color: white;
        font-size: inherit;
        font-weight: inherit;
        text-align: center;
        outline: none;
      `;

      titleElement.textContent = '';
      titleElement.appendChild(input);
      input.focus();

      input.addEventListener('blur', () => {
        this.state.songTitle = input.value;
        titleElement.textContent = input.value;
        this.updateSongInfo();
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.state.songTitle = input.value;
          titleElement.textContent = input.value;
          this.updateSongInfo();
        }
      });
    });

    // 艺术家点击事件 - 显示输入框
    document.getElementById('songArtist')?.addEventListener('click', (e) => {
      const artistElement = e.target as HTMLElement;
      const currentArtist = artistElement.textContent || '';

      const input = document.createElement('input');
      input.type = 'text';
      input.value = currentArtist;
      input.style.cssText = `
        width: 100%;
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.8);
        font-size: inherit;
        text-align: center;
        outline: none;
      `;

      artistElement.textContent = '';
      artistElement.appendChild(input);
      input.focus();

      input.addEventListener('blur', () => {
        this.state.songArtist = input.value;
        artistElement.textContent = input.value;
        this.updateSongInfo();
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.state.songArtist = input.value;
          artistElement.textContent = input.value;
          this.updateSongInfo();
        }
      });
    });

    // 小型歌曲信息点击事件（移动设备模式）
    document.getElementById('songInfoTopLeft')?.addEventListener('click', () => {
      this.toggleControlPanel();
    });

    // 文件上传事件
    document.getElementById('musicFile')?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.loadMusicFromFile(file);
      }
    });

    document.getElementById('lyricFile')?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.loadLyricFromFile(file);
      }
    });

    document.getElementById('coverFile')?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.loadCoverFromFile(file);
      }
    });

    // 歌曲信息输入事件
    document.getElementById('songTitleInput')?.addEventListener('input', (e) => {
      this.state.songTitle = (e.target as HTMLInputElement).value;
      this.updateSongInfo();
    });

    document.getElementById('songArtistInput')?.addEventListener('input', (e) => {
      this.state.songArtist = (e.target as HTMLInputElement).value;
      this.updateSongInfo();
    });

    // 循环播放开关
    document.getElementById('loopPlay')?.addEventListener('change', (e) => {
      this.state.loopPlay = (e.target as HTMLInputElement).checked;
    });

    // 按钮事件
    document.getElementById('loadFromUrl')?.addEventListener('click', () => {
      this.loadFromURLs();
    });

    document.getElementById('loadFiles')?.addEventListener('click', () => {
      this.loadFromFiles();
    });

    document.getElementById('resetPlayer')?.addEventListener('click', () => {
      this.resetPlayer();
    });

    document.getElementById('playPauseBtn')?.addEventListener('click', () => {
      this.togglePlayPause();
    });

    const fullscreenButton = document.getElementById('fullscreenBtn');
    if (fullscreenButton) {
      let fullscreenButtonLongPressTimer: number;
      let isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

      fullscreenButton.addEventListener('click', () => {
        this.toggleFullscreen();
      });

      // 鼠标按下事件
      fullscreenButton.addEventListener('mousedown', () => {
        fullscreenButtonLongPressTimer = window.setTimeout(() => {
          const lyricFileInput = document.getElementById('lyricFile') as HTMLInputElement;
          if (lyricFileInput) lyricFileInput.click();
        }, 3000);
      });

      fullscreenButton.addEventListener('mouseup', () => {
        clearTimeout(fullscreenButtonLongPressTimer);
      });

      fullscreenButton.addEventListener('mouseleave', () => {
        clearTimeout(fullscreenButtonLongPressTimer);
      });
      
      // 添加右键点击事件，触发与长按相同的功能
      fullscreenButton.addEventListener('contextmenu', (e) => {
        e.preventDefault(); // 阻止默认右键菜单
        const lyricFileInput = document.getElementById('lyricFile') as HTMLInputElement;
        if (lyricFileInput) lyricFileInput.click();
        return false; // 为Safari返回false
      });

      // 添加触摸事件支持（特别是针对Safari）
      fullscreenButton.addEventListener('touchstart', (e) => {
        // 使用标记来跟踪是否是长按
        let isLongPress = false;
        fullscreenButtonLongPressTimer = window.setTimeout(() => {
          isLongPress = true;
          const lyricFileInput = document.getElementById('lyricFile') as HTMLInputElement;
          if (lyricFileInput) lyricFileInput.click();
        }, 3000);
        
        // 不再阻止默认事件，允许正常点击
      });

      fullscreenButton.addEventListener('touchend', () => {
        clearTimeout(fullscreenButtonLongPressTimer);
      });

      fullscreenButton.addEventListener('touchcancel', () => {
        clearTimeout(fullscreenButtonLongPressTimer);
      });
    };

    document.getElementById('toggleControls')?.addEventListener('click', () => {
      this.toggleControlPanel();
    });

    // 进度条事件
    document.getElementById('progressBar')?.addEventListener('click', (e) => {
      this.seekToPosition(e);
    });

    // 键盘事件
    document.addEventListener('keydown', (e) => {
      this.handleKeyboard(e);
    });

    // 触摸事件（调试面板）
    this.setupTouchEvents();

    // 窗口大小变化事件
    window.addEventListener('resize', () => {
      this.adjustLyricPosition();
    });

    // 屏幕方向变化事件
    window.matchMedia('(orientation: portrait)').addEventListener('change', () => {
      this.adjustLyricPosition();
    });
  }

  private initBackground() {
    this.background = BackgroundRender.new(MeshGradientRenderer);
    this.background.setFPS(144);
    this.background.setRenderScale(0.5); // 设置渲染倍率为0.5
    this.background.setStaticMode(false); // 默认开启动态背景
    this.background.setFlowSpeed(4); // 设置流动速度为4
    this.background.getElement().style.position = "absolute";
    this.background.getElement().style.top = "0";
    this.background.getElement().style.left = "0";
    this.background.getElement().style.width = "100%";
    this.background.getElement().style.height = "100%";
  }

  private setupAudioEvents() {
    this.audio.addEventListener('loadedmetadata', () => {
      this.state.duration = this.audio.duration;
      this.updateTimeDisplay();

      // 更新媒体会话元数据
      this.updateMediaSessionMetadata();

      // iOS Safari 兼容性处理
      if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
        // 确保媒体会话元数据在 iOS 上正确更新
        setTimeout(() => {
          this.updateMediaSessionMetadata();
        }, 100);
      }
    });

    this.audio.addEventListener('timeupdate', () => {
      this.state.currentTime = this.audio.currentTime;
      this.updateProgress();
      this.updateTimeDisplay();
      this.lyricPlayer.setCurrentTime(this.audio.currentTime * 1000);
    });

    this.audio.addEventListener('play', () => {
      this.state.isPlaying = true;
      this.updatePlayButton();
      this.lyricPlayer.resume();

      // 更新媒体会话状态
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    });

    this.audio.addEventListener('pause', () => {
      this.state.isPlaying = false;
      this.updatePlayButton();
      this.lyricPlayer.pause();

      // 更新媒体会话状态
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    });

    this.audio.addEventListener('ended', () => {
      this.state.isPlaying = false;
      this.updatePlayButton();
      // 自动重新播放（如果开启循环播放）
      if (this.state.loopPlay) {
        this.audio.currentTime = 0;
        this.audio.play();
      }

      // 更新媒体会话状态
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none';
      }
    });

    // 设置媒体会话操作处理程序
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
    
    // 添加歌词区域的提示元素
    this.updateLyricAreaHint();
  }
  
  // 更新歌词区域提示
  private updateLyricAreaHint() {
    const lyricsPanel = document.getElementById("lyricsPanel");
    if (!lyricsPanel) return;
    
    // 移除旧的提示元素（如果存在）
    const oldHint = document.getElementById("lyricAreaHint");
    if (oldHint) oldHint.remove();
    
    // 如果没有歌词，添加提示元素
    if (!this.hasLyrics) {
      const hintElement = document.createElement("div");
      hintElement.id = "lyricAreaHint";
      hintElement.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: rgba(255, 255, 255, 0.7);
        font-size: 16px;
        text-align: center;
        pointer-events: auto;
        z-index: 5;
        width: 80%;
        padding: 30px;
        opacity: 0.7;
        transition: opacity 0.3s ease;
        cursor: pointer; /* 添加指针样式，提示可点击 */
      `;
      hintElement.innerHTML = `
        <div style="margin-bottom: 15px; font-size: 22px; font-weight: 500;">${t('clickToAddLyrics')}</div>
        <div style="color: rgba(255, 255, 255, 0.6);">${t('supportedLyricFormats')}</div>
      `;
      
      // 为提示元素添加点击和触摸事件
      hintElement.addEventListener('click', () => {
        const lyricFileInput = document.getElementById('lyricFile') as HTMLInputElement;
        if (lyricFileInput) lyricFileInput.click();
      });
      
      // 特别为移动设备添加触摸事件
      hintElement.addEventListener('touchend', (e) => {
        e.preventDefault(); // 防止触发多次事件
        const lyricFileInput = document.getElementById('lyricFile') as HTMLInputElement;
        if (lyricFileInput) lyricFileInput.click();
      });
      
      lyricsPanel.appendChild(hintElement);
    }
  }

  private setupDragAndDropEvents() {
    const albumCover = document.getElementById('albumCoverLarge');
    const lyricsPanel = document.getElementById('lyricsPanel');
    
    // 封面拖拽事件
    if (albumCover) {
      albumCover.addEventListener('dragover', (e) => {
        e.preventDefault();
        albumCover.style.opacity = '0.7';
      });
      
      albumCover.addEventListener('dragleave', () => {
        albumCover.style.opacity = '1';
      });
      
      albumCover.addEventListener('drop', (e) => {
        e.preventDefault();
        albumCover.style.opacity = '1';
        
        if (e.dataTransfer?.files.length) {
          const file = e.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            this.loadCoverFromFile(file);
          }
        }
      });
    }
    
    // 歌词区域拖拽事件
    if (lyricsPanel) {
      lyricsPanel.addEventListener('dragover', (e) => {
        e.preventDefault();
        lyricsPanel.style.border = '2px dashed rgba(255, 255, 255, 0.5)';
      });
      
      lyricsPanel.addEventListener('dragleave', () => {
        lyricsPanel.style.border = 'none';
      });
      
      lyricsPanel.addEventListener('drop', (e) => {
        e.preventDefault();
        lyricsPanel.style.border = 'none';
        
        if (e.dataTransfer?.files.length) {
          const file = e.dataTransfer.files[0];
          // 检查文件类型，iOS Safari 可能会上传 text/plain 类型的文件或空类型
          if (file.name.match(/\.(lrc|ttml|yrc|lys|qrc|txt)$/i) || file.type === 'text/plain' || file.type === '') {
            this.loadLyricFromFile(file);
          }
        }
      });
    }
  }

  private setupDragAndDropEvents() {
    const albumCover = document.getElementById('albumCoverLarge');
    const lyricsPanel = document.getElementById('lyricsPanel');
    
    // 封面拖拽事件
    if (albumCover) {
      albumCover.addEventListener('dragover', (e) => {
        e.preventDefault();
        albumCover.style.opacity = '0.7';
      });
      
      albumCover.addEventListener('dragleave', () => {
        albumCover.style.opacity = '1';
      });
      
      albumCover.addEventListener('drop', (e) => {
        e.preventDefault();
        albumCover.style.opacity = '1';
        
        if (e.dataTransfer?.files.length) {
          const file = e.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            this.loadCoverFromFile(file);
          }
        }
      });
    }
    
    // 歌词区域拖拽事件
    if (lyricsPanel) {
      lyricsPanel.addEventListener('dragover', (e) => {
        e.preventDefault();
        lyricsPanel.style.border = '2px dashed rgba(255, 255, 255, 0.5)';
      });
      
      lyricsPanel.addEventListener('dragleave', () => {
        lyricsPanel.style.border = 'none';
      });
      
      lyricsPanel.addEventListener('drop', (e) => {
        e.preventDefault();
        lyricsPanel.style.border = 'none';
        
        if (e.dataTransfer?.files.length) {
          const file = e.dataTransfer.files[0];
          // 检查文件类型，iOS Safari 可能会上传 text/plain 类型的文件或空类型
          if (file.name.match(/\.(lrc|ttml|yrc|lys|qrc|txt)$/i) || file.type === 'text/plain' || file.type === '') {
            this.loadLyricFromFile(file);
          }
        }
      });
    }
  }

  private initStats() {
    this.stats = new Stats();
    this.stats.showPanel(0);
    this.stats.dom.style.display = "none";
    document.body.appendChild(this.stats.dom);
  }

  private initUI() {
    const player = document.getElementById("player");
    const lyricsPanel = document.getElementById("lyricsPanel");
    
    // 初始化时更新歌词区域提示
    this.updateLyricAreaHint();

    // 播放按钮点击事件 - 当没有歌曲时触发文件选择
    const playButton = document.getElementById('playPauseBtn');
    if (playButton) {
      let playButtonLongPressTimer: number;

      playButton.addEventListener('click', (e) => {
        if (!this.state.musicUrl && !this.audio.src) {
          e.preventDefault();
          const musicFileInput = document.getElementById('musicFile') as HTMLInputElement;
          if (musicFileInput) musicFileInput.click();
          return;
        }
      });

      let isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      playButton.addEventListener('mousedown', () => {
        playButtonLongPressTimer = window.setTimeout(() => {
          const musicFileInput = document.getElementById('musicFile') as HTMLInputElement;
          if (musicFileInput) musicFileInput.click();
        }, 3000);
      });

      playButton.addEventListener('mouseup', () => {
        clearTimeout(playButtonLongPressTimer);
      });

      playButton.addEventListener('mouseleave', () => {
        clearTimeout(playButtonLongPressTimer);
      });
      
      // 添加右键点击事件，触发与长按相同的功能
      playButton.addEventListener('contextmenu', (e) => {
        e.preventDefault(); // 阻止默认右键菜单
        const musicFileInput = document.getElementById('musicFile') as HTMLInputElement;
        if (musicFileInput) musicFileInput.click();
        return false; // 为Safari返回false
      });

      // 添加移动设备支持
      playButton.addEventListener('touchstart', (e) => {
        // 记录触摸开始时间
        const touchStartTime = Date.now();
        
        // 使用标记来跟踪是否是长按
        let isLongPress = false;
        playButtonLongPressTimer = window.setTimeout(() => {
          isLongPress = true;
          const musicFileInput = document.getElementById('musicFile') as HTMLInputElement;
          if (musicFileInput) musicFileInput.click();
        }, 3000);
        
        // 不再阻止默认事件，允许正常点击
      });

      playButton.addEventListener('touchend', () => {
        clearTimeout(playButtonLongPressTimer);
      });
      
      playButton.addEventListener('touchcancel', () => {
        clearTimeout(playButtonLongPressTimer);
      });
    }

    if (player) {
      player.appendChild(this.audio);
      player.appendChild(this.background.getElement());

      // 将歌词元素添加到右侧歌词面板
      if (lyricsPanel) {
        lyricsPanel.appendChild(this.lyricPlayer.getElement());
        
        // 添加点击事件，当没有歌词或歌词为空时，点击可以打开歌词文件选择对话框
        lyricsPanel.addEventListener('click', (e) => {
          // 使用 hasLyrics 变量检查当前是否有歌词
          if (!this.hasLyrics) {
            const lyricFileInput = document.getElementById('lyricFile') as HTMLInputElement;
            if (lyricFileInput) lyricFileInput.click();
          }
        });
        
        // 添加触摸事件支持，特别是针对移动设备
        lyricsPanel.addEventListener('touchend', (e) => {
          // 只有在没有歌词时才触发文件选择
          if (!this.hasLyrics) {
            // 防止触发多次事件
            e.preventDefault();
            const lyricFileInput = document.getElementById('lyricFile') as HTMLInputElement;
            if (lyricFileInput) lyricFileInput.click();
          }
        });
      } else {
        // 如果找不到歌词面板，则添加到播放器容器
        player.appendChild(this.lyricPlayer.getElement());
      }
    }

    // 设置默认封面
    this.background.setAlbum("./assets/icon-512x512.png");

    // 确保控制面板默认隐藏
    const controlPanel = document.getElementById('controlPanel');
    if (controlPanel) {
      controlPanel.style.display = 'none';
    }

    // 调整歌词显示位置，根据屏幕方向
    this.adjustLyricPosition();

    // 初始化大封面和信息
    this.updateAlbumSidePanel();
  }

  private async loadMusicFromFile(file: File) {
    try {
      // 检查文件类型，iOS Safari 可能会上传不同类型的音频文件
      const isAudioType = file.type.startsWith('audio/');
      const isValidExtension = /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name);
      
      if (!isAudioType && !isValidExtension) {
        this.showStatus(t('invalidMusicFile'), true);
        return;
      }
      
      const url = URL.createObjectURL(file);
      this.state.musicUrl = url;
      this.audio.crossOrigin = 'anonymous'; // 允许跨域访问音频文件
      this.audio.src = url;
      this.audio.load();

      // 解析音频元数据
      await this.parseAudioMetadata(file);

      // 立即更新媒体会话元数据
      this.updateMediaSessionMetadata();

      // 歌曲加载完成后隐藏控制面板
      const controlPanel = document.getElementById('controlPanel');
      if (controlPanel) controlPanel.style.display = 'none';

      this.showStatus(t('musicLoadSuccess'));
    } catch (error) {
      this.showStatus(t('musicLoadFailed'), true);
    }
  }

  private async loadLyricFromFile(file: File) {
    try {
      // 检查文件类型，iOS Safari 可能会上传 text/plain 类型的文件
      const isValidExtension = /\.(lrc|ttml|yrc|lys|qrc|txt)$/i.test(file.name);
      const isTextPlain = file.type === 'text/plain' || file.type === '';
      
      if (!isValidExtension && !isTextPlain) {
        this.showStatus(t('invalidLyricFile'), true);
        return;
      }
      
      const text = await file.text();
      const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
      this.state.lyricUrl = url;
      await this.loadLyricContent(text, file.name);
      this.showStatus(t('lyricsLoadSuccess'));
    } catch (error) {
      this.showStatus(t('lyricsLoadFailed'), true);
    }
  }

  private async loadCoverFromFile(file: File) {
    try {
      const url = URL.createObjectURL(file);
      this.state.coverUrl = url;
      this.background.setAlbum(url);
      this.updateSongInfo();
      this.showStatus(t('coverLoadSuccess'));
    } catch (error) {
      this.showStatus(t('coverLoadFailed'), true);
    }
  }

  private async loadFromURLs() {
    const musicUrl = (document.getElementById('musicUrl') as HTMLInputElement)?.value;
    const lyricUrl = (document.getElementById('lyricUrl') as HTMLInputElement)?.value;
    const coverUrl = (document.getElementById('coverUrl') as HTMLInputElement)?.value;

    if (musicUrl) {
      this.state.musicUrl = musicUrl;
      this.audio.src = musicUrl;
      this.audio.load();

      // 立即更新媒体会话元数据
      this.updateMediaSessionMetadata();
    }

    if (lyricUrl) {
      this.state.lyricUrl = lyricUrl;
      try {
        const response = await fetch(lyricUrl);
        const text = await response.text();
        await this.loadLyricContent(text, lyricUrl);
      } catch (error) {
        this.showStatus(t('lyricsUrlLoadFailed'), true);
      }
    }

    if (coverUrl) {
      this.state.coverUrl = coverUrl;
      this.background.setAlbum(coverUrl);
    }

    // 更新歌曲信息
    this.updateSongInfo();

    // 隐藏控制面板
    const controlPanel = document.getElementById('controlPanel');
    if (controlPanel) controlPanel.style.display = 'none';

    // 更新页面标题
    const title = this.state.songTitle;
    const artist = this.state.songArtist;
    if (title) {
      if (artist) {
        document.title = `${artist} - ${title}`;
      } else {
        document.title = title;
      }
    }

    this.showStatus(t('loadFromUrlComplete'));
  }

  private async loadFromFiles() {
    const musicFile = (document.getElementById('musicFile') as HTMLInputElement)?.files?.[0];
    const lyricFile = (document.getElementById('lyricFile') as HTMLInputElement)?.files?.[0];
    const coverFile = (document.getElementById('coverFile') as HTMLInputElement)?.files?.[0];

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

      if (filename.endsWith(".ttml")) {
        lines = parseTTML(content).lines.map(this.mapTTMLLyric);
      } else if (filename.endsWith(".lrc")) {
        lines = parseLrc(content).map(this.mapLyric);
      } else if (filename.endsWith(".yrc")) {
        lines = parseYrc(content).map(this.mapLyric);
      } else if (filename.endsWith(".lys")) {
        lines = parseLys(content).map(this.mapLyric);
      } else if (filename.endsWith(".qrc")) {
        lines = parseQrc(content).map(this.mapLyric);
      }

      // 如果没有歌词，显示"暂无歌词"
      if (lines.length === 0) {
        lines = [{
          words: [{ text: "暂无歌词", startTime: 0, endTime: 10000 }],
          startTime: 0,
          endTime: 10000,
          translatedLyric: "",
          romanLyric: "",
          isBG: false,
          isDuet: false
        }];
      }

      this.lyricPlayer.setLyricLines(lines);
      this.hasLyrics = lines.length > 0 && !(lines.length === 1 && lines[0].words.length === 1 && lines[0].words[0].text === "暂无歌词");
      this.updateLyricAreaHint(); // 更新歌词区域提示
      this.showStatus(`${t('lyricsParseSuccess')}${lines.length} 行`);
    } catch (error) {
      this.showStatus(t('lyricsParseFailed'), true);
    }
  }

  private mapLyric(line: RawLyricLine): LyricLine {
    return {
      words: line.words.map((word) => ({ obscene: false, ...word })),
      startTime: line.words[0]?.startTime ?? 0,
      endTime: line.words[line.words.length - 1]?.endTime ?? Number.POSITIVE_INFINITY,
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
    const btn = document.getElementById('playPauseBtn');
    if (btn) {
      btn.innerHTML = this.state.isPlaying ? '<svg fill="currentColor" class="___12fm75w f1w7gpdv fez10in fg4l7m0" aria-hidden="true" width="1em" height="1em" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M5 2a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H5Zm8 0a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-2Z" fill="currentColor"></path></svg>' : '<svg fill="currentColor" class="___12fm75w f1w7gpdv fez10in fg4l7m0" aria-hidden="true" width="1em" height="1em" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M17.22 8.68a1.5 1.5 0 0 1 0 2.63l-10 5.5A1.5 1.5 0 0 1 5 15.5v-11A1.5 1.5 0 0 1 7.22 3.2l10 5.5Z" fill="currentColor"></path></svg>';
    }
  }

  private updateProgress() {
    const progressFill = document.getElementById('progressFill');
    if (progressFill && this.state.duration > 0) {
      const percentage = (this.state.currentTime / this.state.duration) * 100;
      progressFill.style.width = `${percentage}%`;
    }
  }

  private updateTimeDisplay() {
    const timeDisplay = document.getElementById('timeDisplay');
    if (timeDisplay) {
      const currentTime = this.formatTime(this.state.currentTime);
      const duration = this.formatTime(this.state.duration);
      timeDisplay.textContent = `${currentTime} / ${duration}`;
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private seekToPosition(e: MouseEvent) {
    const progressBar = document.getElementById('progressBar');
    if (progressBar && this.state.duration > 0) {
      const rect = progressBar.getBoundingClientRect();
      const percentage = (e.clientX - rect.left) / rect.width;
      const newTime = percentage * this.state.duration;
      this.audio.currentTime = newTime;
    }
  }

  private toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  private toggleControlPanel() {
    const panel = document.getElementById('controlPanel');
    if (panel) {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
  }

  private handleKeyboard(e: KeyboardEvent) {
    switch (e.key) {
      case ' ':
        e.preventDefault();
        this.togglePlayPause();
        break;
      case 'ArrowLeft':
        this.audio.currentTime = Math.max(0, this.audio.currentTime - 10);
        break;
      case 'ArrowRight':
        this.audio.currentTime = Math.min(this.audio.duration, this.audio.currentTime + 10);
        break;
      case 'f':
        this.toggleFullscreen();
        break;
      case 'h':
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
          this.gui.domElement.style.display = this.gui.domElement.style.display === "none" ? "block" : "none";
          this.stats.dom.style.display = this.stats.dom.style.display === "none" ? "block" : "none";
        }
      } else {
        tapCount = 0;
      }
    });
  }

  private resetPlayer() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.audio.src = '';
    this.state.musicUrl = '';

    // 重置时显示"暂无歌词"
    this.lyricPlayer.setLyricLines([{
      words: [{ text: "暂无歌词", startTime: 0, endTime: 10000 }],
      startTime: 0,
      endTime: 10000,
      translatedLyric: "",
      romanLyric: "",
      isBG: false,
      isDuet: false
    }]);
    this.hasLyrics = false; // 重置歌词后标记为没有歌词
    this.updateLyricAreaHint(); // 更新歌词区域提示
    this.background.setAlbum("./assets/icon-512x512.png");

    // 清空输入框
    const inputs = ['musicFile', 'musicUrl', 'lyricFile', 'lyricUrl', 'coverFile', 'coverUrl', 'songTitleInput', 'songArtistInput'];

    // 重置循环播放开关
    const loopPlayCheckbox = document.getElementById('loopPlay') as HTMLInputElement;
    if (loopPlayCheckbox) {
      loopPlayCheckbox.checked = true;
    }

    // 重置时显示控制面板
    const controlPanel = document.getElementById('controlPanel');
    if (controlPanel) controlPanel.style.display = 'block';
    inputs.forEach(id => {
      const input = document.getElementById(id) as HTMLInputElement;
      if (input) {
        if (input.type === 'file') {
          input.value = '';
        } else {
          input.value = '';
        }
      }
    });

    // 隐藏歌曲信息
    const songInfoTopLeft = document.getElementById('songInfoTopLeft');
    if (songInfoTopLeft) {
      songInfoTopLeft.style.display = 'none';
    }

    // 调整歌词位置
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
      loopPlay: true
    };
    this.hasLyrics = false; // 初始化时没有歌词

    this.updatePlayButton();
    this.updateProgress();
    this.updateTimeDisplay();
    this.showStatus(t('playerReset'));
  }

  // 设置媒体会话操作处理程序
  private setupMediaSessionHandlers() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        this.audio.play();
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        this.audio.pause();
      });

      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skipTime = details.seekOffset || 10;
        this.audio.currentTime = Math.max(this.audio.currentTime - skipTime, 0);
      });

      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skipTime = details.seekOffset || 10;
        this.audio.currentTime = Math.min(this.audio.currentTime + skipTime, this.audio.duration);
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          this.audio.currentTime = details.seekTime;
        }
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        this.audio.currentTime = 0;
      });

      navigator.mediaSession.setActionHandler('nexttrack', null);
    }
  }

  // 更新媒体会话元数据
  private updateMediaSessionMetadata() {
    if ('mediaSession' in navigator) {
      const coverUrl = this.state.coverUrl || './assets/icon-512x512.png';

      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.state.songTitle || t('unknownSong'),
        artist: this.state.songArtist || t('unknownArtist'),
        album: '',
        artwork: [
          { src: coverUrl, sizes: '96x96', type: 'image/png' },
          { src: coverUrl, sizes: '128x128', type: 'image/png' },
          { src: coverUrl, sizes: '192x192', type: 'image/png' },
          { src: coverUrl, sizes: '256x256', type: 'image/png' },
          { src: coverUrl, sizes: '384x384', type: 'image/png' },
          { src: coverUrl, sizes: '512x512', type: 'image/png' }
        ]
      });
    }
  }

  private updateSongInfo() {
    // 更新左上角小型歌曲信息（移动设备模式）
    const songInfoTopLeft = document.getElementById('songInfoTopLeft');
    const songCover = document.getElementById('songCoverTopLeft') as HTMLImageElement;
    const songTitle = document.getElementById('songTitleTopLeft');
    const songArtist = document.getElementById('songArtistTopLeft');

    if (songInfoTopLeft && songCover && songTitle && songArtist) {
      if (this.state.coverUrl) {
        songCover.src = this.state.coverUrl;
        songCover.style.display = 'block';
      } else {
        songCover.style.display = 'none';
      }

      songTitle.textContent = this.state.songTitle || t('unknownSong');
      songArtist.textContent = this.state.songArtist || t('unknownArtist');

      // 显示歌曲信息区域
      songInfoTopLeft.style.display = 'block';
    }

    // 更新左侧大型专辑面板（桌面/横屏模式）
    this.updateAlbumSidePanel();

    // 调整歌词显示位置
    this.adjustLyricPosition();

    // 更新媒体会话元数据
    this.updateMediaSessionMetadata();

    // 更新页面标题为"艺术家 - 标题"格式
    if (this.state.songTitle) {
      if (this.state.songArtist) {
        document.title = `${this.state.songArtist} - ${this.state.songTitle}`;
      } else {
        document.title = this.state.songTitle;
      }
    }
  }

  private adjustLyricPosition() {
    const lyricElement = this.lyricPlayer.getElement();
    if (lyricElement) {
      // 检查是否为横屏/桌面模式
      const isLandscape = window.matchMedia('(min-width: 769px), (orientation: landscape)').matches;

      if (isLandscape) {
        // 横屏/桌面模式下，歌词不需要额外的顶部填充
        lyricElement.style.paddingTop = '20px';
      } else {
        // 竖屏/移动设备模式下，根据歌曲信息是否显示来调整歌词位置
        const songInfoTopLeft = document.getElementById('songInfoTopLeft');
        if (songInfoTopLeft && songInfoTopLeft.style.display !== 'none') {
          lyricElement.style.paddingTop = '120px'; // 歌曲信息显示时
        } else {
          lyricElement.style.paddingTop = '20px'; // 歌曲信息隐藏时
        }
      }
      
      // 同时更新歌词区域提示的位置
      this.updateLyricAreaHint();
    }
  }

  private updateAlbumSidePanel() {
    const albumCoverLarge = document.getElementById('albumCoverLarge') as HTMLImageElement;
    const songTitle = document.getElementById('songTitle');
    const songArtist = document.getElementById('songArtist');

    if (albumCoverLarge && songTitle && songArtist) {
      // 更新大封面
      if (this.state.coverUrl) {
        albumCoverLarge.src = this.state.coverUrl;
      } else {
        albumCoverLarge.src = './assets/icon-512x512.png';
      }

      // 更新歌曲信息
      songTitle.textContent = this.state.songTitle || t('unknownSong');
      songArtist.textContent = this.state.songArtist || t('unknownArtist');
    }
  }

  private async parseAudioMetadata(file: File) {
    try {
      console.log('Parsing audio metadata, file:', file.name, 'size:', file.size);

      // 使用 jsmediatags 库解析音频元数据
      const jsmediatags = (window as any).jsmediatags;
      console.log('jsmediatags库:', jsmediatags);

      if (jsmediatags) {
        console.log('Calling jsmediatags.read...');
        jsmediatags.read(file, {
          onSuccess: (tag: any) => {
            console.log('Audio metadata parsed successfully, full data:', tag);
            console.log('tags对象:', tag.tags);

            let hasMetadata = false;

            // 提取歌曲信息 - 优先使用TIT2(歌曲名)而不是TALB(专辑名)
            if (tag.tags && tag.tags.title) {
              this.state.songTitle = tag.tags.title;
              (document.getElementById('songTitleInput') as HTMLInputElement).value = tag.tags.title;
              console.log('Extracted song title:', tag.tags.title);
              hasMetadata = true;
            } else {
              console.log('No song title found');
            }

            if (tag.tags && tag.tags.artist) {
              this.state.songArtist = tag.tags.artist;
              (document.getElementById('songArtistInput') as HTMLInputElement).value = tag.tags.artist;
              console.log('Extracted song artist:', tag.tags.artist);
              hasMetadata = true;
            } else {
              console.log('No song artist found');
            }

            // 提取封面图片
            if (tag.tags && tag.tags.picture) {
              console.log('Found cover image:', tag.tags.picture);
              const { data, format } = tag.tags.picture;
              let base64String = '';
              for (let i = 0; i < data.length; i++) {
                base64String += String.fromCharCode(data[i]);
              }
              const base64 = `data:${format};base64,${window.btoa(base64String)}`;
              this.state.coverUrl = base64;
              this.background.setAlbum(base64);
              console.log('Extracted cover image, format:', format, 'size:', data.length);
              hasMetadata = true;
            } else {
              console.log('No cover image found');
            }

            this.updateSongInfo();
            this.updateMediaSessionMetadata();

            if (hasMetadata) {
              this.showStatus(t('metadataParseSuccess'));
            } else {
              console.log('No metadata found, using fallback method');
              this.parseAudioMetadataFallback(file);
            }
          },
          onError: (error: any) => {
            console.log('Audio metadata parsing failed:', error);
            this.showStatus(t('metadataParseFailed'), true);
            // 尝试备用方案
            this.parseAudioMetadataFallback(file);
          }
        });
      } else {
        console.log('jsmediatags library not loaded');
        this.showStatus(t('metadataLibNotLoaded'), true);
        // 尝试备用方案
        this.parseAudioMetadataFallback(file);
      }
    } catch (error) {
      console.log('Audio metadata parsing error:', error);
      this.showStatus(t('metadataParseError'), true);
      // 尝试备用方案
      this.parseAudioMetadataFallback(file);
    }
  }

  private async parseAudioMetadataFallback(file: File) {
    try {
      console.log('Using fallback method to parse file:', file.name);

      // 备用方案：从文件名提取信息
      const fileName = file.name;
      const nameWithoutExt = fileName.replace(/\.[^/.]+$/, ""); // 移除扩展名

      // 尝试从文件名解析歌曲信息（格式：艺术家 - 歌曲名）
      const parts = nameWithoutExt.split(' - ');
      if (parts.length >= 2) {
        this.state.songArtist = parts[0].trim();
        this.state.songTitle = parts[1].trim();

        (document.getElementById('songArtistInput') as HTMLInputElement).value = this.state.songArtist;
        (document.getElementById('songTitleInput') as HTMLInputElement).value = this.state.songTitle;

        console.log('Parsing from filename:', { artist: this.state.songArtist, title: this.state.songTitle });
        this.updateSongInfo();
        this.updateMediaSessionMetadata();
        this.showStatus(t('extractedSongInfo'));
      } else {
        // 尝试其他分隔符
        const altParts = nameWithoutExt.split(' – '); // 使用长破折号
        if (altParts.length >= 2) {
          this.state.songArtist = altParts[0].trim();
          this.state.songTitle = altParts[1].trim();

          (document.getElementById('songArtistInput') as HTMLInputElement).value = this.state.songArtist;
          (document.getElementById('songTitleInput') as HTMLInputElement).value = this.state.songTitle;

          console.log('Parsing from filename (long dash):', { artist: this.state.songArtist, title: this.state.songTitle });
          this.updateSongInfo();
          this.updateMediaSessionMetadata();
          this.showStatus(t('extractedSongInfo'));
        } else {
          // 如果无法解析，使用文件名作为标题
          this.state.songTitle = nameWithoutExt;
          (document.getElementById('songTitleInput') as HTMLInputElement).value = this.state.songTitle;
          console.log('Using filename as title:', this.state.songTitle);
          this.updateSongInfo();
          this.updateMediaSessionMetadata();
          this.showStatus(t('usedFilenameAsTitle'));
        }
      }

      // 尝试使用Web Audio API获取一些基本信息
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log('Audio info:', {
          duration: audioBuffer.duration,
          sampleRate: audioBuffer.sampleRate,
          numberOfChannels: audioBuffer.numberOfChannels
        });
      } catch (audioError) {
        console.log('Web Audio API parsing failed:', audioError);
      }
    } catch (error) {
      console.log('Fallback parsing method failed:', error);
      this.showStatus(t('cannotParseAudioInfo'), true);
    }
  }

  private showStatus(message: string, isError = false) {
    const status = document.getElementById('status');
    const statusText = document.getElementById('statusText');

    if (status && statusText) {
      statusText.textContent = message;
      status.style.display = 'block';

      if (isError) {
        status.style.background = 'rgba(255, 0, 0, 0.9)';
      } else {
        status.style.background = 'rgba(0, 0, 0, 0.9)';
      }

      setTimeout(() => {
        status.style.display = 'none';
      }, 3000);
    }
  }
  
  // 辅助函数：为元素添加长按和右键功能（兼容Safari）
  private addLongPressAndRightClickHandler(element: HTMLElement, callback: () => void, longPressTime = 3000) {
    if (!element) return;
    
    let timer: number;
    let isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    // 鼠标事件
    element.addEventListener('mousedown', () => {
      timer = window.setTimeout(callback, longPressTime);
    });
    
    element.addEventListener('mouseup', () => {
      clearTimeout(timer);
    });
    
    element.addEventListener('mouseleave', () => {
      clearTimeout(timer);
    });
    
    // 右键事件
    element.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      callback();
      return false; // 为Safari返回false
    });
    
    // 触摸事件
    element.addEventListener('touchstart', (e) => {
      // 使用标记来跟踪是否是长按
      let isLongPress = false;
      timer = window.setTimeout(() => {
        isLongPress = true;
        callback();
      }, longPressTime);
      
      // 不再阻止默认事件，允许正常点击
    });
    
    element.addEventListener('touchend', (e) => {
      clearTimeout(timer);
      // 不阻止默认事件，允许正常点击行为
    });
    
    element.addEventListener('touchcancel', () => {
      clearTimeout(timer);
    });
  }

  private showAutoPlayHint() {
    // 创建自动播放提示
    const hint = document.createElement('div');
    hint.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 20px;
      border-radius: 10px;
      z-index: 10000;
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
    }, 5000);
  }

  // 从URL参数加载
  public loadFromURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const music = urlParams.get('music');
    const lyric = urlParams.get('lyric');
    const cover = urlParams.get('cover');
    const title = urlParams.get('title');
    const artist = urlParams.get('artist');
    const autoPlay = urlParams.get('autoplay') !== 'false'; // 默认开启自动播放

    // 如果没有音乐URL，显示控制面板
    if (!music) {
      const controlPanel = document.getElementById('controlPanel');
      if (controlPanel) controlPanel.style.display = 'block';
    }

    if (music) {
      (document.getElementById('musicUrl') as HTMLInputElement).value = music;
    }
    if (lyric) {
      (document.getElementById('lyricUrl') as HTMLInputElement).value = lyric;
    }
    if (cover) {
      (document.getElementById('coverUrl') as HTMLInputElement).value = cover;
    }
    if (title) {
      (document.getElementById('songTitleInput') as HTMLInputElement).value = title;
      this.state.songTitle = title;

      // 更新页面标题为"艺术家 - 标题"格式
      if (artist) {
        document.title = `${artist} - ${title}`;
      } else {
        document.title = title;
      }
    }
    if (artist) {
      (document.getElementById('songArtistInput') as HTMLInputElement).value = artist;
      this.state.songArtist = artist;
    }

    // 如果有URL参数，自动加载
    if (music || lyric || cover) {
      this.loadFromURLs().then(() => {
        // 如果启用自动播放，则开始播放
        if (autoPlay && this.audio) {
          console.log('Auto-playing music');
          this.audio.play().catch(error => {
            console.log('Auto-play failed, requires user interaction:', error);
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

  public getBackground(): BackgroundRender<PixiRenderer | MeshGradientRenderer> {
    return this.background;
  }
}

// 创建播放器实例
const player = new WebLyricsPlayer();

// 全局变量，供外部调用
(window as any).player = player;
(window as any).globalLyricPlayer = player.getLyricPlayer();
(window as any).globalBackground = player.getBackground();

// 启动播放器
player.start();

// 调试快捷键
document.addEventListener("keydown", (e) => {
  if (e.shiftKey && e.key.toLowerCase() === "d") {
    const gui = (window as any).player.gui;
    const stats = (window as any).player.stats;
    const isHidden = gui.domElement.style.display === "none";
    gui.domElement.style.display = isHidden ? "block" : "none";
    stats.dom.style.display = isHidden ? "block" : "none";
  }
});