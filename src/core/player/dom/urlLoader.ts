// 使用 any 规避对私有成员的访问限制
import { t } from '../../../i18n';

/**
 * URL加载器类，负责处理音乐、歌词和封面URL的加载逻辑
 */
export class UrlLoader {
  private player: any;

  /**
   * 构造函数
   * @param player 注入任意类型的 player（原先为 WebLyricsPlayer）
   */
  constructor(player: any) {
    this.player = player;
  }

  /**
   * 从URL加载资源
   * @returns Promise<void>
   */
  async loadFromURLs(): Promise<void> {
    let musicUrl = this.player.musicUrl?.value;
    let lyricUrl = this.player.lyricUrl?.value;
    let coverUrl = this.player.coverUrl?.value;

    if (!musicUrl && this.player.musicUrl?.value === '') {
      this.player.resetPlayer();
      this.player.showStatus(t('playerReset'));
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);

    if (!musicUrl) {
      const urlMusic = urlParams.get('music');
      if (urlMusic && this.player.musicUrl) {
        musicUrl = urlMusic;
        this.player.musicUrl.value = musicUrl;
        if (this.player.state.autoPlay) {
          this.player.togglePlayPause();
        } else {
          this.player.state.isPlaying = false;
          this.player.updatePlayButton();
        }
      }
    }

    if (!lyricUrl) {
      const urlLyric = urlParams.get('lyric');
      if (urlLyric && this.player.lyricUrl) {
        lyricUrl = urlLyric;
        this.player.lyricUrl.value = lyricUrl;
      }
    }

    if (!coverUrl) {
      const urlCover = urlParams.get('cover');
      if (urlCover && this.player.coverUrl) {
        coverUrl = urlCover;
        this.player.coverUrl.value = coverUrl;
      }
    }

    // 处理播放速度参数
    const playbackSpeed = urlParams.get('x');
    if (playbackSpeed) {
      const speed = parseFloat(playbackSpeed);
      if (!isNaN(speed) && speed > 0) {
        if (this.player.playbackRateControl) {
          this.player.playbackRateControl.value = speed.toString();
          if (this.player.audio) {
            this.player.audio.playbackRate = speed;
          }
          if (this.player.playbackRateValue) {
            this.player.playbackRateValue.textContent = speed.toFixed(2) + 'x';
          }
          this.player.updatePlaybackRateIcon(speed);
        }
      }
    }

    // 处理歌词延迟参数
    const lyricDelayMs = urlParams.get('ms');
    if (lyricDelayMs) {
      const delay = parseInt(lyricDelayMs);
      if (!isNaN(delay)) {
        if (this.player.lyricDelayInput) {
          this.player.lyricDelayInput.value = delay.toString();
          this.player.state.lyricDelay = delay;
        }
      }
    }

    // 处理音量参数
    const volume = urlParams.get('vol');
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

        if (this.player.volumeControl) {
          this.player.volumeControl.value = Math.round(vol * 100).toString();
          if (this.player.audio) {
            this.player.audio.volume = vol;
          }
          if (this.player.volumeValue) {
            this.player.volumeValue.textContent = Math.round(vol * 100) + '%';
          }
          this.player.updateVolumeIcon(Math.round(vol * 100));
        }
      }
    }

    // 处理循环播放参数
    if (urlParams.has('loop')) {
      const loopPlay = urlParams.get('loop') === '1' || urlParams.get('loop') === 'true';
      if (this.player.loopPlayCheckbox) {
        this.player.loopPlayCheckbox.checked = loopPlay;
        this.player.state.loopPlay = loopPlay;
      }
    }

    // 处理歌曲标题参数
    if (this.player.songTitleInput && !this.player.songTitleInput.value) {
      const urlTitle = urlParams.get('title');
      if (urlTitle) {
        this.player.songTitleInput.value = urlTitle;
        this.player.state.songTitle = urlTitle;
      }
    }

    // 处理歌曲艺术家参数
    if (this.player.songArtistInput && !this.player.songArtistInput.value) {
      const urlArtist = urlParams.get('artist');
      if (urlArtist) {
        this.player.songArtistInput.value = urlArtist;
        this.player.state.songArtist = urlArtist;
      }
    }

    // 更新文档标题
    if (this.player.state.songTitle) {
      if (this.player.state.songArtist) {
        document.title = `${this.player.state.songArtist} - ${this.player.state.songTitle} | AMLL Web Player`;
      } else {
        document.title = `${this.player.state.songTitle} | AMLL Web Player`;
      }
    }

    // 加载音乐URL
    if (musicUrl) {
      this.player.state.musicUrl = musicUrl;
      this.player.audio.src = musicUrl;
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
      this.player.updateMediaSessionMetadata();
      this.player.updateFileInputDisplay('musicFile', musicUrl);
    }

    // 加载歌词URL
    if (lyricUrl) {
      await this.loadLyricFromUrl(lyricUrl);
    }

    // 加载封面URL
    if (coverUrl) {
      await this.loadCoverFromUrl(coverUrl);
    }

    // 更新歌曲信息
    this.player.updateSongInfo();

    // 隐藏控制面板
    if (this.player.controlPanel) {
      this.player.controlPanel.style.width = '0px';
      this.player.controlPanel.style.right = '-50px';
      this.player.controlPanel.style.opacity = '0';
    }

    // 再次更新文档标题
    const title = this.player.state.songTitle;
    const artist = this.player.state.songArtist;
    if (title) {
      if (artist) {
        document.title = `${artist} - ${title} | AMLL Web Player`;
      } else {
        document.title = `${title} | AMLL Web Player`;
      }
    }

    // 设置当前播放时间
    const currentTime = urlParams.get('t');
    if (currentTime && this.player.audio) {
      const time = parseFloat(currentTime);
      if (!isNaN(time) && time >= 0) {
        this.player.audio.currentTime = time;
      }
    }

    this.player.showStatus(t('loadFromUrlComplete'));
  }

  /**
   * 从URL加载歌词
   * @param lyricUrl 歌词URL
   * @returns Promise<void>
   */
  private async loadLyricFromUrl(lyricUrl: string): Promise<void> {
    this.player.state.lyricUrl = lyricUrl;

    const urlPattern = /^https?:\/\/.+/;
    if (urlPattern.test(lyricUrl.trim())) {
      try {
        const response = await fetch(lyricUrl);
        const text = await response.text();

        // 直接加载歌词内容，无需格式检测
        await this.player.loadLyricContent(text, lyricUrl);
        this.player.updateFileInputDisplay('lyricFile', lyricUrl);
      } catch (error) {
        this.player.showStatus(t('lyricsUrlLoadFailed'), true);
      }
    } else {
      await this.player.processLyricInput(lyricUrl);
    }
  }

  /**
   * 从URL加载封面
   * @param coverUrl 封面URL
   * @returns Promise<void>
   */
  private async loadCoverFromUrl(coverUrl: string): Promise<void> {
    const urlPattern = /^https?:\/\/.+/;
    if (urlPattern.test(coverUrl.trim())) {
      this.player.state.coverUrl = coverUrl;
      this.player.updateBackground();
      this.player.background.setAlbum(coverUrl || './assets/icon-512x512.png');
      await this.player.extractAndProcessCoverColor(coverUrl);
      this.player.applyDominantColorAsCSSVariable();
      this.player.updateFileInputDisplay('coverFile', coverUrl);
    } else {
      const base64Pattern = /^data:([^;]+)(;charset=([^;]+))?;base64,([A-Za-z0-9+/=]+)$/;
      const base64Match = coverUrl.trim().match(base64Pattern);
      if (base64Match) {
        const contentType = base64Match[1] || 'image/png';
        const charset = base64Match[3] || 'utf-8';
        this.player.state.coverUrl = coverUrl;
        this.player.updateBackground();
        this.player.background.setAlbum(coverUrl || './assets/icon-512x512.png');
        await this.player.extractAndProcessCoverColor(coverUrl);
        this.player.applyDominantColorAsCSSVariable();
        this.player.updateFileInputDisplay('coverFile', `Base64 Encoded Input (${contentType})`);
      } else {
        this.player.state.coverUrl = coverUrl;
        this.player.updateBackground();
        this.player.background.setAlbum(coverUrl || './assets/icon-512x512.png');
        await this.player.extractAndProcessCoverColor(coverUrl);
        this.player.applyDominantColorAsCSSVariable();
        this.player.updateFileInputDisplay('coverFile', coverUrl);
      }
    }
  }
}
