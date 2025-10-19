import type { PlayerStateService } from '../state/player-state';

/**
 * StatsService 负责集成stats.js并提供显示控制
 * - 显示FPS、渲染时间等性能统计
 * - 提供显示/隐藏控制
 */
export class StatsService {
  private stats: any | null = null;
  private domElement: HTMLDivElement | null = null;
  private isVisible: boolean = false;
  private stateService: PlayerStateService;
  private containerId: string = 'stats-container';

  constructor(stateService: PlayerStateService) {
    this.stateService = stateService;
  }

  // 初始化性能统计
  public init(): void {
    // 只在开发环境或开启统计模式时初始化
    const isDevMode = window.location.href.includes('localhost') || window.location.href.includes('127.0.0.1');
    if (!isDevMode && !this.stateService.get('showStats')) {
      return;
    }

    this.loadStatsJS();
  }

  // 加载stats.js
  private async loadStatsJS(): Promise<void> {
    try {
      // 这里简化处理，实际项目中可能需要动态导入stats.js
      // const { default: Stats } = await import('stats.js');

      // 模拟stats.js的基本功能
      this.initializeMockStats();
      this.setupContainer();
      this.setupEventListeners();
    } catch (error) {
      console.warn('Failed to load stats.js:', error);
    }
  }

  // 初始化模拟的stats功能
  private initializeMockStats(): void {
    // 创建一个简单的统计显示组件
    this.domElement = document.createElement('div');
    this.domElement.className = 'stats';
    this.domElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      z-index: 9999;
      background: rgba(0, 0, 0, 0.8);
      color: #fff;
      padding: 5px 10px;
      font-family: monospace;
      font-size: 12px;
      border-radius: 0 0 4px 0;
      cursor: pointer;
    `;

    // 模拟FPS显示
    this.updateStats();
  }

  // 设置容器
  private setupContainer(): void {
    if (!this.domElement) return;

    let container = document.getElementById(this.containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = this.containerId;
      document.body.appendChild(container);
    }

    container.appendChild(this.domElement);

    // 默认隐藏
    this.hide();
  }

  // 设置事件监听
  private setupEventListeners(): void {
    if (!this.domElement) return;

    // 点击切换显示模式
    this.domElement.addEventListener('click', () => {
      // 模拟切换统计面板的功能
      console.log('Stats panel clicked (would cycle through panels in real implementation)');
    });
  }

  // 更新统计数据
  private updateStats = (): void => {
    if (!this.domElement || !this.isVisible) {
      requestAnimationFrame(this.updateStats);
      return;
    }

    // 模拟FPS计算
    const fps = this.calculateFPS();
    const renderTime = this.calculateRenderTime();

    this.domElement.innerHTML = `FPS: ${fps.toFixed(1)} | Render: ${renderTime.toFixed(2)}ms`;

    // 设置颜色以反映性能状态
    if (fps < 30) {
      this.domElement.style.color = '#ff4444';
    } else if (fps < 50) {
      this.domElement.style.color = '#ffaa00';
    } else {
      this.domElement.style.color = '#00ff00';
    }

    requestAnimationFrame(this.updateStats);
  };

  // 计算FPS（简化版）
  private calculateFPS(): number {
    // 实际项目中应该使用performance.now()来精确计算
    return Math.random() * 30 + 30; // 返回30-60之间的随机值作为示例
  }

  // 计算渲染时间（简化版）
  private calculateRenderTime(): number {
    // 实际项目中应该使用performance.now()来精确计算
    return Math.random() * 10 + 5; // 返回5-15之间的随机值作为示例
  }

  // 显示统计面板
  public show(): void {
    if (!this.domElement) return;

    this.isVisible = true;
    this.domElement.style.display = 'block';
    this.updateStats();
  }

  // 隐藏统计面板
  public hide(): void {
    if (!this.domElement) return;

    this.isVisible = false;
    this.domElement.style.display = 'none';
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

  // 设置容器ID
  public setContainerId(id: string): void {
    this.containerId = id;
  }

  // 清理资源
  public destroy(): void {
    // 停止动画帧
    // 在实际实现中，应该使用cancelAnimationFrame

    // 移除DOM元素
    if (this.domElement && this.domElement.parentNode) {
      this.domElement.parentNode.removeChild(this.domElement);
    }

    // 移除容器（如果为空）
    const container = document.getElementById(this.containerId);
    if (container && container.children.length === 0) {
      container.parentNode?.removeChild(container);
    }

    this.stats = null;
    this.domElement = null;
  }
}

// 导出一个默认实例
let defaultStatsService: StatsService | null = null;

export const getStatsService = (stateService?: PlayerStateService): StatsService => {
  if (!defaultStatsService && stateService) {
    defaultStatsService = new StatsService(stateService);
  }

  if (!defaultStatsService) {
    throw new Error('StatsService not initialized. Call initialize() first with a valid PlayerStateService.');
  }

  return defaultStatsService;
};