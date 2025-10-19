export type Language = "en" | "zh";
export interface Translations {
  artist: string;
  songInfo: string;
  title: string;
  loopPlay: string;
  sourceFile: string;
  musicUrl: string;
  lyricsUrl: string;
  coverUrl: string;
  extractedSongInfo: string;
  usedFilenameAsTitle: string;
  clickToAddLyrics: string;
  supportedLyricFormats: string;
  musicLoadSuccess: string;
  musicLoadFailed: string;
  lyricsLoadSuccess: string;
  lyricsLoadFailed: string;
  coverLoadSuccess: string;
  coverLoadFailed: string;
  lyricsUrlLoadFailed: string;
  loadFromUrlComplete: string;
  lyricsParseSuccess: string;
  lyricsParseFailed: string;
  playerReset: string;
  metadataParseSuccess: string;
  metadataParseFailed: string;
  metadataLibNotLoaded: string;
  metadataParseError: string;
  cannotParseAudioInfo: string;
  backgroundControl: string;
  flowSpeed: string;
  toggleBackgroundMode: string;
  playbackRate: string;
  volume: string;
  playbackControl: string;
  amllBackground: string;
  cssBackground: string;
  solidBackground: string;
  imageBlurLevel: string;
  imageColorMask: string;
  invertColors: string;
  showStats: string;
  enableMarquee: string;
  controlPointCode: string;
  roundedCover: string;
  coverRotation: string;
  renderScale: string;
  lyricAlignPosition: string;
  hidePassedLyrics: string;
  lyricDelay: string;
  enableLyricBlur: string;
  enableLyricScale: string;
  enableLyricSpring: string;
  wordFadeWidth: string;
  alignTop: string;
  alignCenter: string;
  alignBottom: string;
  lyricAlignFocus: string;
  backgroundStyle: string;
  showTranslatedLyric: string;
  showRomanLyric: string;
  swapLyricPositions: string;
  showbgLyric: string;
  swapDuetsPositions: string;
  advanceLyricTiming: string;
  lowFreqVolume: string;
  singleLyrics: string;
  coverStyle: string;
  normalShadow: string;
  innerShadow: string;
  threeDShadow: string;
  longShadow: string;
  neumorphismA: string;
  neumorphismB: string;
  horizontalReflection: string;
  cdRecord: string;
  vinylRecord: string;
  coloredRecord: string;
  fftDataRangeMin: string;
  fftDataRangeMax: string;
  globalSettings: string;
  coverSettings: string;
  lyricSettings: string;
  backgroundSettings: string;
  visualizationSettings: string;
  posYSpringMass: string;
  posYSpringDamping: string;
  posYSpringStiffness: string;
  posYSpringSoft: string;
  scaleSpringMass: string;
  scaleSpringDamping: string;
  scaleSpringStiffness: string;
  scaleSpringSoft: string;
  backgroundFPS: string;
  dominantColor: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    artist: "Artist",
    songInfo: "Metadata",
    title: "Title",
    loopPlay: "Loop Playback",
    sourceFile: "Source",
    musicUrl: "Enter music URL",
    lyricsUrl: "Enter lyrics or lyrics URL",
    coverUrl: "Enter cover image URL",
    extractedSongInfo: "Extracted song info successfully",
    usedFilenameAsTitle: "Used filename as song title",
    clickToAddLyrics: "Click or drag & drop here to add synced lyrics",
    supportedLyricFormats:
      "Supports LyRiC / LyRiC A2 / LyRiC Walaoke / ESLyRiC / Salt Player ESLyRiC (*.lrc, *.spl), Apple Music (*.ttml, *.json), Netease Music (*.yrc), Lyricify (*.lys, *.lyl, *.lqe), QQMusic (*.qrc), KuGou (*.krc), ALRC (*.alrc, *.json), SubRip (*.srt), Aegisub (*.ass), Musixmatch (*.json) formats",
    musicLoadSuccess: "Music file loaded successfully",
    musicLoadFailed: "Failed to load music file",
    globalSettings: "Global",
    coverSettings: "Cover",
    lyricSettings: "Lyrics",
    backgroundSettings: "Background",
    visualizationSettings: "Visualization",
    lyricsLoadSuccess: "Lyrics file loaded successfully",
    lyricsLoadFailed: "Failed to load lyrics file",
    coverLoadSuccess: "Cover image loaded successfully",
    coverLoadFailed: "Failed to load cover image",
    lyricsUrlLoadFailed: "Failed to load lyrics from URL",
    loadFromUrlComplete: "Loading from URL completed",
    lyricsParseSuccess: "Lyrics loaded successfully, total lines: ",
    lyricsParseFailed: "Failed to parse lyrics",
    playerReset: "Player has been reset",
    metadataParseSuccess: "Audio metadata parsed successfully",
    metadataParseFailed: "Failed to parse audio metadata, using fallback",
    metadataLibNotLoaded: "Audio metadata library not loaded, using fallback",
    metadataParseError: "Error parsing audio metadata, using fallback",
    cannotParseAudioInfo: "Cannot parse audio file information",
    backgroundControl: "Background Control",
    flowSpeed: "Flow Speed",
    toggleBackgroundMode: "Toggle Background Mode",
    playbackRate: "Playback Speed",
    volume: "Volume",
    playbackControl: "Playback Control",
    amllBackground: "AMLL Background",
    cssBackground: "Cover Background",
    solidBackground: "Solid Background",
    imageBlurLevel: "Image Blur Level",
    imageColorMask: "Image Color Mask",
    invertColors: "Invert",
    showStats: "Show Performance Monitor",
    enableMarquee: "Title Marquee Effect",
    roundedCover: "Cover Rounded Corners",
    coverRotation: "Cover Rotation Speed",
    renderScale: "Render Scale",
    backgroundFPS: "Background FPS",
    lyricAlignPosition: "Vertical Align",
    hidePassedLyrics: "Hide Passed Lyrics",
    lyricDelay: "Lyrics Delay",
    enableLyricBlur: "Lyrics Blur Effect",
    enableLyricScale: "Lyrics Scaling Effect",
    enableLyricSpring: "Lyrics Spring Effect",
    wordFadeWidth: "Word Fade Width",
    alignTop: "Top",
    alignCenter: "Center",
    alignBottom: "Bottom",
    lyricAlignFocus: "Lyrics Align Focus",
    backgroundStyle: "Background Style",
    showTranslatedLyric: "Show Translated",
    showRomanLyric: "Show Romanized",
    swapLyricPositions: "Swap Translated & Romanized",
    showbgLyric: "Show Background Lyrics",
    swapDuetsPositions: "Swap Left & Right",
    advanceLyricTiming: "Compact Gap (±400ms)",
    lowFreqVolume: "Low Frequency Volume",
    singleLyrics: "Single Lyrics",
    coverStyle: "Cover Preset",
    normalShadow: "Shadow",
    innerShadow: "Inner Shadow",
    threeDShadow: "3D Shadow",
    longShadow: "Long Shadow",
    neumorphismA: "Neumorphism A",
    neumorphismB: "Neumorphism B",
    horizontalReflection: "Horizontal Reflection",
    cdRecord: "CD Record",
    vinylRecord: "Vinyl Record",
    coloredRecord: "Colored Record",
    fftDataRangeMin: "Minimum Frequency",
    fftDataRangeMax: "Maximum Frequency",
    posYSpringMass: "Vertical Spring Mass",
    posYSpringDamping: "Vertical Spring Damping",
    posYSpringStiffness: "Vertical Spring Stiffness",
    posYSpringSoft: "Soft Vertical Spring",
    scaleSpringMass: "Scale Spring Mass",
    controlPointCode: "Control Point Code",
    scaleSpringDamping: "Scale Spring Damping",
    scaleSpringStiffness: "Scale Spring Stiffness",
    scaleSpringSoft: "Soft Scale Spring",
    dominantColor: "Dominant Colors",
  },
  zh: {
    artist: "艺术家",
    songInfo: "元数据",
    title: "标题",
    loopPlay: "循环播放",
    sourceFile: "播放源",
    musicUrl: "输入音乐文件URL",
    lyricsUrl: "输入歌词或歌词文件URL",
    coverUrl: "输入封面图片URL",
    extractedSongInfo: "从文件名解析歌曲信息成功",
    usedFilenameAsTitle: "使用文件名作为歌曲标题",
    clickToAddLyrics: "点击或拖拽至此区域添加同步歌词",
    supportedLyricFormats:
      "支持 LyRiC / LyRiC A2 / LyRiC Walaoke / ESLyRiC / Salt Player ESLyRiC (*.lrc, *.spl), Apple Music (*.ttml, *.json), Netease Music (*.yrc), Lyricify (*.lys, *.lyl, *.lqe), QQMusic (*.qrc), KuGou (*.krc), ALRC (*.alrc, *.json), SubRip (*.srt), Aegisub (*.ass), Musixmatch (*.json) 格式",
    musicLoadSuccess: "音乐文件加载成功",
    musicLoadFailed: "音乐文件加载失败",
    globalSettings: "全局",
    coverSettings: "封面",
    lyricSettings: "歌词",
    backgroundSettings: "背景",
    visualizationSettings: "可视化",
    lyricsLoadSuccess: "歌词文件加载成功",
    lyricsLoadFailed: "歌词文件加载失败",
    coverLoadSuccess: "封面图片加载成功",
    coverLoadFailed: "封面图片加载失败",
    lyricsUrlLoadFailed: "歌词URL加载失败",
    loadFromUrlComplete: "从URL加载完成",
    lyricsParseSuccess: "歌词加载成功，共 ",
    lyricsParseFailed: "歌词解析失败",
    playerReset: "播放器已重置",
    metadataParseSuccess: "音频元数据解析成功",
    metadataParseFailed: "音频元数据解析失败，使用备用方案",
    metadataLibNotLoaded: "音频元数据解析库未加载，使用备用方案",
    metadataParseError: "音频元数据解析出错，使用备用方案",
    cannotParseAudioInfo: "无法解析音频文件信息",
    backgroundControl: "背景控制",
    flowSpeed: "流动速度",
    toggleBackgroundMode: "切换背景模式",
    playbackRate: "播放速度",
    volume: "音量",
    playbackControl: "播放控制",
    amllBackground: "AMLL 背景",
    cssBackground: "封面背景",
    solidBackground: "纯色背景",
    imageBlurLevel: "图像模糊程度",
    imageColorMask: "图像颜色蒙版",
    invertColors: "反转",
    showStats: "显示性能监控",
    enableMarquee: "标题跑马灯效果",
    roundedCover: "封面圆角",
    coverRotation: "封面旋转速度",
    renderScale: "渲染比例",
    backgroundFPS: "背景帧率",
    lyricAlignPosition: "垂直位置",
    hidePassedLyrics: "隐藏已播歌词",
    lyricDelay: "歌词延迟",
    enableLyricBlur: "歌词模糊效果",
    enableLyricScale: "歌词缩放效果",
    enableLyricSpring: "歌词弹簧效果",
    wordFadeWidth: "歌词渐变宽度",
    alignTop: "顶部",
    alignCenter: "居中",
    alignBottom: "底部",
    lyricAlignFocus: "歌词对齐焦点",
    backgroundStyle: "背景样式",
    showTranslatedLyric: "显示翻译",
    showRomanLyric: "显示音译",
    swapLyricPositions: "交换译文位置",
    showbgLyric: "显示背景词",
    swapDuetsPositions: "交换左右对齐",
    advanceLyricTiming: "紧凑间隙 (±400ms)",
    lowFreqVolume: "低音频率",
    singleLyrics: "单行歌词",
    coverStyle: "封面预设",
    normalShadow: "阴影",
    innerShadow: "内阴影",
    threeDShadow: "立体投影",
    longShadow: "长投影",
    neumorphismA: "新拟态A",
    neumorphismB: "新拟态B",
    horizontalReflection: "水平倒影",
    cdRecord: "CD唱片",
    vinylRecord: "黑胶唱片",
    coloredRecord: "彩胶唱片",
    fftDataRangeMin: "最小频率",
    fftDataRangeMax: "最大频率",
    posYSpringMass: "垂直弹簧质量",
    posYSpringDamping: "垂直弹簧阻尼",
    posYSpringStiffness: "垂直弹簧刚度",
    posYSpringSoft: "柔软垂直弹簧",
    controlPointCode: "控制点代码",
    scaleSpringMass: "缩放弹簧质量",
    scaleSpringDamping: "缩放弹簧阻尼",
    scaleSpringStiffness: "缩放弹簧刚度",
    scaleSpringSoft: "柔软缩放弹簧",
    dominantColor: "主色调",
  }
};

export function getCurrentLanguage(): Language {
  const browserLang = navigator.language.toLowerCase();

  if (browserLang.indexOf("zh") === 0) {
    return "zh";
  }

  return "en";
}

export function getTranslations(): Translations {
  const lang = getCurrentLanguage();
  return translations[lang];
}

export function t(key: keyof Translations): string {
  const lang = getCurrentLanguage();
  return translations[lang][key];
}