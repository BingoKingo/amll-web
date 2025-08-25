// 多语言支持配置

// 语言定义
export type Language = 'en' | 'zh';

// 翻译内容接口
export interface Translations {
  songTitle: string;
  artist: string;
  unknownSong: string;
  unknownArtist: string;
  uploadMusic: string;
  uploadLyrics: string;
  uploadCover: string;
  songInfo: string;
  title: string;
  loopPlay: string;
  loadFromUrl: string;
  loadFiles: string;
  resetPlayer: string;
  musicFile: string;
  musicUrl: string;
  lyricsFile: string;
  lyricsUrl: string;
  coverImage: string;
  coverUrl: string;
  extractedFromFilename: string;
  extractedSongInfo: string;
  usedFilenameAsTitle: string;
  showControlPanel: string;
  hideControlPanel: string;
  clickToAddLyrics: string;
  supportedLyricFormats: string;
  // 状态消息
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
  // GUI 控制面板
  backgroundControl: string;
  dynamicBackground: string;
  flowSpeed: string;
  toggleBackgroundMode: string;
}

// 翻译内容
export const translations: Record<Language, Translations> = {
  en: {
    songTitle: 'Song Title',
    artist: 'Artist',
    unknownSong: 'Unknown Song',
    unknownArtist: 'Unknown Artist',
    uploadMusic: 'Upload Music',
    uploadLyrics: 'Upload Lyrics',
    uploadCover: 'Upload Cover',
    songInfo: 'Song Information',
    title: 'Title',
    loopPlay: 'Loop Playback',
    loadFromUrl: 'Load from URL',
    loadFiles: 'Load Files',
    resetPlayer: 'Reset Player',
    musicFile: 'Music File',
    musicUrl: 'or enter music URL',
    lyricsFile: 'Lyrics File',
    lyricsUrl: 'or enter lyrics URL',
    coverImage: 'Cover Image',
    coverUrl: 'or enter cover image URL',
    extractedFromFilename: 'Extracted song info from filename',
    extractedSongInfo: 'Extracted song info successfully',
    usedFilenameAsTitle: 'Used filename as song title',
    showControlPanel: 'Show Control Panel',
    hideControlPanel: 'Hide Control Panel',
    clickToAddLyrics: 'Click or drag & drop here to add lyrics',
    supportedLyricFormats: 'Supports .lrc, .ttml, .yrc, .lys, .qrc formats',
    // 状态消息
    musicLoadSuccess: 'Music file loaded successfully',
    musicLoadFailed: 'Failed to load music file',
    invalidMusicFile: 'Invalid music file format',
    lyricsLoadSuccess: 'Lyrics file loaded successfully',
    lyricsLoadFailed: 'Failed to load lyrics file',
    invalidLyricFile: 'Invalid lyrics file format',
    coverLoadSuccess: 'Cover image loaded successfully',
    coverLoadFailed: 'Failed to load cover image',
    lyricsUrlLoadFailed: 'Failed to load lyrics from URL',
    loadFromUrlComplete: 'Loading from URL completed',
    lyricsParseSuccess: 'Lyrics loaded successfully, total lines: ',
    lyricsParseFailed: 'Failed to parse lyrics',
    playerReset: 'Player has been reset',
    metadataParseSuccess: 'Audio metadata parsed successfully',
    metadataParseFailed: 'Failed to parse audio metadata, using fallback',
    metadataLibNotLoaded: 'Audio metadata library not loaded, using fallback',
    metadataParseError: 'Error parsing audio metadata, using fallback',
    cannotParseAudioInfo: 'Cannot parse audio file information',
    // GUI 控制面板
    backgroundControl: 'Background Control',
    dynamicBackground: 'Dynamic Background',
    flowSpeed: 'Flow Speed',
    toggleBackgroundMode: 'Toggle Background Mode'
  },
  zh: {
    songTitle: '歌曲名',
    artist: '歌手',
    unknownSong: '未知歌曲',
    unknownArtist: '未知作者',
    uploadMusic: '上传音乐',
    uploadLyrics: '上传歌词',
    uploadCover: '上传封面',
    songInfo: '歌曲信息',
    title: '标题',
    loopPlay: '循环播放',
    loadFromUrl: '从URL加载',
    loadFiles: '加载文件',
    resetPlayer: '重置播放器',
    musicFile: '音乐文件',
    musicUrl: '或输入音乐文件URL',
    lyricsFile: '歌词文件',
    lyricsUrl: '或输入歌词文件URL',
    coverImage: '封面图片',
    coverUrl: '或输入封面图片URL',
    extractedFromFilename: '从文件名解析歌曲信息',
    extractedSongInfo: '从文件名解析歌曲信息成功',
    usedFilenameAsTitle: '使用文件名作为歌曲标题',
    showControlPanel: '显示控制面板',
    hideControlPanel: '隐藏控制面板',
    clickToAddLyrics: '点击或拖拽至此区域添加歌词',
    supportedLyricFormats: '支持 .lrc, .ttml, .yrc, .lys, .qrc 格式',
    // 状态消息
    musicLoadSuccess: '音乐文件加载成功',
    musicLoadFailed: '音乐文件加载失败',
    invalidMusicFile: '无效的音乐文件格式',
    lyricsLoadSuccess: '歌词文件加载成功',
    lyricsLoadFailed: '歌词文件加载失败',
    invalidLyricFile: '无效的歌词文件格式',
    coverLoadSuccess: '封面图片加载成功',
    coverLoadFailed: '封面图片加载失败',
    lyricsUrlLoadFailed: '歌词URL加载失败',
    loadFromUrlComplete: '从URL加载完成',
    lyricsParseSuccess: '歌词加载成功，共 ',
    lyricsParseFailed: '歌词解析失败',
    playerReset: '播放器已重置',
    metadataParseSuccess: '音频元数据解析成功',
    metadataParseFailed: '音频元数据解析失败，使用备用方案',
    metadataLibNotLoaded: '音频元数据解析库未加载，使用备用方案',
    metadataParseError: '音频元数据解析出错，使用备用方案',
    cannotParseAudioInfo: '无法解析音频文件信息',
    // GUI 控制面板
    backgroundControl: '背景控制',
    dynamicBackground: '动态背景',
    flowSpeed: '流动速度',
    toggleBackgroundMode: '切换背景模式'
  }
};

// 获取当前语言
export function getCurrentLanguage(): Language {
  // 检查浏览器语言
  const browserLang = navigator.language.toLowerCase();
  
  // 如果浏览器语言是中文，返回中文
  if (browserLang.startsWith('zh')) {
    return 'zh';
  }
  
  // 默认返回英文
  return 'en';
}

// 获取翻译
export function getTranslations(): Translations {
  const lang = getCurrentLanguage();
  return translations[lang];
}

// 获取单个翻译项
export function t(key: keyof Translations): string {
  const lang = getCurrentLanguage();
  return translations[lang][key];
}