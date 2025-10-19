import type { PlayerState } from '../../../app/types';
import type { DomCache } from '../dom/dom-cache';
import { hexToRgb, rgbToHex } from '../../../app/utils';

/**
 * ColorExtractor 负责主色抽取和色彩策略
 * - 使用 ColorThief 提取主色
 * - 手动设置主色
 * - 浅深色处理
 * - 反色处理
 */
export class ColorExtractor {
  private domCache: DomCache;
  private state: PlayerState;
  private colorThief: any = null; // 实际的 ColorThief 实例

  constructor(domCache: DomCache, state: PlayerState) {
    this.domCache = domCache;
    this.state = state;
  }

  // 初始化
  public init(): void {
    // 尝试初始化 ColorThief
    if (typeof window.ColorThief !== 'undefined') {
      try {
        this.colorThief = new window.ColorThief();
      } catch (error) {
        console.error('Failed to initialize ColorThief:', error);
      }
    }
  }

  // 从封面提取主色
  public extractDominantColor(image: HTMLImageElement): [number, number, number] | null {
    if (!this.colorThief) {
      // 如果没有 ColorThief，返回默认颜色
      return [253, 156, 155]; // #fd9c9b
    }

    try {
      // 使用 ColorThief 提取主色
      const color = this.colorThief.getColor(image);
      return color ? color as [number, number, number] : null;
    } catch (error) {
      console.error('Error extracting dominant color:', error);
      return null;
    }
  }

  // 从封面提取调色板
  public extractPalette(image: HTMLImageElement, colorCount: number = 5): Array<[number, number, number]> {
    if (!this.colorThief) {
      return [];
    }

    try {
      const palette = this.colorThief.getPalette(image, colorCount);
      return palette ? palette as Array<[number, number, number]> : [];
    } catch (error) {
      console.error('Error extracting color palette:', error);
      return [];
    }
  }

  // 设置手动主色
  public setManualDominantColor(color: string | null): void {
    this.state.manualDominantColor = color;

    // 如果设置了手动主色，自动计算对应的浅色和深色
    if (color) {
      const [r, g, b] = hexToRgb(color);
      this.state.manualDominantColorLight = this.calculateLightColor(r, g, b);
      this.state.manualDominantColorDark = this.calculateDarkColor(r, g, b);
    } else {
      this.state.manualDominantColorLight = null;
      this.state.manualDominantColorDark = null;
    }

    // 应用颜色到CSS变量
    this.applyDominantColorAsCSSVariable();
  }

  // 计算浅色版本
  private calculateLightColor(r: number, g: number, b: number): string {
    // 将颜色调亮 30%
    const factor = 1.3;
    const newR = Math.min(255, Math.round(r * factor));
    const newG = Math.min(255, Math.round(g * factor));
    const newB = Math.min(255, Math.round(b * factor));
    return rgbToHex(newR, newG, newB);
  }

  // 计算深色版本
  private calculateDarkColor(r: number, g: number, b: number): string {
    // 将颜色调暗 30%
    const factor = 0.7;
    const newR = Math.max(0, Math.round(r * factor));
    const newG = Math.max(0, Math.round(g * factor));
    const newB = Math.max(0, Math.round(b * factor));
    return rgbToHex(newR, newG, newB);
  }

  // 切换反色模式
  public toggleInvertColors(): void {
    this.state.invertColors = !this.state.invertColors;
    this.applyInvertColors();
  }

  // 设置反色模式
  public setInvertColors(enabled: boolean): void {
    this.state.invertColors = enabled;
    this.applyInvertColors();
  }

  // 应用反色模式
  private applyInvertColors(): void {
    const player = this.domCache.getElement<HTMLElement>('player');
    if (!player) return;

    if (this.state.invertColors) {
      player.classList.add('inverted-colors');
    } else {
      player.classList.remove('inverted-colors');
    }
  }

  // 处理封面颜色
  public processCoverColor(image: HTMLImageElement): void {
    // 如果用户设置了手动主色，则使用手动颜色
    if (this.state.manualDominantColor) {
      this.applyDominantColorAsCSSVariable();
      return;
    }

    // 否则从图片中提取主色
    const dominantColor = this.extractDominantColor(image);
    if (dominantColor) {
      const [r, g, b] = dominantColor;
      this.state.manualDominantColor = rgbToHex(r, g, b);
      this.state.manualDominantColorLight = this.calculateLightColor(r, g, b);
      this.state.manualDominantColorDark = this.calculateDarkColor(r, g, b);

      this.applyDominantColorAsCSSVariable();
    }
  }

  // 将主色应用为CSS变量
  public applyDominantColorAsCSSVariable(): void {
    const root = document.documentElement;

    // 设置主色CSS变量
    if (this.state.manualDominantColor) {
      root.style.setProperty('--dominant-color', this.state.manualDominantColor);
    }

    if (this.state.manualDominantColorLight) {
      root.style.setProperty('--dominant-color-light', this.state.manualDominantColorLight);
    }

    if (this.state.manualDominantColorDark) {
      root.style.setProperty('--dominant-color-dark', this.state.manualDominantColorDark);
    }
  }

  // 检查颜色是否为亮色
  public isLightColor(hexColor: string): boolean {
    const [r, g, b] = hexToRgb(hexColor);
    // 使用标准的亮度计算公式
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128;
  }

  // 获取当前有效主色
  public getCurrentDominantColor(): string {
    return this.state.manualDominantColor || '#fd9c9b';
  }

  // 获取当前有效主色(亮色版本)
  public getCurrentDominantColorLight(): string {
    return this.state.manualDominantColorLight || '#ffbcbb';
  }

  // 获取当前有效主色(深色版本)
  public getCurrentDominantColorDark(): string {
    return this.state.manualDominantColorDark || '#cb7a79';
  }
}