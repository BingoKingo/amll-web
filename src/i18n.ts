export type Language = "en" | "zh";
export type TranslationValue = string | Record<string, TranslationValue>;
export type Translations = Record<string, TranslationValue>;
export const SUPPORTED_LANGUAGES: Language[] = ["en", "zh"];
export const LANG_STORAGE_KEY = "amll-lang";

const missingTranslationWarnings = new Set<string>();
let currentLanguage: Language | null = null;

const normalizeLanguage = (value: string | null | undefined): Language | null => {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized.startsWith("zh")) return "zh";
  if (normalized.startsWith("en")) return "en";
  return null;
};

const interpolate = (template: string, params?: Record<string, string | number>): string => {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_match, key) => {
    const replacement = params[key];
    return replacement === undefined || replacement === null ? `{${key}}` : String(replacement);
  });
};

const resolveTranslation = (lang: Language, key: string): string | undefined => {
  const parts = key.split(".");
  let value: TranslationValue | undefined = translations[lang];
  for (const part of parts) {
    if (typeof value === "object" && value !== null && part in value) {
      value = (value as Record<string, TranslationValue>)[part];
    } else {
      return undefined;
    }
  }
  return typeof value === "string" ? value : undefined;
};

export function resolveCurrentLanguage(): Language {
  const urlLang = normalizeLanguage(new URLSearchParams(window.location.search).get("lang"));
  if (urlLang && SUPPORTED_LANGUAGES.includes(urlLang)) {
    return urlLang;
  }

  try {
    const storedLang = normalizeLanguage(window.localStorage.getItem(LANG_STORAGE_KEY));
    if (storedLang && SUPPORTED_LANGUAGES.includes(storedLang)) {
      return storedLang;
    }
  } catch {
    // Ignore storage read errors
  }

  const browserLang = normalizeLanguage(navigator.language || navigator.languages?.[0]);
  if (browserLang && SUPPORTED_LANGUAGES.includes(browserLang)) {
    return browserLang;
  }

  return "en";
}

export function setCurrentLanguage(lang: string): Language {
  const normalized = normalizeLanguage(lang) ?? "en";
  const nextLang = SUPPORTED_LANGUAGES.includes(normalized) ? normalized : "en";
  currentLanguage = nextLang;
  document.documentElement.lang = nextLang;
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, nextLang);
  } catch {
    // Ignore storage errors
  }
  return nextLang;
}

export function getCurrentLanguage(): Language {
  if (currentLanguage) {
    return currentLanguage;
  }
  const resolved = resolveCurrentLanguage();
  return setCurrentLanguage(resolved);
}

export function getTranslations(): Translations {
  const lang = getCurrentLanguage();
  return translations[lang];
}

export function t(key: string, params?: Record<string, string | number>): string {
  const lang = getCurrentLanguage();
  const localized = resolveTranslation(lang, key) ?? resolveTranslation("en", key);
  if (!localized) {
    if (!missingTranslationWarnings.has(key)) {
      console.warn(`[i18n] Missing translation key: ${key}`);
      missingTranslationWarnings.add(key);
    }
    return key;
  }
  return interpolate(localized, params);
}

export const translations: Record<Language, Translations> = {
  en: {
    artist: "Artist",
    songInfo: "Metadata",
    title: "Title",
    loopPlay: "Loop Playback",
    loadFromUrl: "Load from URL",
    loadFiles: "Load Files",
    resetPlayer: "Reset Player",
    sourceFile: "Source",
    musicUrl: "Enter music URL",
    lyricsUrl: "Enter lyrics or lyrics URL",
    coverUrl: "Enter cover image URL",
    extractedFromFilename: "Extracted song info from filename",
    extractedSongInfo: "Extracted song info successfully",
    usedFilenameAsTitle: "Used filename as song title",
    showControlPanel: "Show Control Panel",
    hideControlPanel: "Hide Control Panel",
    clickToAddLyrics: "Click or drag & drop here to add lyrics",
    supportedLyricFormats:
      "Supports LyRiC / LyRiC A2 / LyRiC Walaoke / ESLyRiC / Salt Player ESLyRiC (*.lrc, *.spl), Apple Music (*.ttml, *.json), Netease Music (*.yrc), Lyricify (*.lys, *.lyl, *.lqe), QQMusic (*.qrc), KuGou (*.krc), ALRC (*.alrc, *.json), SubRip (*.srt), Aegisub (*.ass), Musixmatch (*.json) formats",
    musicLoadSuccess: "Music file loaded successfully",
    musicLoadFailed: "Failed to load music file",
    globalSettings: "Global",
    coverSettings: "Cover",
    lyricSettings: "Lyrics",
    backgroundSettings: "Background",
    visualizationSettings: "Visualization",
    backgroundBeat: "Background Beat",
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
    coverBackground: "Cover Background",
    solidBackground: "Solid Background",
    coverBlurLevel: "Blur Level",
    colorMask: "Color Mask",
    invertColors: "Invert",
    showFPS: "Show Performance Monitor",
    enableMarquee: "Title Marquee Effect",
    roundedCover: "Cover Rounded Corners",
    coverRotation: "Cover Rotation Speed",
    renderScale: "Render Scale",
    backgroundFPS: "Background FPS",
    lyricAlignPosition: "Vertical Align",
    lyricFontSize: "Font Size",
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
    coverStyle: "Cover Style",
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
    meta: {
      pageTitle: "AMLL Web Player",
      description:
        "AMLL Web Player - A feature-rich music player with customizable lyrics display, cover art effects, and audio visualization. Support multiple lyric formats including original, translated, and romanized lyrics.",
    },
    label: {
      language: "Language",
      languageEnglish: "English",
      languageChinese: "中文",
      directInput: "Direct Input",
      base64Input: "Base64 Encoded Input ({type})",
      timeDisplay: "Current time / Total duration",
      albumCover: "Album Cover",
      songTitle: "Song Title",
      songArtist: "Song Artist",
      dominantColorLight: "Dominant Color (Light)",
      dominantColorDark: "Dominant Color (Dark)",
    },
    placeholder: {
      songTitle: "Title",
      songArtist: "Artist",
    },
    status: {
      musicLoadSuccess: "Music file loaded successfully",
      musicLoadFailed: "Failed to load music file",
      lyricsLoadSuccess: "Lyrics file loaded successfully",
      lyricsLoadFailed: "Failed to load lyrics file",
      coverLoadSuccess: "Cover image loaded successfully",
      coverLoadFailed: "Failed to load cover image",
      lyricsUrlLoadFailed: "Failed to load lyrics from URL",
      loadFromUrlComplete: "Loading from URL completed",
      lyricsParseSuccess: "Lyrics loaded successfully",
      lyricsParseFailed: "Failed to parse lyrics",
      lyricsParseSuccessWithCount: "Lyrics loaded successfully. Total lines: {count}",
      playerReset: "Player has been reset",
      metadataParseSuccess: "Audio metadata parsed successfully",
      metadataParseFailed: "Failed to parse audio metadata, using fallback",
      metadataLibNotLoaded: "Audio metadata library not loaded, using fallback",
      metadataParseError: "Error parsing audio metadata, using fallback",
      cannotParseAudioInfo: "Cannot parse audio file information",
      unsupportedFileType: "Unsupported file type. Please drop an audio or image file.",
      extractedSongInfo: "Extracted song info successfully",
      usedFilenameAsTitle: "Used filename as song title",
    },
    hint: {
      autoplay: {
        title: "[INFO] Autoplay permission required",
        body: "Your browser needs a user interaction before audio can start.",
        instruction: "Tap the play button to begin playback.",
        button: "Got it",
      },
    },
    control: {
      selectMusicFile: "Select music file",
      selectCoverImage: "Select cover image",
      selectLyricFile: "Select lyric file",
      searchSongTitle: "Search song title",
      searchSongArtist: "Search song artist",
      loopPlayback: "Loop playback",
      lyricDelay: "Lyrics delay (ms)",
      playbackSpeed: "Adjust playback speed",
      volume: "Adjust volume",
      coverStyle: "Select cover style",
      roundedCover: "Adjust cover rounded corners",
      coverRotation: "Adjust cover rotation speed",
      lyricFontSize: "Adjust lyrics font size",
      showTranslatedLyric: "Show translated lyrics",
      showRomanLyric: "Show romanized lyrics",
      showbgLyric: "Show background lyrics",
      swapLyricPositions: "Swap translated and romanized lyrics",
      singleLyrics: "Show single line lyrics",
      hidePassedLyrics: "Hide passed lyrics",
      advanceLyricTiming: "Compact gap between lyrics (±400ms)",
      enableLyricBlur: "Enable lyrics blur effect",
      enableLyricScale: "Enable lyrics scaling effect",
      enableLyricSpring: "Enable lyrics spring effect",
      posYSpringSoft: "Enable soft spring when damping < 1",
      scaleSpringSoft: "Enable soft spring when damping < 1",
      posYSpringMass: "Spring mass",
      posYSpringDamping: "Spring damping",
      posYSpringStiffness: "Spring stiffness",
      scaleSpringMass: "Scale spring mass",
      scaleSpringDamping: "Scale spring damping",
      scaleSpringStiffness: "Scale spring stiffness",
      lyricAlignPosition: "Adjust lyrics vertical alignment",
      wordFadeWidth: "Word fade width",
      lyricAlignAnchor: "Lyrics alignment anchor",
      backgroundStyle: "Background style",
      bgLowFreqVolume: "Adjust low frequency volume",
      bgFlowSpeed: "Adjust flow speed",
      bgRenderScale: "Adjust render scale",
      bgFPS: "Adjust background FPS",
      controlPointCode: "Control point code",
      coverBlurLevel: "Adjust cover blur level",
      colorMask: "Enable color mask",
      maskColor: "Mask color",
      maskOpacity: "Adjust mask opacity",
      invertColors: "Invert dominant colors",
      dominantColor: "Dominant colors",
      backgroundBeat: "Enable background beat",
      enableMarquee: "Enable title marquee effect",
      swapDuetsPositions: "Swap left and right positions",
      showFPS: "Show frames per second",
      loadFromUrl: "Load from URL",
      loadFiles: "Load files",
      resetPlayer: "Reset player",
      playPause: "Play/Pause",
      seekPosition: "Seek to position",
      toggleFullscreen: "Toggle fullscreen",
      language: "Language",
      progressBar: "Playback progress",
    },
    button: {
      loadFromUrl: "Load from URL",
      loadFiles: "Load Files",
      resetPlayer: "Reset Player",
      playPause: "Play/Pause",
      fullscreen: "Toggle Fullscreen",
      autoplayDismiss: "Got it",
    },
  },
  zh: {
    artist: "艺术家",
    songInfo: "元数据",
    title: "标题",
    loopPlay: "循环播放",
    loadFromUrl: "从URL加载",
    loadFiles: "加载文件",
    resetPlayer: "重置播放器",
    sourceFile: "播放源",
    musicUrl: "输入音乐文件URL",
    lyricsUrl: "输入歌词或歌词文件URL",
    coverUrl: "输入封面图片URL",
    extractedFromFilename: "从文件名解析歌曲信息",
    extractedSongInfo: "从文件名解析歌曲信息成功",
    usedFilenameAsTitle: "使用文件名作为歌曲标题",
    showControlPanel: "显示控制面板",
    hideControlPanel: "隐藏控制面板",
    clickToAddLyrics: "点击或拖拽至此区域添加歌词",
    supportedLyricFormats:
      "支持 LyRiC / LyRiC A2 / LyRiC Walaoke / ESLyRiC / Salt Player ESLyRiC (*.lrc, *.spl), Apple Music (*.ttml, *.json), Netease Music (*.yrc), Lyricify (*.lys, *.lyl, *.lqe), QQMusic (*.qrc), KuGou (*.krc), ALRC (*.alrc, *.json), SubRip (*.srt), Aegisub (*.ass), Musixmatch (*.json) 格式",
    musicLoadSuccess: "音乐文件加载成功",
    musicLoadFailed: "音乐文件加载失败",
    globalSettings: "全局",
    coverSettings: "封面",
    lyricSettings: "歌词",
    backgroundSettings: "背景",
    visualizationSettings: "可视化",
    backgroundBeat: "背景跳动",
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
    coverBackground: "封面背景",
    solidBackground: "纯色背景",
    coverBlurLevel: "模糊程度",
    colorMask: "颜色蒙版",
    invertColors: "反转",
    showFPS: "显示性能监控",
    enableMarquee: "标题跑马灯效果",
    roundedCover: "封面圆角",
    coverRotation: "封面旋转速度",
    renderScale: "渲染比例",
    backgroundFPS: "背景帧率",
    lyricAlignPosition: "垂直位置",
    lyricFontSize: "字体大小",
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
    coverStyle: "封面样式",
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
    meta: {
      pageTitle: "AMLL 网络播放器",
      description:
        "AMLL 网络播放器 - 功能丰富的音乐播放器，提供可自定义的歌词显示、封面效果与音频可视化。支持原文、翻译、音译等多种歌词格式。",
    },
    label: {
      language: "语言",
      languageEnglish: "英文",
      languageChinese: "中文",
      directInput: "直接输入",
      base64Input: "Base64 编码输入（{type}）",
      timeDisplay: "当前时间 / 总时长",
      albumCover: "专辑封面",
      songTitle: "歌曲标题",
      songArtist: "艺术家",
      dominantColorLight: "主色调（亮）",
      dominantColorDark: "主色调（暗）",
    },
    placeholder: {
      songTitle: "标题",
      songArtist: "艺术家",
    },
    status: {
      musicLoadSuccess: "音乐文件加载成功",
      musicLoadFailed: "音乐文件加载失败",
      lyricsLoadSuccess: "歌词文件加载成功",
      lyricsLoadFailed: "歌词文件加载失败",
      coverLoadSuccess: "封面图片加载成功",
      coverLoadFailed: "封面图片加载失败",
      lyricsUrlLoadFailed: "歌词URL加载失败",
      loadFromUrlComplete: "从URL加载完成",
      lyricsParseSuccess: "歌词加载成功",
      lyricsParseFailed: "歌词解析失败",
      lyricsParseSuccessWithCount: "歌词加载成功，共 {count} 行",
      playerReset: "播放器已重置",
      metadataParseSuccess: "音频元数据解析成功",
      metadataParseFailed: "音频元数据解析失败，使用备用方案",
      metadataLibNotLoaded: "音频元数据解析库未加载，使用备用方案",
      metadataParseError: "音频元数据解析出错，使用备用方案",
      cannotParseAudioInfo: "无法解析音频文件信息",
      unsupportedFileType: "不支持的文件类型，请拖拽音频或图片文件",
      extractedSongInfo: "从文件名解析歌曲信息成功",
      usedFilenameAsTitle: "使用文件名作为歌曲标题",
    },
    hint: {
      autoplay: {
        title: "[INFO] 自动播放提示",
        body: "浏览器需要用户交互后才能开始播放音频。",
        instruction: "请点击播放按钮开始播放。",
        button: "知道了",
      },
    },
    control: {
      selectMusicFile: "选择音乐文件",
      selectCoverImage: "选择封面图片",
      selectLyricFile: "选择歌词文件",
      searchSongTitle: "搜索歌曲标题",
      searchSongArtist: "搜索歌曲艺术家",
      loopPlayback: "循环播放",
      lyricDelay: "歌词延迟（毫秒）",
      playbackSpeed: "调整播放速度",
      volume: "调整音量",
      coverStyle: "选择封面样式",
      roundedCover: "调整封面圆角",
      coverRotation: "调整封面旋转速度",
      lyricFontSize: "调整歌词字体大小",
      showTranslatedLyric: "显示翻译歌词",
      showRomanLyric: "显示音译歌词",
      showbgLyric: "显示背景歌词",
      swapLyricPositions: "交换译文与音译位置",
      singleLyrics: "显示单行歌词",
      hidePassedLyrics: "隐藏已播歌词",
      advanceLyricTiming: "紧凑歌词间隔（±400ms）",
      enableLyricBlur: "启用歌词模糊效果",
      enableLyricScale: "启用歌词缩放效果",
      enableLyricSpring: "启用歌词弹簧效果",
      posYSpringSoft: "阻尼 < 1 时启用柔和弹簧",
      scaleSpringSoft: "阻尼 < 1 时启用柔和弹簧",
      posYSpringMass: "弹簧质量",
      posYSpringDamping: "弹簧阻尼",
      posYSpringStiffness: "弹簧刚度",
      scaleSpringMass: "缩放弹簧质量",
      scaleSpringDamping: "缩放弹簧阻尼",
      scaleSpringStiffness: "缩放弹簧刚度",
      lyricAlignPosition: "调整歌词垂直位置",
      wordFadeWidth: "单词渐变宽度",
      lyricAlignAnchor: "歌词对齐锚点",
      backgroundStyle: "背景样式",
      bgLowFreqVolume: "调整低频音量",
      bgFlowSpeed: "调整流动速度",
      bgRenderScale: "调整渲染比例",
      bgFPS: "调整背景帧率",
      controlPointCode: "控制点代码",
      coverBlurLevel: "调整封面模糊程度",
      colorMask: "启用颜色蒙版",
      maskColor: "蒙版颜色",
      maskOpacity: "调整蒙版不透明度",
      invertColors: "反转主色",
      dominantColor: "主色调",
      backgroundBeat: "启用背景跳动",
      enableMarquee: "启用标题跑马灯",
      swapDuetsPositions: "交换左右位置",
      showFPS: "显示帧率",
      loadFromUrl: "从 URL 加载",
      loadFiles: "加载文件",
      resetPlayer: "重置播放器",
      playPause: "播放/暂停",
      seekPosition: "定位到时间",
      toggleFullscreen: "切换全屏",
      language: "语言",
      progressBar: "播放进度",
    },
    button: {
      loadFromUrl: "从 URL 加载",
      loadFiles: "加载文件",
      resetPlayer: "重置播放器",
      playPause: "播放/暂停",
      fullscreen: "切换全屏",
      autoplayDismiss: "知道了",
    },
  }
};
