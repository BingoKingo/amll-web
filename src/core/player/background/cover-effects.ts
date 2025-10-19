import type { PlayerState } from '../../../app/types';
import * as constants from '../../../app/constants';
import type { DomCache } from '../dom/dom-cache';

// 封面特效管理器
export class CoverEffects {
  private domCache: DomCache;
  private audio: HTMLAudioElement;

  constructor(domCache: DomCache, audio: HTMLAudioElement) {
    this.domCache = domCache;
    this.audio = audio;
  }

  // 更新封面圆角
  public updateRoundedCover(roundedCover: number): void {
    const albumCoverLarge = this.domCache.getElement<HTMLImageElement>('albumCoverLarge');
    const albumCoverContainer = this.domCache.getElement<HTMLElement>('albumCoverContainer');
    const roundedCoverSlider = this.domCache.getElement<HTMLInputElement>('roundedCoverSlider');
    const roundedCoverValue = this.domCache.getElement<HTMLElement>('roundedCoverValue');
    const recordOptions = this.domCache.getCollection<HTMLElement>('recordOptions');
    
    if (!albumCoverLarge || !albumCoverContainer || !roundedCoverSlider || !roundedCoverValue) return;

    // 将0-100%映射到0-50%的border-radius
    const borderRadius = (roundedCover / 100) * 50;
    albumCoverLarge.style.borderRadius = `${borderRadius}%`;
    albumCoverContainer.style.borderRadius = `${borderRadius}%`;

    roundedCoverSlider.value = roundedCover.toString();
    roundedCoverValue.textContent = `${roundedCover}%`;

    // 控制唱片选项的可见性
    this.setOptionsVisibility(recordOptions, roundedCover === 100, ['cd', 'vinyl', 'colored']);
  }

  // 更新封面旋转
  public updateCoverRotation(coverRotationSpeed: number): void {
    const albumCoverLarge = this.domCache.getElement<HTMLImageElement>('albumCoverLarge');
    const albumCoverContainer = this.domCache.getElement<HTMLElement>('albumCoverContainer');
    const coverRotationSlider = this.domCache.getElement<HTMLInputElement>('coverRotationSlider');
    const coverRotationValue = this.domCache.getElement<HTMLElement>('coverRotationValue');
    
    if (!albumCoverLarge || !albumCoverContainer || !coverRotationSlider || !coverRotationValue) return;

    albumCoverLarge.style.animation = 'none';

    if (coverRotationSpeed !== 0) {
      this.applyCoverRotation(albumCoverLarge, albumCoverContainer, coverRotationSpeed);
    } else {
      if (this.audio.paused) {
        albumCoverContainer.style.transform = 'scale(0.96)';
        albumCoverLarge.style.transform = 'scale(1)';
      } else {
        albumCoverContainer.style.transform = 'scale(1)';
        albumCoverLarge.style.transform = 'scale(1)';
      }
    }

    coverRotationSlider.value = coverRotationSpeed.toString();
    coverRotationValue.textContent = `${coverRotationSpeed}rpm`;
  }

  // 应用封面旋转动画
  private applyCoverRotation(
    albumCoverLarge: HTMLImageElement,
    albumCoverContainer: HTMLElement,
    coverRotationSpeed: number
  ): void {
    const speed = Math.abs(coverRotationSpeed);
    const duration = 60 / speed;

    const animationName = coverRotationSpeed > 0 ? 'spin' : 'spinCounterclockwise';
    albumCoverLarge.style.animation = `${animationName} ${duration}s linear infinite`;

    // 添加鼠标悬停和播放状态的处理
    const handleHoverAndPlayState = () => {
      if (this.audio.paused || albumCoverLarge.matches(':hover')) {
        albumCoverLarge.style.animationPlayState = 'paused';
        albumCoverContainer.style.transform = 'scale(0.96)';
        albumCoverLarge.style.transform = 'scale(1)';
      } else {
        albumCoverLarge.style.animationPlayState = 'running';
        albumCoverContainer.style.transform = 'scale(1)';
        albumCoverLarge.style.transform = 'scale(1)';
      }
    };

    handleHoverAndPlayState();

    // 添加事件监听
    albumCoverLarge.addEventListener('mouseenter', handleHoverAndPlayState);
    albumCoverLarge.addEventListener('mouseleave', handleHoverAndPlayState);
    this.audio.addEventListener('play', handleHoverAndPlayState);
    this.audio.addEventListener('pause', handleHoverAndPlayState);
  }

  // 应用封面样式
  public applyCoverStyle(coverStyle: string): void {
    const albumCoverLarge = this.domCache.getElement<HTMLImageElement>('albumCoverLarge');
    const albumCoverContainer = this.domCache.getElement<HTMLElement>('albumCoverContainer');
    const coverStyleSelect = this.domCache.getElement<HTMLSelectElement>('coverStyleSelect');
    
    if (!albumCoverLarge || !albumCoverContainer || !coverStyleSelect) return;

    // 移除之前添加的所有封面样式类
    const allStyles = Object.values(constants.COVER_STYLES) as string[];
    allStyles.forEach(styleValue => {
      albumCoverLarge.classList.remove(styleValue.toLowerCase());
      albumCoverContainer.classList.remove(styleValue.toLowerCase());
    });

    // 如果 coverStyle 是 constants.COVER_STYLES 之一，则添加对应类
    // 例如: if coverStyle === "cd", styleValue = "cd"
    const styleKey = coverStyle.toUpperCase(); // e.g. "CD"
    // Ensure it matches a key in COVER_STYLES
    const matchedEntry = Object.entries(constants.COVER_STYLES).find(
      ([key, value]) => key === styleKey
    );
    if (matchedEntry) {
      const styleClassName = matchedEntry[1].toLowerCase();
      albumCoverLarge.classList.add(styleClassName);
      albumCoverContainer.classList.add(styleClassName);
    }

    // 更新选择框
    coverStyleSelect.value = coverStyle;

    // 处理特殊样式需求
    this.handleSpecialStyles(coverStyle);
  }

  // 处理特殊的封面样式
  private handleSpecialStyles(coverStyle: string): void {
    const albumCoverLarge = this.domCache.getElement<HTMLImageElement>('albumCoverLarge');
    const albumCoverContainer = this.domCache.getElement<HTMLElement>('albumCoverContainer');
    
    if (!albumCoverLarge || !albumCoverContainer) return;

    switch (coverStyle) {
      case 'cd':
      case 'vinyl':
        // 添加光盘中心孔
        if (!albumCoverContainer.querySelector('.record-center')) {
          const centerHole = document.createElement('div');
          centerHole.className = 'record-center';
          albumCoverContainer.appendChild(centerHole);
        }
        break;
      case 'neumorphismA':
      case 'neumorphismB':
        // 确保没有中心孔
        const centerHole = albumCoverContainer.querySelector('.record-center');
        if (centerHole) {
          centerHole.remove();
        }
        break;
      default:
        // 移除可能的特殊元素
        const centerHoleElement = albumCoverContainer.querySelector('.record-center');
        if (centerHoleElement) {
          centerHoleElement.remove();
        }
        break;
    }
  }

  // 设置选项的可见性
  public setOptionsVisibility(
    options: NodeListOf<HTMLElement>, 
    show: boolean, 
    allowedStyles?: string[]
  ): void {
    options.forEach(option => {
      if (allowedStyles && option.dataset.style) {
        const style = option.dataset.style;
        if (allowedStyles.includes(style)) {
          option.style.display = show ? 'block' : 'none';
        }
      } else {
        option.style.display = show ? 'block' : 'none';
      }
    });
  }

  // 启用/禁用封面动态样式
  public toggleDynamicStyle(enable: boolean): void {
    const coverStyleDynamic = this.domCache.getElement<HTMLInputElement>('coverStyleDynamic');
    
    if (!coverStyleDynamic) return;

    coverStyleDynamic.checked = enable;
    // 这里可以添加更多的动态样式处理逻辑
  }

  // 初始化封面事件监听
  public initEvents(): void {
    const albumCoverLarge = this.domCache.getElement<HTMLImageElement>('albumCoverLarge');
    const albumCoverContainer = this.domCache.getElement<HTMLElement>('albumCoverContainer');
    const roundedCoverSlider = this.domCache.getElement<HTMLInputElement>('roundedCoverSlider');
    const coverRotationSlider = this.domCache.getElement<HTMLInputElement>('coverRotationSlider');
    const coverStyleSelect = this.domCache.getElement<HTMLSelectElement>('coverStyleSelect');
    const coverStyleDynamic = this.domCache.getElement<HTMLInputElement>('coverStyleDynamic');
    
    // 绑定滑块和选择框事件
    if (roundedCoverSlider) {
      roundedCoverSlider.addEventListener('input', (event) => {
        const value = parseInt((event.target as HTMLInputElement).value);
        this.updateRoundedCover(value);
      });
    }

    if (coverRotationSlider) {
      coverRotationSlider.addEventListener('input', (event) => {
        const value = parseInt((event.target as HTMLInputElement).value);
        this.updateCoverRotation(value);
      });
    }

    if (coverStyleSelect) {
      coverStyleSelect.addEventListener('change', (event) => {
        const value = (event.target as HTMLSelectElement).value;
        this.applyCoverStyle(value);
      });
    }

    if (coverStyleDynamic) {
      coverStyleDynamic.addEventListener('change', (event) => {
        const value = (event.target as HTMLInputElement).checked;
        this.toggleDynamicStyle(value);
      });
    }

    // 添加鼠标悬停效果
    if (albumCoverLarge && albumCoverContainer) {
      albumCoverLarge.addEventListener('mouseenter', () => {
        albumCoverContainer.style.transform = 'scale(0.96)';
        albumCoverLarge.style.transform = 'scale(1)';
        albumCoverLarge.style.animationPlayState = 'paused';
      });

      albumCoverLarge.addEventListener('mouseleave', () => {
        if (!this.audio.paused) {
          albumCoverContainer.style.transform = 'scale(1)';
          albumCoverLarge.style.transform = 'scale(1)';
          albumCoverLarge.style.animationPlayState = 'running';
        }
      });
    }
  }

  // 从状态更新所有封面特效
  public updateFromState(state: PlayerState): void {
    this.updateRoundedCover(state.roundedCover);
    this.updateCoverRotation(state.coverRotationSpeed);
    this.applyCoverStyle(state.coverStyle);
    this.toggleDynamicStyle(true); // 假设默认启用动态样式
  }

  // 清理资源
  public cleanup(): void {
    // 移除事件监听和清理资源
  }
}