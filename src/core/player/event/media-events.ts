import type { AudioController } from '../audio/audioController';
import type { LyricController } from '../lyric/lyric-controller';
import type { RangeSelect } from '../lyric/range-select';
import type { PlayerStateService } from '../state/player-state';
import eventBus from './event-bus';

/**
 * MediaEvents 负责处理 Audio 媒体事件和 MediaSession
 * - 监听音频元素的各种事件
 * - 管理媒体会话
 * - 处理播放状态变化
 */
export class MediaEvents {
  private audio: HTMLAudioElement;
  private stateService: PlayerStateService;
  private audioController: AudioController;
  private lyricController: LyricController;
  private rangeSelect: RangeSelect;
  private mediaSessionSupported: boolean = 'mediaSession' in navigator;
  private lastPositionUpdateTime: number = 0;
  private positionUpdateInterval: number = 100; // 位置更新间隔（毫秒）

  constructor(
    audio: HTMLAudioElement,
    stateService: PlayerStateService,
    audioController: AudioController,
    lyricController: LyricController,
    rangeSelect: RangeSelect
  ) {
    this.audio = audio;
    this.stateService = stateService;
    this.audioController = audioController;
    this.lyricController = lyricController;
    this.rangeSelect = rangeSelect;
  }

  // 初始化媒体事件
  public init(): void {
    this.setupAudioElementEvents();
    if (this.mediaSessionSupported) {
      this.setupMediaSession();
    }
  }

  // 设置音频元素事件
  private setupAudioElementEvents(): void {
    // 加载元数据完成
    this.audio.addEventListener('loadedmetadata', this.handleLoadedMetadata);

    // 时间更新
    this.audio.addEventListener('timeupdate', this.handleTimeUpdate);

    // 播放状态改变
    this.audio.addEventListener('play', this.handlePlay);
    this.audio.addEventListener('pause', this.handlePause);

    // 播放结束
    this.audio.addEventListener('ended', this.handleEnded);

    // 音量改变
    this.audio.addEventListener('volumechange', this.handleVolumeChange);

    // 加载进度更新
    this.audio.addEventListener('progress', this.handleProgress);

    // 加载开始
    this.audio.addEventListener('loadstart', this.handleLoadStart);

    // 加载完成
    this.audio.addEventListener('loadeddata', this.handleLoadedData);

    // 播放错误
    this.audio.addEventListener('error', this.handleError);

    // 缓冲开始
    this.audio.addEventListener('waiting', this.handleWaiting);

    // 缓冲结束
    this.audio.addEventListener('canplay', this.handleCanPlay);
  }

  // 处理加载元数据完成
  private handleLoadedMetadata = (): void => {
    const duration = this.audio.duration || 0;
    this.stateService.set('duration', duration);
    eventBus.emit('audio:metadata-loaded', { duration });
  };

  // 处理时间更新
  private handleTimeUpdate = (): void => {
    // 限制更新频率，避免性能问题
    const now = Date.now();
    if (now - this.lastPositionUpdateTime < this.positionUpdateInterval) {
      return;
    }

    this.lastPositionUpdateTime = now;

    const currentPosition = this.audio.currentTime || 0;

    // 检查是否在区间模式下，且需要循环播放
    if (this.rangeSelect.shouldLoopRange(currentPosition)) {
      this.audio.currentTime = this.rangeSelect.getRangeStartTime();
      return;
    }

    this.stateService.set('currentTime', currentPosition);
    eventBus.emit('audio:time-update', { currentPosition });

    // 更新歌词显示
    // 注释掉，因为LyricController没有updatePosition方法
    // this.lyricController.updatePosition(currentPosition);
  };

  // 处理播放
  private handlePlay = (): void => {
    this.stateService.set('isPlaying', true);
    eventBus.emit('audio:play');
  };

  // 处理暂停
  private handlePause = (): void => {
    this.stateService.set('isPlaying', false);
    eventBus.emit('audio:pause');
  };

  // 处理播放结束
  private handleEnded = (): void => {
    const loopPlay = this.stateService.get('loopPlay');

    if (loopPlay) {
      // 单曲循环
      this.audio.currentTime = 0;
      this.audio.play();
    } else {
      // 不循环，停止播放
      this.stateService.set('isPlaying', false);
      eventBus.emit('audio:ended');
    }
  };

  // 处理音量改变
  private handleVolumeChange = (): void => {
    const volume = this.audio.volume;
    const isMuted = this.audio.muted;

    // 音量状态由audio元素本身管理
    eventBus.emit('audio:volume-change', { volume, isMuted });
  };

  // 处理加载进度更新
  private handleProgress = (): void => {
    if (this.audio.buffered.length > 0) {
      const bufferedEnd = this.audio.buffered.end(this.audio.buffered.length - 1);
      const duration = this.audio.duration || 0;
      const bufferedPercentage = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

      eventBus.emit('audio:progress-update', { bufferedPercentage });
    }
  };

  // 处理加载开始
  private handleLoadStart = (): void => {
    eventBus.emit('audio:load-start');
  };

  // 处理加载完成
  private handleLoadedData = (): void => {
    eventBus.emit('audio:data-loaded');
  };

  // 处理播放错误
  private handleError = (event: Event): void => {
    // 类型断言为HTMLMediaElement的事件
    const target = event.target as HTMLMediaElement | null;
    const error = target?.error;

    if (error) {
      let errorMessage = '播放错误';
      switch (error.code) {
        case 1:
          errorMessage = '媒体加载中止';
          break;
        case 2:
          errorMessage = '媒体格式不支持';
          break;
        case 3:
          errorMessage = '媒体解码错误';
          break;
        case 4:
          errorMessage = '媒体网络错误';
          break;
      }

      eventBus.emit('audio:error', { code: error.code, message: errorMessage });
      console.error('Audio playback error:', error.code, errorMessage);
    }
  };

  // 处理缓冲开始
  private handleWaiting = (): void => {
    eventBus.emit('audio:waiting');
  };

  // 处理缓冲结束
  private handleCanPlay = (): void => {
    eventBus.emit('audio:can-play');
  };

  // 设置媒体会话
  private setupMediaSession(): void {
    const mediaSession = navigator.mediaSession;
    if (!mediaSession) return;

    // 设置元数据
    this.updateMediaSessionMetadata();

    // 设置媒体会话操作
    mediaSession.setActionHandler('play', () => {
      // 使用togglePlayPause代替play
      const isPlaying = this.stateService.get('isPlaying');
      if (!isPlaying) {
        this.audioController.togglePlayPause();
      }
    });

    mediaSession.setActionHandler('pause', () => {
      // 使用togglePlayPause代替pause
      const isPlaying = this.stateService.get('isPlaying');
      if (isPlaying) {
        this.audioController.togglePlayPause();
      }
    });

    mediaSession.setActionHandler('previoustrack', () => {
      eventBus.emit('playlist:previous');
    });

    mediaSession.setActionHandler('nexttrack', () => {
      eventBus.emit('playlist:next');
    });

    mediaSession.setActionHandler('seekbackward', (details) => {
      const seekTime = details.seekOffset || 10;
      // 使用seek代替seekRelative
      const currentTime = this.audio.currentTime || 0;
      this.audioController.seek(Math.max(0, currentTime - seekTime));
    });

    mediaSession.setActionHandler('seekforward', (details) => {
      const seekTime = details.seekOffset || 10;
      // 使用seek代替seekRelative
      const currentTime = this.audio.currentTime || 0;
      const duration = this.audio.duration || 0;
      this.audioController.seek(Math.min(duration, currentTime + seekTime));
    });

    mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) {
        this.audioController.seek(details.seekTime);
      }
    });
  }

  // 更新媒体会话元数据
  public updateMediaSessionMetadata(): void {
    if (!this.mediaSessionSupported || !navigator.mediaSession) return;

    const songTitle = this.stateService.get('songTitle') || '未知歌曲';
    const songArtist = this.stateService.get('songArtist') || '未知艺术家';

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: songTitle,
        artist: songArtist,
        album: 'Web Lyrics Player',
        artwork: [
          { src: '/assets/default-cover.png', sizes: '96x96', type: 'image/png' },
          { src: '/assets/default-cover.png', sizes: '128x128', type: 'image/png' },
          { src: '/assets/default-cover.png', sizes: '192x192', type: 'image/png' },
          { src: '/assets/default-cover.png', sizes: '256x256', type: 'image/png' },
          { src: '/assets/default-cover.png', sizes: '384x384', type: 'image/png' },
          { src: '/assets/default-cover.png', sizes: '512x512', type: 'image/png' },
        ]
      });
    } catch (error) {
      console.warn('Failed to update media session metadata:', error);
    }
  }

  // 设置位置更新间隔
  public setPositionUpdateInterval(interval: number): void {
    this.positionUpdateInterval = Math.max(50, Math.min(1000, interval));
  }

  // 获取媒体会话支持状态
  public isMediaSessionSupported(): boolean {
    return this.mediaSessionSupported;
  }

  // 清理资源
  public destroy(): void {
    // 移除所有事件监听
    this.audio.removeEventListener('loadedmetadata', this.handleLoadedMetadata);
    this.audio.removeEventListener('timeupdate', this.handleTimeUpdate);
    this.audio.removeEventListener('play', this.handlePlay);
    this.audio.removeEventListener('pause', this.handlePause);
    this.audio.removeEventListener('ended', this.handleEnded);
    this.audio.removeEventListener('volumechange', this.handleVolumeChange);
    this.audio.removeEventListener('progress', this.handleProgress);
    this.audio.removeEventListener('loadstart', this.handleLoadStart);
    this.audio.removeEventListener('loadeddata', this.handleLoadedData);
    this.audio.removeEventListener('error', this.handleError);
    this.audio.removeEventListener('waiting', this.handleWaiting);
    this.audio.removeEventListener('canplay', this.handleCanPlay);

    // 清除媒体会话
    if (this.mediaSessionSupported && navigator.mediaSession) {
      // 重置媒体会话操作
      const actions = ['play', 'pause', 'previoustrack', 'nexttrack', 'seekbackward', 'seekforward', 'seekto'];
      actions.forEach(action => {
        navigator.mediaSession.setActionHandler(action as MediaSessionAction, null);
      });

      // 清除元数据
      navigator.mediaSession.metadata = null;
    }
  }
}