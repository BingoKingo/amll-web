import type { PlayerState, IDomUpdate } from '../../../app/types';
import type { DomCache } from './dom-cache';
import { formatTime } from '../../../app/utils';

// Minimal placeholders for missing functions
function debouncedRaf(cb: () => void): () => void {
  let scheduled = false;
  return () => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        cb();
      });
    }
  };
}

function isElementOverflowing(el: HTMLElement): boolean {
  return el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
}

// 更新方法的接口实现
export class DomUpdate implements IDomUpdate {
  private domCache: DomCache;
  private audio: HTMLAudioElement;
  private titleMarqueeInterval: number | null = null;
  private originalTitle: string = '';

  constructor(domCache: DomCache, audio: HTMLAudioElement) {
    this.domCache = domCache;
    this.audio = audio;
  }

  // 更新时间显示
  public updateTimeDisplay(currentTime: number, duration: number, showRemaining: boolean): void {
    const timeDisplay = this.domCache.getElement<HTMLElement>('timeDisplay');
    const landscapeTimeDisplay = this.domCache.getElement<HTMLElement>('landscapeTimeDisplay');

    if (!timeDisplay || !landscapeTimeDisplay) return;

    const formattedCurrent = formatTime(currentTime);
    const formattedDuration = formatTime(duration);

    if (showRemaining) {
      const remaining = duration - currentTime;
      const formattedRemaining = formatTime(Math.max(0, remaining));
      timeDisplay.textContent = `-${formattedRemaining} / ${formattedDuration}`;
      landscapeTimeDisplay.textContent = `-${formattedRemaining} / ${formattedDuration}`;
    } else {
      timeDisplay.textContent = `${formattedCurrent} / ${formattedDuration}`;
      landscapeTimeDisplay.textContent = `${formattedCurrent} / ${formattedDuration}`;
    }
  }

  // 更新进度条
  public updateProgressBar(currentTime: number, duration: number): void {
    const progressFill = this.domCache.getElement<HTMLElement>('progressFill');
    const landscapeProgressFill = this.domCache.getElement<HTMLElement>('landscapeProgressFill');

    if (!progressFill || !landscapeProgressFill || duration <= 0) return;

    const percentage = (currentTime / duration) * 100;
    progressFill.style.width = `${percentage}%`;
    landscapeProgressFill.style.width = `${percentage}%`;
  }

  // 更新播放按钮状态
  public updatePlayButton(isPlaying: boolean): void {
    const playButton = this.domCache.getElement<HTMLElement>('playButton');
    const landscapePlayBtn = this.domCache.getElement<HTMLElement>('landscapePlayBtn');

    if (!playButton || !landscapePlayBtn) return;

    if (isPlaying) {
      playButton.classList.add('playing');
      landscapePlayBtn.classList.add('playing');
    } else {
      playButton.classList.remove('playing');
      landscapePlayBtn.classList.remove('playing');
    }
  }

  // 更新标题和艺术家
  public updateTitleAndArtist(title: string, artist: string): void {
    const songTitle = this.domCache.getElement<HTMLElement>('songTitle');
    const songArtist = this.domCache.getElement<HTMLElement>('songArtist');
    const songTitleDisplay = this.domCache.getElement<HTMLElement>('songTitleDisplay');
    const songArtistDisplay = this.domCache.getElement<HTMLElement>('songArtistDisplay');

    if (!songTitle || !songArtist || !songTitleDisplay || !songArtistDisplay) return;

    songTitle.textContent = title || '';
    songArtist.textContent = artist || '';
    songTitleDisplay.textContent = title || '';
    songArtistDisplay.textContent = artist || '';

    // 更新输入框
    const songTitleInput = this.domCache.getElement<HTMLInputElement>('songTitleInput');
    const songArtistInput = this.domCache.getElement<HTMLInputElement>('songArtistInput');

    if (songTitleInput) songTitleInput.value = title || '';
    if (songArtistInput) songArtistInput.value = artist || '';
  }

  // 更新音量图标
  public updateVolumeIcon(volume: number): void {
    const volumeOffIcon = this.domCache.getElement<HTMLElement>('volumeOffIcon');
    const volumeLowIcon = this.domCache.getElement<HTMLElement>('volumeLowIcon');
    const volumeMediumIcon = this.domCache.getElement<HTMLElement>('volumeMediumIcon');
    const volumeHighIcon = this.domCache.getElement<HTMLElement>('volumeHighIcon');

    if (!volumeOffIcon || !volumeLowIcon || !volumeMediumIcon || !volumeHighIcon) return;

    [volumeOffIcon, volumeLowIcon, volumeMediumIcon, volumeHighIcon].forEach(icon => {
      icon.style.display = 'none';
    });

    if (volume === 0) {
      volumeOffIcon.style.display = 'block';
    } else if (volume < 0.33) {
      volumeLowIcon.style.display = 'block';
    } else if (volume < 0.66) {
      volumeMediumIcon.style.display = 'block';
    } else {
      volumeHighIcon.style.display = 'block';
    }
  }

  // 更新播放速率图标
  public updateSpeedIcon(rate: number): void {
    const speedLowIcon = this.domCache.getElement<HTMLElement>('speedLowIcon');
    const speedMediumIcon = this.domCache.getElement<HTMLElement>('speedMediumIcon');
    const speedHighIcon = this.domCache.getElement<HTMLElement>('speedHighIcon');
    const playbackRateValue = this.domCache.getElement<HTMLElement>('playbackRateValue');

    if (!speedLowIcon || !speedMediumIcon || !speedHighIcon || !playbackRateValue) return;

    [speedLowIcon, speedMediumIcon, speedHighIcon].forEach(icon => {
      icon.style.display = 'none';
    });

    if (rate < 0.9) {
      speedLowIcon.style.display = 'block';
    } else if (rate > 1.1) {
      speedHighIcon.style.display = 'block';
    } else {
      speedMediumIcon.style.display = 'block';
    }

    playbackRateValue.textContent = `${(rate * 100).toFixed(0)}%`;
  }

  // 更新音量值显示
  public updateVolumeValue(volume: number): void {
    const volumeValue = this.domCache.getElement<HTMLElement>('volumeValue');

    if (!volumeValue) return;

    volumeValue.textContent = `${Math.round(volume * 100)}%`;
  }

  // 更新封面圆角
  public updateRoundedCover(roundedCover: number): void {
    const albumCoverLarge = this.domCache.getElement<HTMLImageElement>('albumCoverLarge');
    const albumCoverContainer = this.domCache.getElement<HTMLElement>('albumCoverContainer');
    const roundedCoverSlider = this.domCache.getElement<HTMLInputElement>('roundedCoverSlider');
    const roundedCoverValue = this.domCache.getElement<HTMLElement>('roundedCoverValue');

    if (!albumCoverLarge || !albumCoverContainer || !roundedCoverSlider || !roundedCoverValue) return;

    // 将0-100%映射到0-50%的border-radius
    const borderRadius = (roundedCover / 100) * 50;
    albumCoverLarge.style.borderRadius = `${borderRadius}%`;
    albumCoverContainer.style.borderRadius = `${borderRadius}%`;

    roundedCoverSlider.value = roundedCover.toString();
    roundedCoverValue.textContent = `${roundedCover}%`;
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

    if (this.audio.paused || albumCoverLarge.matches(':hover')) {
      albumCoverLarge.style.animationPlayState = 'paused';
      albumCoverContainer.style.transform = 'scale(0.96)';
      albumCoverLarge.style.transform = 'scale(1)';
    } else {
      albumCoverLarge.style.animationPlayState = 'running';
      albumCoverContainer.style.transform = 'scale(1)';
      albumCoverLarge.style.transform = 'scale(1)';
    }
  }

  // 检查并更新跑马灯效果
  public checkAndUpdateMarquee(element: HTMLElement | null, marqueeEnabled: boolean): void {
    if (!element) return;

    if (!marqueeEnabled) {
      element.classList.remove('marquee');
      element.style.setProperty('--marquee-play-state', 'paused');
      return;
    }

    const checkOverflow = debouncedRaf(() => {
      const originalText = element.textContent || '';
      const repeats = Math.min(5, Math.ceil(600 / originalText.length));
      const repeatedText = Array(repeats).fill(originalText).join('            ');
      const currentDataText = element.getAttribute('data-text');

      if (currentDataText !== repeatedText) {
        element.setAttribute('data-text', repeatedText);
        requestAnimationFrame(() => {
          const isOverflowing = isElementOverflowing(element);
          if (isOverflowing) {
            if (!element.classList.contains('marquee')) {
              element.classList.remove('marquee');
              void element.offsetWidth; // 触发重排
              element.classList.add('marquee');
            }
            element.style.setProperty('--marquee-play-state', this.audio.paused ? 'paused' : 'running');
          } else {
            element.classList.remove('marquee');
          }
        });
      } else {
        const isOverflowing = isElementOverflowing(element);

        if (isOverflowing) {
          if (!element.classList.contains('marquee')) {
            element.classList.remove('marquee');
            void element.offsetWidth; // 触发重排
            element.classList.add('marquee');
          }
          element.style.setProperty('--marquee-play-state', this.audio.paused ? 'paused' : 'running');
        } else {
          element.classList.remove('marquee');
        }
      }
    });

    checkOverflow();
  }

  // 更新跑马灯设置
  public updateMarqueeSettings(marqueeEnabled: boolean, songTitle: string, songArtist: string): void {
    const songTitleElement = this.domCache.getElement<HTMLElement>('songTitle');
    const songArtistElement = this.domCache.getElement<HTMLElement>('songArtist');

    const updateTitleMarquee = () => {
      if (this.titleMarqueeInterval) {
        clearInterval(this.titleMarqueeInterval);
        this.titleMarqueeInterval = null;
      }

      if (!this.originalTitle) {
        this.originalTitle = document.title;
      }

      if (marqueeEnabled && (songTitle || songArtist)) {
        const songInfo = `${songArtist ? songArtist + ' - ' : ''}${songTitle}`;
        const fullTitle = `${songInfo} | AMLL Web Player`;

        if (fullTitle.length > 50) { // 假设50字符为阈值
          let position = 0;
          const scrollTitle = () => {
            if (!marqueeEnabled || this.audio.paused) {
              document.title = fullTitle;
              return;
            }

            const visibleLength = 50;
            let displayText = fullTitle;

            if (fullTitle.length > visibleLength) {
              const startPos = position % fullTitle.length;
              displayText = fullTitle.substring(startPos) + ' ' + fullTitle.substring(0, Math.min(startPos, visibleLength));
              displayText = displayText.substring(0, visibleLength);
            }

            document.title = displayText;
            position++;
          };

          scrollTitle();

          if (!this.audio.paused) {
            this.titleMarqueeInterval = window.setInterval(scrollTitle, 300);
          }
        } else {
          document.title = fullTitle;
        }
      } else {
        if (songTitle || songArtist) {
          const songInfo = `${songArtist ? songArtist + ' - ' : ''}${songTitle}`;
          document.title = `${songInfo} | AMLL Web Player`;
        } else {
          document.title = this.originalTitle || 'AMLL Web Player';
        }
      }
    };

    updateTitleMarquee();
    this.checkAndUpdateMarquee(songTitleElement, marqueeEnabled);
    this.checkAndUpdateMarquee(songArtistElement, marqueeEnabled);
  }

  // 更新背景流速度显示
  public updateBackgroundFlowSpeed(flowSpeed: number): void {
    const bgFlowSpeedValue = this.domCache.getElement<HTMLElement>('bgFlowSpeedValue');

    if (!bgFlowSpeedValue) return;

    bgFlowSpeedValue.textContent = `${flowSpeed}`;
  }

  // 更新背景蒙版透明度显示
  public updateBackgroundMaskOpacity(opacity: number): void {
    const bgMaskOpacityValue = this.domCache.getElement<HTMLElement>('bgMaskOpacityValue');

    if (!bgMaskOpacityValue) return;

    bgMaskOpacityValue.textContent = `${Math.round(opacity * 100)}%`;
  }

  // 更新背景渲染比例显示
  public updateBackgroundRenderScale(scale: number): void {
    const bgRenderScaleValue = this.domCache.getElement<HTMLElement>('bgRenderScaleValue');

    if (!bgRenderScaleValue) return;

    bgRenderScaleValue.textContent = `${scale}%`;
  }

  // 更新背景FPS显示
  public updateBackgroundFPS(fps: number): void {
    const bgFPSValue = this.domCache.getElement<HTMLElement>('bgFPSValue');

    if (!bgFPSValue) return;

    bgFPSValue.textContent = `${fps}`;
  }

  // 更新低频音量显示
  public updateBackgroundLowFreqVolume(volume: number): void {
    const bgLowFreqVolumeValue = this.domCache.getElement<HTMLElement>('bgLowFreqVolumeValue');

    if (!bgLowFreqVolumeValue) return;

    bgLowFreqVolumeValue.textContent = `${volume}%`;
  }

  // 更新歌词对齐位置显示
  public updateLyricAlignPosition(position: number): void {
    const lyricAlignPositionValue = this.domCache.getElement<HTMLElement>('lyricAlignPositionValue');

    if (!lyricAlignPositionValue) return;

    lyricAlignPositionValue.textContent = `${position}%`;
  }

  // 更新歌词淡入淡出宽度显示
  public updateWordFadeWidth(width: number): void {
    const wordFadeWidthValue = this.domCache.getElement<HTMLElement>('wordFadeWidthValue');

    if (!wordFadeWidthValue) return;

    wordFadeWidthValue.textContent = `${width}px`;
  }

  // 更新状态文本
  public updateStatusText(text: string): void {
    const statusText = this.domCache.getElement<HTMLElement>('statusText');

    if (!statusText) return;

    statusText.textContent = text;
  }

  // 更新所有UI元素
  public updateAll(state: PlayerState): void {
    this.updateTimeDisplay(state.currentTime, state.duration, state.showRemainingTime);
    this.updateProgressBar(state.currentTime, state.duration);
    this.updatePlayButton(state.isPlaying);
    this.updateTitleAndArtist(state.songTitle, state.songArtist);
    // 可以添加更多更新方法...
  }

  // 清理资源
  public cleanup(): void {
    if (this.titleMarqueeInterval) {
      clearInterval(this.titleMarqueeInterval);
      this.titleMarqueeInterval = null;
    }
  }
}