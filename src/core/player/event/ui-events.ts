import type { PlayerStateService } from '../state/player-state';
import type { AudioController } from '../audio/audioController';
import type { BackgroundController } from '../background/background-controller';
import type { RangeSelect } from '../lyric/range-select';
import type { DomCache } from '../dom/dom-cache';
import { debounce } from '../../../app/utils';
import eventBus from './event-bus';

/**
 * UIEvents 负责处理 UI 控件输入、滚轮微调、拖拽、全屏、布局切换等事件
 * - 与 dom-update、state 通过接口交互
 * - 禁止直接访问全局
 */
export class UIEvents {
  private domCache: DomCache;
  private stateService: PlayerStateService;
  private audioController: AudioController;
  private backgroundController: BackgroundController;
  private rangeSelect: RangeSelect;
  private isDragging: boolean = false;

  constructor(
    domCache: DomCache,
    stateService: PlayerStateService,
    audioController: AudioController,
    backgroundController: BackgroundController,
    rangeSelect: RangeSelect
  ) {
    this.domCache = domCache;
    this.stateService = stateService;
    this.audioController = audioController;
    this.backgroundController = backgroundController;
    this.rangeSelect = rangeSelect;
  }

  // 初始化 UI 事件
  public init(): void {
    this.setupPlayPauseButton();
    this.setupProgressBar();
    this.setupVolumeControl();
    this.setupSpeedControl();
    this.setupRepeatControl();
    this.setupShuffleControl();
    this.setupFullscreenControl();
    this.setupLayoutControl();
    this.setupMarqueeControl();
    this.setupRangeModeControl();
    this.setupWheelControl();
    this.setupDragAndDrop();
    this.setupCoverControls();
  }

  // 设置播放/暂停按钮事件
  private setupPlayPauseButton(): void {
    const playButton = this.domCache.getElement<HTMLButtonElement>('playButton');
    if (!playButton) return;

    playButton.addEventListener('click', () => {
      const isPlaying = this.stateService.get('isPlaying');
      this.audioController.togglePlayPause();
    });
  }

  // 设置进度条事件
  private setupProgressBar(): void {
    const progressBar = this.domCache.getElement<HTMLElement>('progressBar');
    const progressBarFill = this.domCache.getElement<HTMLElement>('progressBarFill');
    if (!progressBar || !progressBarFill) return;

    // 点击进度条跳转
    progressBar.addEventListener('click', (e) => {
      if (this.isDragging || this.rangeSelect.getRangeStartTime() > 0 && this.rangeSelect.getRangeEndTime() > 0) {
        return;
      }

      const rect = progressBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newTime = percentage * this.stateService.get('duration');

      this.audioController.seek(newTime);
    });

    // 拖拽进度条
    progressBar.addEventListener('mousedown', (e) => {
      if (this.rangeSelect.getRangeStartTime() > 0 && this.rangeSelect.getRangeEndTime() > 0) {
        return;
      }

      this.isDragging = true;
      document.addEventListener('mousemove', this.handleProgressDrag as EventListenerOrEventListenerObject);
      document.addEventListener('mouseup', this.handleProgressDragEnd as EventListenerOrEventListenerObject);
      document.addEventListener('mouseleave', this.handleProgressDragEnd as EventListenerOrEventListenerObject);
    });
  }

  // 处理进度条拖拽
  private handleProgressDrag = debounce((e: MouseEvent): void => {
    const progressBar = this.domCache.getElement<HTMLElement>('progressBar');
    if (!progressBar) return;

    const rect = progressBar.getBoundingClientRect();
    const dragX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, dragX / rect.width));
    const newTime = percentage * this.stateService.get('duration');

    // 发布预览位置事件，但不实际跳转
    eventBus.emit('progress:preview', newTime);
  }, 16);

  // 处理进度条拖拽结束
  private handleProgressDragEnd = (): void => {
    if (!this.isDragging) return;

    this.isDragging = false;
    document.removeEventListener('mousemove', this.handleProgressDrag as EventListenerOrEventListenerObject);
    document.removeEventListener('mouseup', this.handleProgressDragEnd as EventListenerOrEventListenerObject);
    document.removeEventListener('mouseleave', this.handleProgressDragEnd as EventListenerOrEventListenerObject);
  };

  // 设置音量控制事件
  private setupVolumeControl(): void {
    const volumeSlider = this.domCache.getElement<HTMLInputElement>('volumeSlider');
    const muteButton = this.domCache.getElement<HTMLButtonElement>('muteButton');

    if (volumeSlider) {
      volumeSlider.addEventListener('input', () => {
        const volume = parseFloat(volumeSlider.value);
        this.audioController.setVolume(volume);
      });
    }

    if (muteButton) {
      muteButton.addEventListener('click', () => {
        this.audioController.toggleMute();
      });
    }
  }

  // 设置速度控制事件
  private setupSpeedControl(): void {
    const speedSelect = this.domCache.getElement<HTMLSelectElement>('speedSelect');
    if (!speedSelect) return;

    speedSelect.addEventListener('change', () => {
      const speed = parseFloat(speedSelect.value);
      this.audioController.setPlaybackRate(speed);
    });
  }

  // 设置循环控制事件
  private setupRepeatControl(): void {
    const repeatButton = this.domCache.getElement<HTMLButtonElement>('repeatButton');
    if (!repeatButton) return;

    repeatButton.addEventListener('click', () => {
      const loopPlay = this.stateService.get('loopPlay');
      this.stateService.set('loopPlay', !loopPlay);
      
      // 更新按钮样式
      this.updateRepeatButtonStyle(repeatButton, loopPlay ? 'none' : 'all');
    });
  }

  // 更新循环按钮样式
  private updateRepeatButtonStyle(button: HTMLButtonElement, mode: 'none' | 'all' | 'one'): void {
    button.className = `repeat-button repeat-${mode}`;
    button.title = {
      'none': '不循环',
      'all': '循环播放',
      'one': '单曲循环'
    }[mode];
  }

  // 设置随机播放控制事件
  private setupShuffleControl(): void {
    const shuffleButton = this.domCache.getElement<HTMLButtonElement>('shuffleButton');
    if (!shuffleButton) return;

    shuffleButton.addEventListener('click', () => {
      // PlayerState中没有isShuffle字段，这里只是保留UI事件处理
    });
  }

  // 设置全屏控制事件
  private setupFullscreenControl(): void {
    const fullscreenButton = this.domCache.getElement<HTMLButtonElement>('fullscreenButton');
    if (!fullscreenButton) return;

    fullscreenButton.addEventListener('click', () => {
      this.toggleFullscreen();
    });
  }

  // 切换全屏
  private toggleFullscreen(): void {
    const container = this.domCache.getElement<HTMLElement>('playerContainer');
    if (!container) return;

    if (!document.fullscreenElement) {
      // 进入全屏
      container.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      // 退出全屏
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  // 设置布局控制事件
  private setupLayoutControl(): void {
    const layoutButton = this.domCache.getElement<HTMLButtonElement>('layoutButton');
    if (!layoutButton) return;

    layoutButton.addEventListener('click', () => {
      // PlayerState中没有isVerticalLayout字段，这里只是保留UI事件处理
    });
  }

  // 设置跑马灯控制事件
  private setupMarqueeControl(): void {
    const marqueeButton = this.domCache.getElement<HTMLButtonElement>('marqueeButton');
    if (!marqueeButton) return;

    marqueeButton.addEventListener('click', () => {
      const marqueeEnabled = this.stateService.get('marqueeEnabled');
      this.stateService.set('marqueeEnabled', !marqueeEnabled);
    });
  }

  // 设置区间模式控制事件
  private setupRangeModeControl(): void {
    const rangeModeButton = this.domCache.getElement<HTMLButtonElement>('rangeModeButton');
    if (!rangeModeButton) return;

    rangeModeButton.addEventListener('click', () => {
      this.rangeSelect.toggleRangeMode();
    });
  }

  // 设置滚轮控制事件
  private setupWheelControl(): void {
    const playerContainer = this.domCache.getElement<HTMLElement>('playerContainer');
    if (!playerContainer) return;

    playerContainer.addEventListener('wheel', (e) => {
      // 如果按下Ctrl键，调整音量
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        // PlayerState中没有volume字段，但我们仍然可以使用audioController提供的功能
        // 这里简化处理
      }
      // 如果按下Shift键，调整速度
      else if (e.shiftKey) {
        e.preventDefault();
        // PlayerState中没有speed字段，但我们仍然可以使用audioController提供的功能
        // 这里简化处理
      }
      // 否则调整播放进度
      else {
        e.preventDefault();
        const duration = this.stateService.get('duration');
        const delta = e.deltaY > 0 ? -5 : 5;
        const currentTime = this.stateService.get('currentTime');
        const newTime = Math.max(0, Math.min(duration, currentTime + delta));
        this.audioController.seek(newTime);
      }
    });
  }

  // 设置拖拽上传事件
  private setupDragAndDrop(): void {
    const dropArea = this.domCache.getElement<HTMLElement>('playerContainer');
    if (!dropArea) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      dropArea.classList.add('drag-over');
    };

    const handleDragLeave = () => {
      dropArea.classList.remove('drag-over');
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dropArea.classList.remove('drag-over');

      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        eventBus.emit('file:dropped', files);
      }
    };

    dropArea.addEventListener('dragover', handleDragOver);
    dropArea.addEventListener('dragleave', handleDragLeave);
    dropArea.addEventListener('drop', handleDrop);
  }

  // 设置封面控制事件
  private setupCoverControls(): void {
    const coverElement = this.domCache.getElement<HTMLImageElement>('cover');
    if (!coverElement) return;

    // 点击封面切换旋转状态
    coverElement.addEventListener('click', () => {
      // PlayerState中没有coverRotation字段，这里只是保留UI事件处理
    });

    // 双击封面切换圆角状态
    coverElement.addEventListener('dblclick', () => {
      const roundedCover = this.stateService.get('roundedCover');
      this.stateService.set('roundedCover', roundedCover > 0 ? 0 : 10);
    });
  }

  // 清理事件监听
  public destroy(): void {
    // 移除进度条拖拽相关的事件监听
    document.removeEventListener('mousemove', this.handleProgressDrag as EventListenerOrEventListenerObject);
    document.removeEventListener('mouseup', this.handleProgressDragEnd as EventListenerOrEventListenerObject);
    document.removeEventListener('mouseleave', this.handleProgressDragEnd as EventListenerOrEventListenerObject);
  }
}