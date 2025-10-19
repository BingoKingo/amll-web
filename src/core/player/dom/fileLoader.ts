// 使用 any 避免对 WebLyricsPlayer 私有成员访问报错
import { t } from '../../../i18n';

/**
 * 文件加载器类，负责处理音乐、歌词和封面文件的加载逻辑
 */
export class FileLoader {
  private player: any;

  /**
   * 构造函数
   * @param player WebLyricsPlayer实例
   */
  constructor(player: any) {
    this.player = player;
  }

  /**
   * 从文件加载音乐
   * @param file 音乐文件
   * @returns Promise<void>
   */
  async loadMusicFromFile(file: File): Promise<void> {
    try {
      // 检查文件类型，iOS Safari 可能会上传不同类型的音频文件
      const isAudioType = file.type.startsWith('audio/');
      const isValidExtension = /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name);

      if (!isAudioType && !isValidExtension) {
        this.player.showStatus(t('musicLoadFailed'), true);
        return;
      }

      const url = URL.createObjectURL(file);
      this.player.state.musicUrl = url;
      this.player.audio.crossOrigin = 'anonymous'; // 允许跨域访问音频文件
      this.player.audio.src = url;
      this.player.audio.load();

      if (this.player.playControls) {
        this.player.playControls.style.bottom = '';
        this.player.playControls.style.opacity = '';
      }
      if (this.player.progressBar) {
        this.player.progressBar.style.width = '';
      }

      if (this.player.state.autoPlay) {
        this.player.togglePlayPause();
      } else {
        this.player.state.isPlaying = false;
        this.player.updatePlayButton();
      }
      await this.player.parseAudioMetadata(file);
      this.player.updateMediaSessionMetadata();

      if (this.player.controlPanel) {
        this.player.controlPanel.style.width = '0px';
        this.player.controlPanel.style.right = '-50px';
        this.player.controlPanel.style.opacity = '0';
      }

      this.updateFileInputDisplay('musicFile', file);
      this.player.showStatus(t('musicLoadSuccess'));
    } catch (error) {
      this.player.showStatus(t('musicLoadFailed'), true);
    }
  }

  /**
   * 从文件加载歌词
   * @param file 歌词文件
   * @returns Promise<void>
   */
  async loadLyricFromFile(file: File): Promise<void> {
    try {
      // 检查文件类型，iOS Safari 可能会上传 text/plain 类型的文件
      const isValidExtension = /\.(lrc|ttml|yrc|lys|qrc|txt|ass|lqe|lyl|srt|spl)$/i.test(
        file.name
      );
      const isTextPlain = file.type === 'text/plain' || file.type === '';

      if (!isValidExtension && !isTextPlain) {
        this.player.showStatus(t('lyricsLoadFailed'), true);
        return;
      }

      const text = await file.text();
      const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
      this.player.state.lyricUrl = url;
      await this.player.loadLyricContent(text, file.name);
      this.updateFileInputDisplay('lyricFile', file);
      this.player.showStatus(t('lyricsLoadSuccess'));
    } catch (error) {
      this.player.showStatus(t('lyricsLoadFailed'), true);
    }
  }

  /**
   * 从文件加载封面
   * @param file 封面文件
   * @returns Promise<void>
   */
  async loadCoverFromFile(file: File): Promise<void> {
    try {
      const url = URL.createObjectURL(file);
      this.player.state.coverUrl = url;
      this.player.updateBackground();
      this.player.background.setAlbum(url || './assets/icon-512x512.png');
      await this.player.extractAndProcessCoverColor(url);
      this.player.applyDominantColorAsCSSVariable();
      this.player.updateBackground();
      this.player.updateSongInfo();
      this.updateFileInputDisplay('coverFile', file);
      this.player.showStatus(t('coverLoadSuccess'));
    } catch (error) {
      this.player.showStatus(t('coverLoadFailed'), true);
    }
  }

  /**
   * 更新文件输入显示
   * @param inputId 输入ID
   * @param file 文件或URL
   */
  updateFileInputDisplay(inputId: string, file: File | string): void {
    let fileInput: HTMLInputElement | null = null;
    if (inputId === 'musicFile') {
      fileInput = this.player.musicFile;
    } else if (inputId === 'lyricFile') {
      fileInput = this.player.lyricFile;
    } else if (inputId === 'coverFile') {
      fileInput = this.player.coverFile;
    }

    if (!fileInput) return;

    if (!file) {
      const oldDisplay = document.getElementById(`${inputId}Display`);
      if (oldDisplay) {
        oldDisplay.remove();
      }
      return;
    }

    const fileDisplay = document.createElement('span');
    fileDisplay.className = 'control-value';
    fileDisplay.style = 'max-width: 100%; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px;';
    if (file instanceof File) {
      fileDisplay.textContent = `${file.name}`;
    } else if (file === 'Direct Input') {
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

  /**
   * 初始化文件上传处理器
   */
  initFileUploadHandlers(): void {
    this.setupFileButtonHandlers();
    this.setupFileChangeHandlers();
  }

  /**
   * 设置文件按钮处理器
   */
  setupFileButtonHandlers(): void {
    // 为音乐文件按钮添加点击事件
    const musicFileButton = document.getElementById('musicFileButton');
    if (musicFileButton) {
      musicFileButton.addEventListener('click', () => {
        const musicFileInput = document.getElementById('musicFileInput') as HTMLInputElement;
        if (musicFileInput) {
          musicFileInput.click();
        }
      });
    }

    // 为歌词文件按钮添加点击事件
    const lyricFileButton = document.getElementById('lyricFileButton');
    if (lyricFileButton) {
      lyricFileButton.addEventListener('click', () => {
        const lyricFileInput = document.getElementById('lyricFileInput') as HTMLInputElement;
        if (lyricFileInput) {
          lyricFileInput.click();
        }
      });
    }

    // 为封面文件按钮添加点击事件
    const coverFileButton = document.getElementById('coverFileButton');
    if (coverFileButton) {
      coverFileButton.addEventListener('click', () => {
        const coverFileInput = document.getElementById('coverFileInput') as HTMLInputElement;
        if (coverFileInput) {
          coverFileInput.click();
        }
      });
    }
  }

  /**
   * 设置文件变更处理器
   */
  setupFileChangeHandlers(): void {
    // 为音乐文件输入框添加change事件
    const musicFileInput = document.getElementById('musicFileInput') as HTMLInputElement;
    if (musicFileInput) {
      musicFileInput.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        if (target.files && target.files[0]) {
          // 处理音乐文件加载逻辑
          this.player.loadMusicFromFile(target.files[0]);
        }
      });
    }

    // 为歌词文件输入框添加change事件
    const lyricFileInput = document.getElementById('lyricFileInput') as HTMLInputElement;
    if (lyricFileInput) {
      lyricFileInput.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        if (target.files && target.files[0]) {
          // 处理歌词文件加载逻辑
          this.player.loadLyricsFromFile(target.files[0]);
        }
      });
    }

    // 为封面文件输入框添加change事件
    const coverFileInput = document.getElementById('coverFileInput') as HTMLInputElement;
    if (coverFileInput) {
      coverFileInput.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        if (target.files && target.files[0]) {
          // 处理封面文件加载逻辑
          this.player.loadCoverFromFile(target.files[0]);
        }
      });
    }
  }
}