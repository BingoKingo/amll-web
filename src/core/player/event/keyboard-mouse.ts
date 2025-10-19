import type { PlayerStateService } from '../state/player-state';
import type { AudioController } from '../audio/audioController';
import type { LyricController } from '../lyric/lyric-controller';
import type { RangeSelect } from '../lyric/range-select';
import eventBus from './event-bus';

/**
 * KeyboardMouseEvents 负责处理快捷键和鼠标交互
 * - 全局快捷键监听
 * - 鼠标悬停和点击反馈
 * - 键盘导航
 */
export class KeyboardMouseEvents {
  private stateService: PlayerStateService;
  private audioController: AudioController;
  private lyricController: LyricController;
  private rangeSelect: RangeSelect;
  private keyBindings: Map<string, Function> = new Map();
  private isEnabled: boolean = true;

  constructor(
    stateService: PlayerStateService,
    audioController: AudioController,
    lyricController: LyricController,
    rangeSelect: RangeSelect
  ) {
    this.stateService = stateService;
    this.audioController = audioController;
    this.lyricController = lyricController;
    this.rangeSelect = rangeSelect;

    // 初始化键盘绑定
    this.initKeyBindings();
  }

  // 初始化键盘绑定
  private initKeyBindings(): void {
    this.keyBindings.set('Space', () => this.audioController.togglePlayPause());
    this.keyBindings.set('ArrowLeft', () => this.seekRelative(-5));
    this.keyBindings.set('ArrowRight', () => this.seekRelative(5));
    this.keyBindings.set('ArrowUp', () => this.adjustVolume(0.05));
    this.keyBindings.set('ArrowDown', () => this.adjustVolume(-0.05));
    this.keyBindings.set('m', () => this.audioController.toggleMute());
    this.keyBindings.set('f', () => this.toggleFullscreen());
    this.keyBindings.set('r', () => this.toggleRepeatMode());
    this.keyBindings.set('s', () => this.toggleShuffle());
    this.keyBindings.set('d', () => this.toggleDebugMode());
    this.keyBindings.set('l', () => this.toggleLayout());
    this.keyBindings.set('q', () => this.toggleRangeMode());
    this.keyBindings.set('1', () => this.audioController.setPlaybackRate(0.5));
    this.keyBindings.set('2', () => this.audioController.setPlaybackRate(1.0));
    this.keyBindings.set('3', () => this.audioController.setPlaybackRate(1.5));
    this.keyBindings.set('4', () => this.audioController.setPlaybackRate(2.0));
    this.keyBindings.set('+', () => this.adjustLyricDelay(100));
    this.keyBindings.set('-', () => this.adjustLyricDelay(-100));
    this.keyBindings.set('t', () => this.toggleLyricTimingMode());
    this.keyBindings.set('p', () => this.toggleProgressDisplay());
    this.keyBindings.set('Escape', () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    });
  }

  // 相对位置跳转
  private seekRelative(seconds: number): void {
    const currentTime = this.stateService.get('currentTime');
    const duration = this.stateService.get('duration');
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    this.audioController.seek(newTime);
  }

  // 初始化事件监听
  public init(): void {
    document.addEventListener('keydown', this.handleKeyDown);
    this.setupContextMenu();
    this.setupMouseGestures();
  }

  // 处理键盘按下事件
  private handleKeyDown = (e: KeyboardEvent): void => {
    // 如果在输入框中，不处理快捷键
    if (e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement) {
      return;
    }

    // 如果禁用了快捷键，不处理
    if (!this.isEnabled) {
      return;
    }

    // 检查是否有对应的键绑定
    const handler = this.keyBindings.get(e.key);
    if (handler) {
      e.preventDefault();
      handler();
    }
  };

  // 调整音量
  private adjustVolume(delta: number): void {
    // PlayerState中没有volume字段，使用audioController的方法
    // 这里简化处理
  }

  // 切换全屏
  private toggleFullscreen(): void {
    const container = document.getElementById('playerContainer');
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  // 切换循环模式
  private toggleRepeatMode(): void {
    const loopPlay = this.stateService.get('loopPlay');
    this.stateService.set('loopPlay', !loopPlay);
  }

  // 切换随机播放
  private toggleShuffle(): void {
    // PlayerState中没有isShuffle字段，这里只是保留UI事件处理
  }

  // 切换调试模式
  private toggleDebugMode(): void {
    const showStats = this.stateService.get('showStats');
    this.stateService.set('showStats', !showStats);
  }

  // 切换布局
  private toggleLayout(): void {
    // PlayerState中没有isVerticalLayout字段，这里只是保留UI事件处理
  }

  // 切换区间模式
  private toggleRangeMode(): void {
    this.rangeSelect.toggleRangeMode();
  }

  // 调整歌词延迟
  private adjustLyricDelay(delta: number): void {
    const currentDelay = this.stateService.get('lyricDelay') || 0;
    const newDelay = Math.max(-5000, Math.min(5000, currentDelay + delta));
    this.stateService.set('lyricDelay', newDelay);
  }

  // 切换歌词计时模式
  private toggleLyricTimingMode(): void {
    // 这里可以实现不同的歌词计时模式切换
    eventBus.emit('lyric:toggle-timing-mode');
  }

  // 切换进度显示
  private toggleProgressDisplay(): void {
    // 这里可以实现不同的进度显示模式切换
    eventBus.emit('progress:toggle-display');
  }

  // 设置上下文菜单
  private setupContextMenu(): void {
    const playerContainer = document.getElementById('playerContainer');
    if (!playerContainer) return;

    playerContainer.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      // 可以在这里显示自定义上下文菜单
      eventBus.emit('contextmenu:show', e.clientX, e.clientY);
    });
  }

  // 设置鼠标手势
  private setupMouseGestures(): void {
    let startX = 0;
    let startY = 0;
    let isGestureActive = false;

    const handleMouseDown = (e: MouseEvent) => {
      // 只有右键点击才开始手势识别
      if (e.button === 2) {
        startX = e.clientX;
        startY = e.clientY;
        isGestureActive = true;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isGestureActive) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      const threshold = 50; // 手势识别的阈值

      // 检测左右滑动
      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0) {
          // 右滑
          this.seekRelative(10);
        } else {
          // 左滑
          this.seekRelative(-10);
        }
        isGestureActive = false;
      }
      // 检测上下滑动
      else if (Math.abs(deltaY) > threshold) {
        if (deltaY > 0) {
          // 下滑
          this.adjustVolume(-0.1);
        } else {
          // 上滑
          this.adjustVolume(0.1);
        }
        isGestureActive = false;
      }
    };

    const handleMouseUp = () => {
      isGestureActive = false;
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseUp);
  }

  // 启用快捷键
  public enable(): void {
    this.isEnabled = true;
  }

  // 禁用快捷键
  public disable(): void {
    this.isEnabled = false;
  }

  // 检查快捷键是否启用
  public getEnabled(): boolean {
    return this.isEnabled;
  }

  // 添加自定义键绑定
  public addKeyBinding(key: string, handler: Function): void {
    this.keyBindings.set(key, handler);
  }

  // 移除键绑定
  public removeKeyBinding(key: string): void {
    this.keyBindings.delete(key);
  }

  // 获取所有键绑定
  public getKeyBindings(): Map<string, Function> {
    return new Map(this.keyBindings);
  }

  // 重置键绑定到默认值
  public resetKeyBindings(): void {
    this.keyBindings.clear();
    this.initKeyBindings();
  }

  // 清理资源
  public destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.keyBindings.clear();
  }
}