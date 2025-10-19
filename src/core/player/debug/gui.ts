import type { PlayerStateService } from '../state/player-state';
import eventBus from '../event/event-bus';

/**
 * DebugGUI 负责集成lil-gui调试面板
 * - 提供可视化配置界面
 * - 仅在开发环境启用
 */
export class DebugGUI {
  private gui: any | null = null;
  private stateService: PlayerStateService;
  private isVisible: boolean = false;
  private panels: Map<string, any> = new Map();
  private debugOptions: Record<string, any> = {};

  constructor(stateService: PlayerStateService) {
    this.stateService = stateService;
    this.initializeDebugOptions();
  }

  // 初始化调试选项
  private initializeDebugOptions(): void {
    // 默认调试选项
    this.debugOptions = {
      showStats: false,
      showBackgroundDebug: false,
      showLyricDebug: false,
      showAudioDebug: false,
      enablePerformanceLogging: false
    };
  }

  // 初始化GUI
  public init(): void {
    // 只在开发环境或开启统计模式时初始化
    const isDevMode = window.location.href.includes('localhost') || window.location.href.includes('127.0.0.1');
    if (!isDevMode && !this.stateService.get('showStats')) {
      return;
    }

    this.loadLilGui();
  }

  // 加载lil-gui
  private async loadLilGui(): Promise<void> {
    try {
      // 这里简化处理，实际项目中可能需要动态导入lil-gui
      // const { GUI } = await import('lil-gui');
      // this.gui = new GUI();

      // 模拟lil-gui的基本功能
      this.initializeMockGui();
      this.setupPanels();
      this.setupEventListeners();
    } catch (error) {
      console.warn('Failed to load lil-gui:', error);
    }
  }

  // 初始化模拟的GUI
  private initializeMockGui(): void {
    // 创建一个简单的GUI面板
    this.gui = {
      title: 'Debug Panel',
      width: 300,
      closed: false,
      params: {}
    };

    console.log('[DebugGUI] Mock GUI initialized');
  }

  // 设置面板
  private setupPanels(): void {
    if (!this.gui) return;

    // 主面板
    this.createMainPanel();

    // 音频面板
    this.createAudioPanel();

    // 歌词面板
    this.createLyricPanel();

    // 背景面板
    this.createBackgroundPanel();
  }

  // 创建主面板
  private createMainPanel(): void {
    const mainPanel = {
      title: 'Main', 
      options: {
        showStats: false,
        enablePerformanceLogging: false,
        resetToDefaults: () => {
          this.resetToDefaults();
        }
      }
    };

    this.panels.set('main', mainPanel);
    console.log('[DebugGUI] Main panel created');
  }

  // 创建音频面板
  private createAudioPanel(): void {
    const audioPanel = {
      title: 'Audio', 
      options: {
        volume: 0.7, // 直接设置默认值，因为PlayerState中没有volume字段
        rate: 1.0, // 直接设置默认值，因为PlayerState中没有playbackRate字段
        fftDataRangeMin: this.stateService.get('fftDataRangeMin') || 0,
        fftDataRangeMax: this.stateService.get('fftDataRangeMax') || 255,
        backgroundLowFreqVolume: this.stateService.get('backgroundLowFreqVolume') || 100
      }
    };

    this.panels.set('audio', audioPanel);
    console.log('[DebugGUI] Audio panel created');
  }

  // 创建歌词面板
  private createLyricPanel(): void {
    const lyricPanel = {
      title: 'Lyrics', 
      options: {
        lyricDelay: this.stateService.get('lyricDelay') || 0,
        wordFadeWidth: this.stateService.get('wordFadeWidth') || 50,
        isRangeMode: this.stateService.get('isRangeMode') || false,
        rangeStartTime: this.stateService.get('rangeStartTime') || 0,
        rangeEndTime: this.stateService.get('rangeEndTime') || 0
      }
    };

    this.panels.set('lyric', lyricPanel);
    console.log('[DebugGUI] Lyric panel created');
  }

  // 创建背景面板
  private createBackgroundPanel(): void {
    const backgroundPanel = {
      title: 'Background', 
      options: {
        backgroundFlowSpeed: this.stateService.get('backgroundFlowSpeed') || 1,
        backgroundRenderScale: this.stateService.get('backgroundRenderScale') || 1,
        backgroundMaskOpacity: this.stateService.get('backgroundMaskOpacity') || 0.5,
        invertColors: this.stateService.get('invertColors') || false
      }
    };

    this.panels.set('background', backgroundPanel);
    console.log('[DebugGUI] Background panel created');
  }

  // 设置事件监听
  private setupEventListeners(): void {
    // 监听状态变更事件
    eventBus.on('state:changed', this.handleStateChange);

    // 监听调试模式开关事件
    eventBus.on('debug:toggle', this.toggle);
  }

  // 处理状态变更
  private handleStateChange = (data: { key: string; value: any }): void => {
    // 更新GUI面板中的对应值
    // 这里简化处理，实际项目中需要遍历面板并更新对应选项
    console.log('[DebugGUI] State changed:', data.key, data.value);
  };

  // 显示GUI
  public show(): void {
    this.isVisible = true;
    console.log('[DebugGUI] Debug panel shown');

    // 触发GUI显示事件
    eventBus.emit('debug:panel-shown');
  }

  // 隐藏GUI
  public hide(): void {
    this.isVisible = false;
    console.log('[DebugGUI] Debug panel hidden');

    // 触发GUI隐藏事件
    eventBus.emit('debug:panel-hidden');
  }

  // 切换显示/隐藏状态
  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  // 获取当前显示状态
  public getIsVisible(): boolean {
    return this.isVisible;
  }

  // 重置为默认值
  public resetToDefaults(): void {
    // 重置所有面板的选项为默认值
    this.panels.forEach((panel, name) => {
      console.log(`[DebugGUI] Resetting ${name} panel to defaults`);
    });

    // 触发重置事件
    eventBus.emit('debug:reset-to-defaults');
  }

  // 启用特定面板
  public enablePanel(panelName: string): void {
    const panel = this.panels.get(panelName);
    if (panel) {
      console.log(`[DebugGUI] Enabled ${panelName} panel`);
    }
  }

  // 禁用特定面板
  public disablePanel(panelName: string): void {
    const panel = this.panels.get(panelName);
    if (panel) {
      console.log(`[DebugGUI] Disabled ${panelName} panel`);
    }
  }

  // 设置特定选项的值
  public setOption(panelName: string, optionName: string, value: any): void {
    const panel = this.panels.get(panelName);
    if (panel && panel.options.hasOwnProperty(optionName)) {
      panel.options[optionName] = value;
      console.log(`[DebugGUI] Set ${panelName}.${optionName} to ${value}`);

      // 如果是状态相关的选项，更新状态
      if (['volume', 'playbackRate', 'lyricDelay', 'wordFadeWidth', 'isRangeMode', 'rangeStartTime', 'rangeEndTime', 'backgroundFlowSpeed', 'renderScale', 'fps', 'maskOpacity', 'invertColors'].includes(optionName)) {
        this.stateService.set(optionName as any, value);
      }
    }
  }

  // 获取特定选项的值
  public getOption(panelName: string, optionName: string): any {
    const panel = this.panels.get(panelName);
    if (panel && panel.options.hasOwnProperty(optionName)) {
      return panel.options[optionName];
    }
    return null;
  }

  // 清理资源
  public destroy(): void {
    // 移除事件监听
    eventBus.off('state:changed', this.handleStateChange);
    eventBus.off('debug:toggle', this.toggle);

    // 清空面板
    this.panels.clear();

    this.gui = null;
    console.log('[DebugGUI] Debug panel destroyed');
  }
}

// 导出一个默认实例
let defaultDebugGUI: DebugGUI | null = null;

export const getDebugGUI = (stateService?: PlayerStateService): DebugGUI => {
  if (!defaultDebugGUI && stateService) {
    defaultDebugGUI = new DebugGUI(stateService);
  }

  if (!defaultDebugGUI) {
    throw new Error('DebugGUI not initialized. Call initialize() first with a valid PlayerStateService.');
  }

  return defaultDebugGUI;
};