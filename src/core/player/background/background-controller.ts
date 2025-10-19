import type { PlayerState } from '../../../app/types';
import type { DomCache } from '../dom/dom-cache';
import { getElement } from '../../../app/utils';
import { BACKGROUND_TYPES, DOM_SELECTORS } from '../../../app/constants';

// 声明全局的BackgroundRender类型
declare global {
  interface Window {
    BackgroundRender?: any;
  }
}

/**
 * BackgroundController 负责管理背景渲染
 * - BackgroundRender 生命周期
 * - 动态/静态切换
 * - FPS/FlowSpeed 控制
 * - 渲染比例设置
 */
export class BackgroundController {
  private domCache: DomCache;
  private state: PlayerState;
  private backgroundRenderer: any = null; // 实际的背景渲染器
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 60;
  private frameInterval: number = 1000 / 60; // 默认60fps

  constructor(domCache: DomCache, state: PlayerState) {
    this.domCache = domCache;
    this.state = state;
  }

  // 初始化背景
  public init(): void {
    // 设置FPS和渲染间隔
    this.updateFPS(this.state.backgroundFPS);

    // 初始化背景元素
    this.setupBackgroundElements();

    // 如果支持，初始化背景渲染器
    if (typeof window.BackgroundRender !== 'undefined') {
      this.initializeBackgroundRenderer();
    }
  }

  // 初始化背景渲染器
  private initializeBackgroundRenderer(): void {
    const coverBlurBackground = this.domCache.getElement<HTMLElement>('coverBlurBackground');
    if (!coverBlurBackground) return;

    try {
      this.backgroundRenderer = new window.BackgroundRender(coverBlurBackground, {
        fps: this.state.backgroundFPS,
        flowSpeed: this.state.backgroundFlowSpeed,
        renderScale: this.state.backgroundRenderScale
      });

      // 根据当前状态设置初始渲染模式
      this.updateBackgroundDynamic(this.state.backgroundDynamic);
    } catch (error) {
      console.error('Failed to initialize background renderer:', error);
    }
  }

  // 设置背景元素
  private setupBackgroundElements(): void {
    // 这里可以设置背景相关的DOM元素
  }

  // 更新背景动态/静态模式
  public updateBackgroundDynamic(isDynamic: boolean): void {
    this.state.backgroundDynamic = isDynamic;

    if (this.backgroundRenderer) {
      if (isDynamic) {
        this.backgroundRenderer.start();
      } else {
        this.backgroundRenderer.stop();
      }
    }
  }

  // 更新背景流动速度
  public updateFlowSpeed(speed: number): void {
    this.state.backgroundFlowSpeed = speed;

    if (this.backgroundRenderer) {
      this.backgroundRenderer.setFlowSpeed(speed);
    }
  }

  // 更新FPS
  public updateFPS(fps: number): void {
    this.state.backgroundFPS = fps;
    this.fps = fps;
    this.frameInterval = 1000 / fps;

    if (this.backgroundRenderer) {
      this.backgroundRenderer.setFPS(fps);
    }
  }

  // 更新渲染比例
  public updateRenderScale(scale: number): void {
    this.state.backgroundRenderScale = scale;

    if (this.backgroundRenderer) {
      this.backgroundRenderer.setRenderScale(scale);
    }
  }

  // 更新背景类型
  public updateBackgroundType(type: 'amll' | 'css' | 'solid'): void {
    this.state.backgroundType = type;
    // 根据类型切换不同的背景实现
    this.applyBackgroundType();
  }

  // 应用背景类型
  private applyBackgroundType(): void {
    const player = this.domCache.getElement<HTMLElement>('player');
    if (!player) return;

    // 移除所有背景类型类
    player.classList.remove('bg-type-amll', 'bg-type-css', 'bg-type-solid');

    // 添加当前背景类型类
    player.classList.add(`bg-type-${this.state.backgroundType}`);

    // 根据不同的背景类型执行不同的逻辑
    switch (this.state.backgroundType) {
      case 'amll':
        this.enableAmllBackground();
        break;
      case 'css':
        this.enableCssBackground();
        break;
      case 'solid':
        this.enableSolidBackground();
        break;
    }
  }

  // 启用AMLL背景
  private enableAmllBackground(): void {
    // 实现AMLL背景逻辑
  }

  // 启用CSS背景
  private enableCssBackground(): void {
    // 实现CSS背景逻辑
  }

  // 启用纯色背景
  private enableSolidBackground(): void {
    // 实现纯色背景逻辑
  }

  // 更新背景遮罩
  public updateBackgroundColorMask(enabled: boolean): void {
    this.state.backgroundColorMask = enabled;
    // 实现背景遮罩逻辑
  }

  // 更新背景遮罩颜色
  public updateBackgroundMaskColor(color: string): void {
    this.state.backgroundMaskColor = color;
    // 实现背景遮罩颜色逻辑
  }

  // 更新背景遮罩透明度
  public updateBackgroundMaskOpacity(opacity: number): void {
    this.state.backgroundMaskOpacity = opacity;
    // 实现背景遮罩透明度逻辑
  }

  // 开始渲染
  public startRendering(): void {
    if (this.animationFrameId) return;

    this.lastTime = performance.now();
    this.render();
  }

  // 停止渲染
  public stopRendering(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // 渲染循环
  private render(): void {
    const currentTime = performance.now();
    const elapsed = currentTime - this.lastTime;

    if (elapsed >= this.frameInterval) {
      this.lastTime = currentTime - (elapsed % this.frameInterval);
      this.frameCount++;

      // 在这里执行渲染逻辑
      this.renderBackground();
    }

    this.animationFrameId = requestAnimationFrame(() => this.render());
  }

  // 渲染背景
  private renderBackground(): void {
    // 实现背景渲染逻辑
  }

  // 清理资源
  public destroy(): void {
    this.stopRendering();

    if (this.backgroundRenderer) {
      this.backgroundRenderer.destroy();
      this.backgroundRenderer = null;
    }
  }
}