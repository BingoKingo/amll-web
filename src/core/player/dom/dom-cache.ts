import type { IDomCache } from '../../../app/types';
import { getElement } from '../../../app/utils';

export class DomCache implements IDomCache {
  private cache: Map<string, HTMLElement | null> = new Map();
  private collectionCache: Map<string, NodeListOf<HTMLElement>> = new Map();

  // 缓存单个元素
  private cacheElement(key: string, selector: string): void {
    this.cache.set(key, getElement(selector));
  }

  // 缓存元素集合
  private cacheCollection(key: string, selector: string): void {
    this.collectionCache.set(key, document.querySelectorAll<HTMLElement>(selector));
  }

  // 初始化所有DOM元素缓存
  public init(): void {
    // 音频相关元素
    this.cacheElement('audio', 'audio');

    // 文件输入元素
    this.cacheElement('musicFile', '#musicFile');
    this.cacheElement('lyricFile', '#lyricFile');
    this.cacheElement('coverFile', '#coverFile');
    this.cacheElement('musicFileBtn', '#musicFileBtn');
    this.cacheElement('lyricFileBtn', '#lyricFileBtn');
    this.cacheElement('coverFileBtn', '#coverFileBtn');

    // 歌曲信息元素
    this.cacheElement('songTitleInput', '#songTitleInput');
    this.cacheElement('songArtistInput', '#songArtistInput');
    this.cacheElement('songTitle', '#songTitle');
    this.cacheElement('songArtist', '#songArtist');
    this.cacheElement('albumInfo', '#albumInfo');
    this.cacheElement('songTitleDisplay', '#songTitleDisplay');
    this.cacheElement('songArtistDisplay', '#songArtistDisplay');

    // 封面相关元素
    this.cacheElement('albumCoverLarge', '#albumCoverLarge');
    this.cacheElement('albumCoverContainer', '#albumCoverContainer');
    this.cacheElement('roundedCoverSlider', '#roundedCoverSlider');
    this.cacheElement('roundedCoverValue', '#roundedCoverValue');
    this.cacheElement('coverRotationSlider', '#coverRotationSlider');
    this.cacheElement('coverRotationValue', '#coverRotationValue');
    this.cacheElement('coverStyleSelect', '#coverStyleSelect');
    this.cacheElement('coverStyleDynamic', '#coverStyleDynamic');
    this.cacheElement('landscapeCover', '#landscapeCover');

    // 播放控制元素
    this.cacheElement('player', '#player');
    this.cacheElement('playButton', '#playButton');
    this.cacheElement('landscapePlayBtn', '#landscapePlayBtn');
    this.cacheElement('controlPanel', '#controlPanel');
    this.cacheElement('playControls', '#playControls');
    this.cacheElement('toggleControlsBtn', '#toggleControlsBtn');

    // 进度条元素
    this.cacheElement('timeDisplay', '#timeDisplay');
    this.cacheElement('progressBar', '#progressBar');
    this.cacheElement('progressFill', '#progressFill');
    this.cacheElement('landscapeTimeDisplay', '#landscapeTimeDisplay');
    this.cacheElement('landscapeProgressFill', '#landscapeProgressFill');

    // 范围选择元素
    this.cacheElement('rangeStartLine', '#rangeStartLine');
    this.cacheElement('rangeEndLine', '#rangeEndLine');
    this.cacheElement('rangeProgressBar', '#rangeProgressBar');

    // 歌词相关元素
    this.cacheElement('lyricsPanel', '#lyricsPanel');
    this.cacheElement('amllLyricPlayer', '#amllLyricPlayer');

    // 背景相关元素
    this.cacheElement('coverBlurBackground', '#coverBlurBackground');
    this.cacheElement('bgFlowSpeed', '#bgFlowSpeed');
    this.cacheElement('bgFlowSpeedValue', '#bgFlowSpeedValue');
    this.cacheElement('bgColorMask', '#bgColorMask');
    this.cacheElement('bgMaskColor', '#bgMaskColor');
    this.cacheElement('bgMaskOpacity', '#bgMaskOpacity');
    this.cacheElement('bgMaskOpacityValue', '#bgMaskOpacityValue');
    this.cacheElement('backgroundStyleSelect', '#backgroundStyleSelect');
    this.cacheElement('imageBlurLevel', '#imageBlurLevel');
    this.cacheElement('imageBlurLevelValue', '#imageBlurLevelValue');
    this.cacheElement('bgRenderScale', '#bgRenderScale');
    this.cacheElement('bgRenderScaleValue', '#bgRenderScaleValue');
    this.cacheElement('bgFPS', '#bgFPS');
    this.cacheElement('bgFPSValue', '#bgFPSValue');
    this.cacheElement('bgLowFreqVolume', '#bgLowFreqVolume');
    this.cacheElement('bgLowFreqVolumeValue', '#bgLowFreqVolumeValue');

    // 颜色相关元素
    this.cacheElement('invertColorsCheckbox', '#invertColorsCheckbox');
    this.cacheElement('dominantColorInput', '#dominantColorInput');
    this.cacheElement('dominantColorLightInput', '#dominantColorLightInput');
    this.cacheElement('dominantColorDarkInput', '#dominantColorDarkInput');

    // 歌词设置元素
    this.cacheElement('lyricAlignPosition', '#lyricAlignPosition');
    this.cacheElement('lyricAlignPositionValue', '#lyricAlignPositionValue');
    this.cacheElement('hidePassedLyricsCheckbox', '#hidePassedLyricsCheckbox');
    this.cacheElement('enableLyricBlur', '#enableLyricBlur');
    this.cacheElement('enableLyricScale', '#enableLyricScale');
    this.cacheElement('enableLyricSpring', '#enableLyricSpring');
    this.cacheElement('wordFadeWidthInput', '#wordFadeWidthInput');
    this.cacheElement('wordFadeWidthValue', '#wordFadeWidthValue');
    this.cacheElement('showbgLyricCheckbox', '#showbgLyricCheckbox');
    this.cacheElement('swapDuetsPositionsCheckbox', '#swapDuetsPositionsCheckbox');
    this.cacheElement('advanceLyricTimingCheckbox', '#advanceLyricTimingCheckbox');
    this.cacheElement('singleLyricsCheckbox', '#singleLyricsCheckbox');
    this.cacheElement('showTranslatedLyricCheckbox', '#showTranslatedLyricCheckbox');
    this.cacheElement('showRomanLyricCheckbox', '#showRomanLyricCheckbox');
    this.cacheElement('swapLyricPositionsCheckbox', '#swapLyricPositionsCheckbox');
    this.cacheElement('lyricAlignAnchorSelect', '#lyricAlignAnchorSelect');
    this.cacheElement('lyricDelayInput', '#lyricDelayInput');

    // 播放速率和音量元素
    this.cacheElement('playbackRateValue', '#playbackRateValue');
    this.cacheElement('playbackRateControl', '#playbackRateControl');
    this.cacheElement('volumeControl', '#volumeControl');
    this.cacheElement('volumeValue', '#volumeValue');
    this.cacheElement('speedLowIcon', '#speedLowIcon');
    this.cacheElement('speedMediumIcon', '#speedMediumIcon');
    this.cacheElement('speedHighIcon', '#speedHighIcon');
    this.cacheElement('volumeOffIcon', '#volumeOffIcon');
    this.cacheElement('volumeLowIcon', '#volumeLowIcon');
    this.cacheElement('volumeMediumIcon', '#volumeMediumIcon');
    this.cacheElement('volumeHighIcon', '#volumeHighIcon');
    this.cacheElement('loopPlayCheckbox', '#loopPlayCheckbox');

    // URL输入元素
    this.cacheElement('musicUrl', '#musicUrl');
    this.cacheElement('lyricUrl', '#lyricUrl');
    this.cacheElement('coverUrl', '#coverUrl');
    this.cacheElement('albumSidePanel', '#albumSidePanel');
    this.cacheElement('loadFromUrlBtn', '#loadFromUrlBtn');
    this.cacheElement('loadFilesBtn', '#loadFilesBtn');
    this.cacheElement('resetPlayerBtn', '#resetPlayerBtn');

    // 波形图元素
    this.cacheElement('waveformCanvas', '#waveformCanvas');

    // 调试元素
    this.cacheElement('showStatsCheckbox', '#showStatsCheckbox');
    this.cacheElement('status', '#status');
    this.cacheElement('statusText', '#statusText');
    this.cacheElement('amllDesc', '#amllDesc');
    this.cacheElement('cssDesc', '#cssDesc');
    this.cacheElement('solidDesc', '#solidDesc');
    this.cacheElement('controlPointCodeInput', '#controlPointCodeInput');

    // 集合元素
    this.cacheCollection('solidOptions', '.solid-option');
    this.cacheCollection('recordOptions', '.record-option');
    this.cacheCollection('springPosYMassValue', '.spring-pos-y-mass-value');
    this.cacheCollection('springPosYDampingValue', '.spring-pos-y-damping-value');
    this.cacheCollection('springPosYStiffnessValue', '.spring-pos-y-stiffness-value');
    this.cacheCollection('springScaleMassValue', '.spring-scale-mass-value');
    this.cacheCollection('springScaleDampingValue', '.spring-scale-damping-value');
    this.cacheCollection('springScaleStiffnessValue', '.spring-scale-stiffness-value');
    this.cacheCollection('fftDataRangeMinValue', '.fft-data-range-min-value');
    this.cacheCollection('fftDataRangeMaxValue', '.fft-data-range-max-value');
    this.cacheCollection('posYSpringMassInput', '.pos-y-spring-mass-input');
    this.cacheCollection('posYSpringDampingInput', '.pos-y-spring-damping-input');
    this.cacheCollection('posYSpringStiffnessInput', '.pos-y-spring-stiffness-input');
    this.cacheCollection('posYSpringSoftCheckbox', '.pos-y-spring-soft-checkbox');
    this.cacheCollection('scaleSpringMassInput', '.scale-spring-mass-input');
    this.cacheCollection('scaleSpringDampingInput', '.scale-spring-damping-input');
    this.cacheCollection('scaleSpringStiffnessInput', '.scale-spring-stiffness-input');
    this.cacheCollection('scaleSpringSoftCheckbox', '.scale-spring-soft-checkbox');

    // Spring参数元素
    this.cacheElement('posYSpringMassInput', '#posYSpringMass');
    this.cacheElement('posYSpringDampingInput', '#posYSpringDamping');
    this.cacheElement('posYSpringStiffnessInput', '#posYSpringStiffness');
    this.cacheElement('posYSpringSoftCheckbox', '#posYSpringSoft');
    this.cacheElement('scaleSpringMassInput', '#scaleSpringMass');
    this.cacheElement('scaleSpringDampingInput', '#scaleSpringDamping');
    this.cacheElement('scaleSpringStiffnessInput', '#scaleSpringStiffness');
    this.cacheElement('scaleSpringSoftCheckbox', '#scaleSpringSoft');
    this.cacheElement('springPosYMassValue', '#springPosYMassValue');
    this.cacheElement('springPosYDampingValue', '#springPosYDampingValue');
    this.cacheElement('springPosYStiffnessValue', '#springPosYStiffnessValue');
    this.cacheElement('springScaleMassValue', '#springScaleMassValue');
    this.cacheElement('springScaleDampingValue', '#springScaleDampingValue');
    this.cacheElement('springScaleStiffnessValue', '#springScaleStiffnessValue');
    this.cacheElement('fftDataRangeMin', '#fftDataRangeMin');
    this.cacheElement('fftDataRangeMinValue', '#fftDataRangeMinValue');
    this.cacheElement('fftDataRangeMax', '#fftDataRangeMax');
    this.cacheElement('fftDataRangeMaxValue', '#fftDataRangeMaxValue');
    this.cacheElement('enableMarqueeCheckbox', '#enableMarqueeCheckbox');
    this.cacheElement('fullscreenButton', '#fullscreenButton');
    this.cacheElement('fullscreenEnterIcon', '#fullscreenEnterIcon');
    this.cacheElement('fullscreenExitIcon', '#fullscreenExitIcon');
  }

  // 获取单个DOM元素
  public getElement<T extends HTMLElement>(key: string): T | null {
    return this.cache.get(key) as T | null;
  }

  // 获取DOM元素集合
  public getCollection<T extends HTMLElement>(key: string): NodeListOf<T> {
    return this.collectionCache.get(key) as NodeListOf<T> || document.querySelectorAll('');
  }

  // 刷新特定元素缓存
  public refreshElement(key: string, selector: string): void {
    this.cacheElement(key, selector);
  }

  // 刷新所有元素缓存
  public refreshAll(): void {
    this.cache.clear();
    this.collectionCache.clear();
    this.init();
  }
}