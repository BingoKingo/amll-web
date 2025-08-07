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

  constructor() {
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
    
    const bgFolder = this.gui.addFolder('背景控制');
    bgFolder.add(bgControls, 'dynamicBackground').name('动态背景').onChange((value: boolean) => {
      (window as any).player.getBackground().setStaticMode(!value);
    });
    bgFolder.add(bgControls, 'flowSpeed', 0, 10, 0.1).name('流动速度').onChange((value: number) => {
      (window as any).player.getBackground().setFlowSpeed(value);
    });
    bgFolder.add(bgControls, 'toggleBackground').name('切换背景模式');
  }

  private initEventListeners() {
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

    document.getElementById('fullscreenBtn')?.addEventListener('click', () => {
      this.toggleFullscreen();
    });

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
  }

  private initBackground() {
    this.background = BackgroundRender.new(MeshGradientRenderer);
    this.background.setFPS(60);
    this.background.setRenderScale(0.1); // 设置渲染倍率为0.1
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
    });

    this.audio.addEventListener('pause', () => {
      this.state.isPlaying = false;
      this.updatePlayButton();
      this.lyricPlayer.pause();
    });

    this.audio.addEventListener('ended', () => {
      this.state.isPlaying = false;
      this.updatePlayButton();
      // 自动重新播放（如果开启循环播放）
      if (this.state.loopPlay) {
        this.audio.currentTime = 0;
        this.audio.play();
      }
    });
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
  }

  private initStats() {
    this.stats = new Stats();
    this.stats.showPanel(0);
    this.stats.dom.style.display = "none";
    document.body.appendChild(this.stats.dom);
  }

  private initUI() {
    const player = document.getElementById("player");
    if (player) {
      player.appendChild(this.audio);
      player.appendChild(this.background.getElement());
      player.appendChild(this.lyricPlayer.getElement());
    }

    // 设置默认封面
    this.background.setAlbum("./assets/Cover.jpg");
    
    // 调整歌词显示位置，避免与歌曲信息重叠
    const lyricElement = this.lyricPlayer.getElement();
    if (lyricElement) {
      lyricElement.style.paddingTop = '120px'; // 为左上角歌曲信息留出空间
    }
  }

  private async loadMusicFromFile(file: File) {
    try {
      const url = URL.createObjectURL(file);
      this.state.musicUrl = url;
      this.audio.src = url;
      this.audio.load();
      
      // 解析音频元数据
      await this.parseAudioMetadata(file);
      
      this.showStatus('音乐文件加载成功');
    } catch (error) {
      this.showStatus('音乐文件加载失败', true);
    }
  }

  private async loadLyricFromFile(file: File) {
    try {
      const text = await file.text();
      const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
      this.state.lyricUrl = url;
      await this.loadLyricContent(text, file.name);
      this.showStatus('歌词文件加载成功');
    } catch (error) {
      this.showStatus('歌词文件加载失败', true);
    }
  }

  private async loadCoverFromFile(file: File) {
    try {
      const url = URL.createObjectURL(file);
      this.state.coverUrl = url;
      this.background.setAlbum(url);
      this.updateSongInfo();
      this.showStatus('封面图片加载成功');
    } catch (error) {
      this.showStatus('封面图片加载失败', true);
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
    }

    if (lyricUrl) {
      this.state.lyricUrl = lyricUrl;
      try {
        const response = await fetch(lyricUrl);
        const text = await response.text();
        await this.loadLyricContent(text, lyricUrl);
      } catch (error) {
        this.showStatus('歌词URL加载失败', true);
      }
    }

    if (coverUrl) {
      this.state.coverUrl = coverUrl;
      this.background.setAlbum(coverUrl);
    }

    // 更新歌曲信息
    this.updateSongInfo();
    
    // 更新页面标题
    const title = this.state.songTitle;
    if (title) {
      document.title = title;
    }

    this.showStatus('从URL加载完成');
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

      this.lyricPlayer.setLyricLines(lines);
      this.showStatus(`歌词加载成功，共 ${lines.length} 行`);
    } catch (error) {
      this.showStatus('歌词解析失败', true);
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
      btn.textContent = this.state.isPlaying ? '⏸️' : '▶️';
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
    this.lyricPlayer.setLyricLines([]);
    this.background.setAlbum("./assets/Cover.jpg");
    
    // 清空输入框
    const inputs = ['musicFile', 'musicUrl', 'lyricFile', 'lyricUrl', 'coverFile', 'coverUrl', 'songTitleInput', 'songArtistInput'];
    
    // 重置循环播放开关
    const loopPlayCheckbox = document.getElementById('loopPlay') as HTMLInputElement;
    if (loopPlayCheckbox) {
      loopPlayCheckbox.checked = true;
    }
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

    this.updatePlayButton();
    this.updateProgress();
    this.updateTimeDisplay();
    this.showStatus('播放器已重置');
  }

  private updateSongInfo() {
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
      
      songTitle.textContent = this.state.songTitle || '未知歌曲';
      songArtist.textContent = this.state.songArtist || '未知作者';
      
      // 显示歌曲信息区域
      songInfoTopLeft.style.display = 'block';
      
      // 调整歌词显示位置
      this.adjustLyricPosition();
    }
  }

  private adjustLyricPosition() {
    const lyricElement = this.lyricPlayer.getElement();
    if (lyricElement) {
      // 根据歌曲信息是否显示来调整歌词位置
      const songInfoTopLeft = document.getElementById('songInfoTopLeft');
      if (songInfoTopLeft && songInfoTopLeft.style.display !== 'none') {
        lyricElement.style.paddingTop = '120px'; // 歌曲信息显示时
      } else {
        lyricElement.style.paddingTop = '20px'; // 歌曲信息隐藏时
      }
    }
  }

  private async parseAudioMetadata(file: File) {
    try {
      console.log('开始解析音频元数据，文件:', file.name, '大小:', file.size);
      
      // 使用 jsmediatags 库解析音频元数据
      const jsmediatags = (window as any).jsmediatags;
      console.log('jsmediatags库:', jsmediatags);
      
      if (jsmediatags) {
        console.log('开始调用jsmediatags.read...');
        jsmediatags.read(file, {
          onSuccess: (tag: any) => {
            console.log('音频元数据解析成功，完整数据:', tag);
            console.log('tags对象:', tag.tags);
            
            let hasMetadata = false;
            
            // 提取歌曲信息
            if (tag.tags && tag.tags.title) {
              this.state.songTitle = tag.tags.title;
              (document.getElementById('songTitleInput') as HTMLInputElement).value = tag.tags.title;
              console.log('提取到标题:', tag.tags.title);
              hasMetadata = true;
            } else {
              console.log('未找到标题信息');
            }
            
            if (tag.tags && tag.tags.artist) {
              this.state.songArtist = tag.tags.artist;
              (document.getElementById('songArtistInput') as HTMLInputElement).value = tag.tags.artist;
              console.log('提取到艺术家:', tag.tags.artist);
              hasMetadata = true;
            } else {
              console.log('未找到艺术家信息');
            }
            
            // 提取封面图片
            if (tag.tags && tag.tags.picture) {
              console.log('找到封面图片:', tag.tags.picture);
              const { data, format } = tag.tags.picture;
              let base64String = '';
              for (let i = 0; i < data.length; i++) {
                base64String += String.fromCharCode(data[i]);
              }
              const base64 = `data:${format};base64,${window.btoa(base64String)}`;
              this.state.coverUrl = base64;
              this.background.setAlbum(base64);
              console.log('提取到封面图片，格式:', format, '大小:', data.length);
              hasMetadata = true;
            } else {
              console.log('未找到封面图片');
            }
            
            this.updateSongInfo();
            
            if (hasMetadata) {
              this.showStatus('音频元数据解析成功');
            } else {
              console.log('未找到任何元数据，使用备用方案');
              this.parseAudioMetadataFallback(file);
            }
          },
          onError: (error: any) => {
            console.log('音频元数据解析失败:', error);
            this.showStatus('音频元数据解析失败，使用备用方案', true);
            // 尝试备用方案
            this.parseAudioMetadataFallback(file);
          }
        });
      } else {
        console.log('jsmediatags库未加载');
        this.showStatus('音频元数据解析库未加载，使用备用方案', true);
        // 尝试备用方案
        this.parseAudioMetadataFallback(file);
      }
    } catch (error) {
      console.log('音频元数据解析出错:', error);
      this.showStatus('音频元数据解析出错，使用备用方案', true);
      // 尝试备用方案
      this.parseAudioMetadataFallback(file);
    }
  }

  private async parseAudioMetadataFallback(file: File) {
    try {
      console.log('使用备用方案解析文件:', file.name);
      
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
        
        console.log('从文件名解析:', { artist: this.state.songArtist, title: this.state.songTitle });
        this.updateSongInfo();
        this.showStatus('从文件名解析歌曲信息成功');
      } else {
        // 尝试其他分隔符
        const altParts = nameWithoutExt.split(' – '); // 使用长破折号
        if (altParts.length >= 2) {
          this.state.songArtist = altParts[0].trim();
          this.state.songTitle = altParts[1].trim();
          
          (document.getElementById('songArtistInput') as HTMLInputElement).value = this.state.songArtist;
          (document.getElementById('songTitleInput') as HTMLInputElement).value = this.state.songTitle;
          
          console.log('从文件名解析（长破折号）:', { artist: this.state.songArtist, title: this.state.songTitle });
          this.updateSongInfo();
          this.showStatus('从文件名解析歌曲信息成功');
        } else {
          // 如果无法解析，使用文件名作为标题
          this.state.songTitle = nameWithoutExt;
          (document.getElementById('songTitleInput') as HTMLInputElement).value = this.state.songTitle;
          console.log('使用文件名作为标题:', this.state.songTitle);
          this.updateSongInfo();
          this.showStatus('使用文件名作为歌曲标题');
        }
      }
      
      // 尝试使用Web Audio API获取一些基本信息
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log('音频信息:', {
          duration: audioBuffer.duration,
          sampleRate: audioBuffer.sampleRate,
          numberOfChannels: audioBuffer.numberOfChannels
        });
      } catch (audioError) {
        console.log('Web Audio API解析失败:', audioError);
      }
    } catch (error) {
      console.log('备用解析方案失败:', error);
      this.showStatus('无法解析音频文件信息', true);
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
      document.title = title;
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
          console.log('自动播放音乐');
          this.audio.play().catch(error => {
            console.log('自动播放失败，需要用户交互:', error);
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