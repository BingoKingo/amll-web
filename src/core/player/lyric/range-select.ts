import type { PlayerState } from '../../../app/types';
import type { DomCache } from '../dom/dom-cache';

/**
 * RangeSelect 负责区间选取和进度条高亮功能
 * - 区间开始/结束时间设置
 * - 区间模式切换
 * - 进度条区间高亮显示
 */
export class RangeSelect {
  private domCache: DomCache;
  private state: PlayerState;
  private audio: HTMLAudioElement;
  private isDraggingStart: boolean = false;
  private isDraggingEnd: boolean = false;

  constructor(domCache: DomCache, state: PlayerState, audio: HTMLAudioElement) {
    this.domCache = domCache;
    this.state = state;
    this.audio = audio;
  }

  // 初始化
  public init(): void {
    // 初始化区间选择相关的DOM元素
    this.setupRangeElements();
    
    // 设置事件监听
    this.setupEventListeners();
    
    // 应用初始区间设置
    this.applyRangeSettings();
  }

  // 初始化区间选择元素
  private setupRangeElements(): void {
    // 确保区间线元素存在
    this.ensureRangeElementsExist();
  }

  // 确保区间线元素存在
  private ensureRangeElementsExist(): void {
    let rangeStartLine = this.domCache.getElement<HTMLElement>('rangeStartLine');
    let rangeEndLine = this.domCache.getElement<HTMLElement>('rangeEndLine');
    let rangeProgressBar = this.domCache.getElement<HTMLElement>('rangeProgressBar');
    const progressBar = this.domCache.getElement<HTMLElement>('progressBar');
    
    if (!progressBar) return;
    
    // 如果区间线元素不存在，创建它们
    if (!rangeStartLine) {
      rangeStartLine = document.createElement('div');
      rangeStartLine.id = 'rangeStartLine';
      rangeStartLine.className = 'range-line range-start-line';
      progressBar.appendChild(rangeStartLine);
    }
    
    if (!rangeEndLine) {
      rangeEndLine = document.createElement('div');
      rangeEndLine.id = 'rangeEndLine';
      rangeEndLine.className = 'range-line range-end-line';
      progressBar.appendChild(rangeEndLine);
    }
    
    if (!rangeProgressBar) {
      rangeProgressBar = document.createElement('div');
      rangeProgressBar.id = 'rangeProgressBar';
      rangeProgressBar.className = 'range-progress-bar';
      progressBar.appendChild(rangeProgressBar);
    }
    
    // 更新缓存
    this.domCache['cacheElement']('rangeStartLine', '#rangeStartLine');
    this.domCache['cacheElement']('rangeEndLine', '#rangeEndLine');
    this.domCache['cacheElement']('rangeProgressBar', '#rangeProgressBar');
  }

  // 设置事件监听
  private setupEventListeners(): void {
    const progressBar = this.domCache.getElement<HTMLElement>('progressBar');
    const rangeStartLine = this.domCache.getElement<HTMLElement>('rangeStartLine');
    const rangeEndLine = this.domCache.getElement<HTMLElement>('rangeEndLine');
    
    if (!progressBar || !rangeStartLine || !rangeEndLine) return;
    
    // 区间开始线拖拽事件
    rangeStartLine.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.isDraggingStart = true;
      this.startDragging();
    });
    
    // 区间结束线拖拽事件
    rangeEndLine.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.isDraggingEnd = true;
      this.startDragging();
    });
    
    // 点击进度条设置区间
    progressBar.addEventListener('click', (e) => {
      if (!this.state.isRangeMode || this.isDraggingStart || this.isDraggingEnd) return;
      
      const rect = progressBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const time = percentage * this.state.duration;
      
      // 如果当前没有设置区间开始时间，设置开始时间
      if (this.state.rangeStartTime === 0) {
        this.setRangeStartTime(time);
      } else if (this.state.rangeEndTime === 0 || time > this.state.rangeStartTime) {
        // 否则设置结束时间
        this.setRangeEndTime(time);
      }
    });
  }

  // 开始拖拽
  private startDragging(): void {
    document.addEventListener('mousemove', this.handleDrag);
    document.addEventListener('mouseup', this.stopDragging);
    document.addEventListener('mouseleave', this.stopDragging);
  }

  // 处理拖拽
  private handleDrag = (e: MouseEvent): void => {
    const progressBar = this.domCache.getElement<HTMLElement>('progressBar');
    if (!progressBar) return;
    
    const rect = progressBar.getBoundingClientRect();
    const dragX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, dragX / rect.width));
    const time = percentage * this.state.duration;
    
    if (this.isDraggingStart) {
      // 确保开始时间不超过结束时间
      const maxTime = this.state.rangeEndTime > 0 ? this.state.rangeEndTime : this.state.duration;
      this.setRangeStartTime(Math.min(time, maxTime - 0.1)); // 确保有最小区间长度
    } else if (this.isDraggingEnd) {
      // 确保结束时间不小于开始时间
      this.setRangeEndTime(Math.max(time, this.state.rangeStartTime + 0.1)); // 确保有最小区间长度
    }
  };

  // 停止拖拽
  private stopDragging = (): void => {
    this.isDraggingStart = false;
    this.isDraggingEnd = false;
    document.removeEventListener('mousemove', this.handleDrag);
    document.removeEventListener('mouseup', this.stopDragging);
    document.removeEventListener('mouseleave', this.stopDragging);
  };

  // 切换区间模式
  public toggleRangeMode(): boolean {
    this.state.isRangeMode = !this.state.isRangeMode;
    this.applyRangeSettings();
    
    // 如果关闭区间模式，重置区间
    if (!this.state.isRangeMode) {
      this.resetRange();
    }
    
    return this.state.isRangeMode;
  }

  // 设置区间模式
  public setRangeMode(enabled: boolean): void {
    this.state.isRangeMode = enabled;
    this.applyRangeSettings();
    
    // 如果关闭区间模式，重置区间
    if (!this.state.isRangeMode) {
      this.resetRange();
    }
  }

  // 设置区间开始时间
  public setRangeStartTime(time: number): void {
    this.state.rangeStartTime = Math.max(0, Math.min(time, this.state.duration));
    this.updateRangeDisplay();
  }

  // 设置区间结束时间
  public setRangeEndTime(time: number): void {
    this.state.rangeEndTime = Math.max(0, Math.min(time, this.state.duration));
    this.updateRangeDisplay();
  }

  // 重置区间
  public resetRange(): void {
    this.state.rangeStartTime = 0;
    this.state.rangeEndTime = 0;
    this.updateRangeDisplay();
  }

  // 应用区间设置
  private applyRangeSettings(): void {
    const rangeStartLine = this.domCache.getElement<HTMLElement>('rangeStartLine');
    const rangeEndLine = this.domCache.getElement<HTMLElement>('rangeEndLine');
    const rangeProgressBar = this.domCache.getElement<HTMLElement>('rangeProgressBar');
    
    if (!rangeStartLine || !rangeEndLine || !rangeProgressBar) return;
    
    // 显示或隐藏区间元素
    if (this.state.isRangeMode) {
      rangeStartLine.style.display = 'block';
      rangeEndLine.style.display = 'block';
      rangeProgressBar.style.display = 'block';
    } else {
      rangeStartLine.style.display = 'none';
      rangeEndLine.style.display = 'none';
      rangeProgressBar.style.display = 'none';
    }
    
    // 更新区间显示
    this.updateRangeDisplay();
  }

  // 更新区间显示
  private updateRangeDisplay(): void {
    const rangeStartLine = this.domCache.getElement<HTMLElement>('rangeStartLine');
    const rangeEndLine = this.domCache.getElement<HTMLElement>('rangeEndLine');
    const rangeProgressBar = this.domCache.getElement<HTMLElement>('rangeProgressBar');
    
    if (!rangeStartLine || !rangeEndLine || !rangeProgressBar || this.state.duration <= 0) return;
    
    // 计算开始和结束位置的百分比
    const startPercentage = (this.state.rangeStartTime / this.state.duration) * 100;
    const endPercentage = (this.state.rangeEndTime / this.state.duration) * 100;
    
    // 设置区间线的位置
    rangeStartLine.style.left = `${startPercentage}%`;
    rangeEndLine.style.left = `${endPercentage}%`;
    
    // 设置区间进度条的位置和宽度
    if (this.state.rangeStartTime > 0 && this.state.rangeEndTime > 0) {
      const width = endPercentage - startPercentage;
      rangeProgressBar.style.left = `${startPercentage}%`;
      rangeProgressBar.style.width = `${width}%`;
    } else {
      rangeProgressBar.style.width = '0';
    }
  }

  // 检查当前时间是否在区间内
  public isInRange(currentTime: number): boolean {
    if (!this.state.isRangeMode) return true; // 如果不是区间模式，总是返回true
    
    // 如果区间未完全设置，也返回true
    if (this.state.rangeStartTime === 0 || this.state.rangeEndTime === 0) return true;
    
    return currentTime >= this.state.rangeStartTime && currentTime <= this.state.rangeEndTime;
  }

  // 检查是否需要循环播放区间
  public shouldLoopRange(currentTime: number): boolean {
    if (!this.state.isRangeMode || this.state.rangeEndTime === 0) return false;
    
    return currentTime >= this.state.rangeEndTime;
  }

  // 获取区间开始时间
  public getRangeStartTime(): number {
    return this.state.rangeStartTime;
  }

  // 获取区间结束时间
  public getRangeEndTime(): number {
    return this.state.rangeEndTime;
  }

  // 清理资源
  public destroy(): void {
    // 移除事件监听
    document.removeEventListener('mousemove', this.handleDrag);
    document.removeEventListener('mouseup', this.stopDragging);
    document.removeEventListener('mouseleave', this.stopDragging);
  }
}