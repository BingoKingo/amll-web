// Use any to avoid direct dependency on private members
import { t } from '../../../i18n';

/**
 * 输入处理器类，负责处理用户输入和文本处理逻辑
 */
export class InputProcessor {
  // 使用 any 规避 TS 对私有成员可见性检查，后续再用接口收敛
  private player: any;

  /**
   * 构造函数
   * @param player WebLyricsPlayer实例
   */
  constructor(player: any) {
    this.player = player;
  }

  /**
   * 处理封面输入
   * @param input 用户输入的封面内容（URL、Base64或文件路径）
   * @returns Promise<void>
   */
  async processCoverInput(input: string): Promise<void> {
    if (!input.trim()) {
      this.player.state.coverUrl = '';
      this.player.background.setAlbum('./assets/icon-512x512.png');
      this.player.setDefaultColors();
      this.player.isColorsInitialized = false;
      this.player.initColors();
      this.player.updateFileInputDisplay('coverFile', '');
      if (this.player.albumCoverLarge) {
        this.player.albumCoverLarge.src = './assets/icon-512x512.png';
      }
      return;
    }

    const urlPattern = /^https?:\/\/.+/;
    if (urlPattern.test(input.trim())) {
      this.player.state.coverUrl = input;
      this.player.updateBackground();
      this.player.background.setAlbum(input || './assets/icon-512x512.png');
      await this.player.extractAndProcessCoverColor(input);
      this.player.applyDominantColorAsCSSVariable();
      this.player.updateFileInputDisplay('coverFile', input);
      if (this.player.albumCoverLarge) {
        this.player.albumCoverLarge.src = input;
      }
      return;
    }

    const base64Pattern = /^data:([^;]+)(;charset=([^;]+))?;base64,([A-Za-z0-9+/=]+)$/;
    const base64Match = input.trim().match(base64Pattern);
    if (base64Match) {
      const contentType = base64Match[1] || 'image/png';
      const charset = base64Match[3] || 'utf-8';
      this.player.state.coverUrl = input;
      this.player.updateBackground();
      this.player.background.setAlbum(input || './assets/icon-512x512.png');
      await this.player.extractAndProcessCoverColor(input);
      this.player.applyDominantColorAsCSSVariable();
      this.player.updateFileInputDisplay('coverFile', `Base64 Encoded Input (${contentType})`);
      if (this.player.albumCoverLarge) {
        this.player.albumCoverLarge.src = input;
      }
      return;
    }

    this.player.state.coverUrl = input;
    this.player.updateBackground();
    this.player.background.setAlbum(input || './assets/icon-512x512.png');
    await this.player.extractAndProcessCoverColor(input);
    this.player.applyDominantColorAsCSSVariable();
    this.player.updateFileInputDisplay('coverFile', input);
    if (this.player.albumCoverLarge) {
      this.player.albumCoverLarge.src = input;
    }
  }

  /**
   * 处理歌词输入
   * @param input 用户输入的歌词内容（URL、Base64或文本）
   * @returns Promise<void>
   */
  async processLyricInput(input: string): Promise<void> {
    if (!input.trim()) {
      this.player.hasLyrics = false;
      this.player.lyricPlayer.setLyricLines([]);

      this.player.updateFileInputDisplay('lyricFile', '');
      this.player.state.lyricUrl = '';
      if (this.player.lyricUrl) {
        this.player.lyricUrl.value = '';
      }
      return;
    }

    const urlPattern = /^https?:\/\/.+/;
    if (urlPattern.test(input.trim())) {
      await this.player.loadFromURLs();
      return;
    }

    const base64Pattern = /^data:([^;]+)(;charset=([^;]+))?;base64,([A-Za-z0-9+/=]+)$/;
    const base64Match = input.trim().match(base64Pattern);
    if (base64Match) {
      try {
        const contentType = base64Match[1] || 'text/plain';
        const charset = base64Match[3] || 'utf-8';
        const base64Content = base64Match[4];
        const binaryString = atob(base64Content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        let decodedContent;
        try {
          decodedContent = new TextDecoder(charset).decode(bytes);
        } catch (e) {
          decodedContent = new TextDecoder('utf-8').decode(bytes);
        }
        await this.player.loadLyricContent(decodedContent, 'direct-input.txt');
        this.player.updateFileInputDisplay('lyricFile', `Base64 Encoded Input (${contentType})`);
        this.player.showStatus(t('lyricsParseSuccess'));
      } catch (error) {
        console.error('Base64 decoding error:', error);
        this.player.showStatus(t('lyricsParseFailed'), true);
      }
      return;
    }

    try {
      await this.player.loadLyricContent(input, 'direct-input.txt');
      this.player.updateFileInputDisplay('lyricFile', 'Direct Input');
      this.player.showStatus(t('lyricsParseSuccess'));
    } catch (error) {
      console.error('Direct lyric input error:', error);
      this.player.showStatus(t('lyricsParseFailed'), true);
    }
  }
}