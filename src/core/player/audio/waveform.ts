import eventBus from "../event/event-bus";
import type { PlayerStateService } from '../state/player-state';

/**
 * WaveformService 负责波形可视化
 * - 解码音频数据
 * - 绘制波形
 * - 缓存波形数据
 * - 处理FFT范围参数
 */
export class WaveformService {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private audio: HTMLAudioElement;
  private stateService: PlayerStateService;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private fftDataRangeMin: number = 4;
  private fftDataRangeMax: number = 20000;
  private backgroundLowFreqVolume: number = 0.5;
  private cachedWaveform: number[] = [];
  private audioBuffer: AudioBuffer | null = null;
  private animationFrameId: number | null = null;
  private isActive: boolean = false;

  constructor(audio: HTMLAudioElement, stateService: PlayerStateService) {
    this.audio = audio;
    this.stateService = stateService;
  }

  // 初始化波形服务
  public init(canvasElement?: HTMLCanvasElement): void {
    if (canvasElement) {
      this.canvas = canvasElement;
      this.ctx = canvasElement.getContext("2d");
    }

    this.createAudioContext();
    this.setupEventListeners();
  }

  // 创建音频上下文
  private createAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;

      const source = this.audioContext.createMediaElementSource(this.audio);
      source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength) as Uint8Array<ArrayBuffer>;
    } catch (error) {
      console.warn("Waveform visualization not supported:", error);
    }
  }

  // 设置事件监听
  private setupEventListeners(): void {
    eventBus.on("audio:play", this.startVisualization);
    eventBus.on("audio:pause", this.stopVisualization);
    eventBus.on("audio:ended", this.stopVisualization);
    eventBus.on("audio:time-update", this.updatePosition);
  }

  // 开始可视化
  private startVisualization = (): void => {
    if (
      !this.isActive &&
      this.analyser &&
      this.dataArray &&
      this.canvas &&
      this.ctx
    ) {
      this.isActive = true;
      this.renderWaveform();
    }
  };

  // 停止可视化
  private stopVisualization = (): void => {
    this.isActive = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  };

  // 更新位置
  private updatePosition = (data: { currentPosition: number }): void => {
    // 在波形上绘制当前播放位置的指示器
    if (this.canvas && this.ctx && this.cachedWaveform.length > 0) {
      this.drawPositionIndicator(data.currentPosition);
    }
  };

  // 渲染波形
  private renderWaveform = (): void => {
    if (
      !this.isActive ||
      !this.analyser ||
      !this.dataArray ||
      !this.canvas ||
      !this.ctx
    ) {
      return;
    }

    this.animationFrameId = requestAnimationFrame(this.renderWaveform);

    if (this.analyser && this.dataArray) {
      this.analyser.getByteFrequencyData(this.dataArray);
    }

    this.clearCanvas();
    this.drawWaveform();
  };

  // 清除画布
  private clearCanvas(): void {
    if (!this.canvas || !this.ctx) return;

    this.ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // 绘制波形
  private drawWaveform(): void {
    if (!this.analyser || !this.dataArray || !this.canvas || !this.ctx) return;

    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    const bufferLength = this.dataArray.length;

    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = "#ffffff"; // 默认波形颜色
    this.ctx.beginPath();

    const sliceWidth = (canvasWidth * 1.0) / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      // 应用频率范围过滤
      const frequency = this.getFrequencyForIndex(i);
      if (
        frequency < this.fftDataRangeMin ||
        frequency > this.fftDataRangeMax
      ) {
        x += sliceWidth;
        continue;
      }

      // 对低频应用额外的增益
      let dataValue = this.dataArray[i];
      if (frequency < 500) {
        dataValue = Math.min(
          255,
          dataValue * (1 + this.backgroundLowFreqVolume)
        );
      }

      const v = dataValue / 255.0;
      const y = (v * canvasHeight) / 2;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    this.ctx.lineTo(canvasWidth, canvasHeight / 2);
    this.ctx.stroke();
  }

  // 绘制位置指示器
  private drawPositionIndicator(currentPosition: number): void {
    if (!this.canvas || !this.ctx || !this.audioBuffer) return;

    const duration = this.stateService.get("duration") || 0;
    if (duration === 0) return;

    const positionX = (currentPosition / duration) * this.canvas.width;

    this.ctx.strokeStyle = "#ff0000";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(positionX, 0);
    this.ctx.lineTo(positionX, this.canvas.height);
    this.ctx.stroke();
  }

  // 获取索引对应的频率
  private getFrequencyForIndex(index: number): number {
    if (!this.analyser) return 0;

    const nyquist = this.audioContext ? this.audioContext.sampleRate / 2 : 22050;
    return (index * nyquist) / this.analyser.frequencyBinCount;
  }

  // 缓存波形数据
  public async cacheWaveform(audioUrl: string): Promise<void> {
    try {
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();

      if (!this.audioContext) {
        this.createAudioContext();
      }

      if (this.audioContext) {
        this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.generateWaveformData();
      }
    } catch (error) {
      console.error("Failed to cache waveform:", error);
    }
  }

  // 生成波形数据
  private generateWaveformData(): void {
    if (!this.audioBuffer) return;

    const channelData = this.audioBuffer.getChannelData(0);
    const samples = 1024;
    const blockSize = Math.floor(channelData.length / samples);

    this.cachedWaveform = [];

    for (let i = 0; i < samples; i++) {
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[i * blockSize + j]);
      }
      this.cachedWaveform.push(sum / blockSize);
    }
  }

  // 设置FFT数据范围
  public setFFTRange(min: number, max: number): void {
    this.fftDataRangeMin = Math.max(20, min);
    this.fftDataRangeMax = Math.min(20000, max);
  }

  // 设置低频音量
  public setLowFreqVolume(volume: number): void {
    this.backgroundLowFreqVolume = Math.max(0, Math.min(2, volume));
  }

  // 获取缓存的波形数据
  public getCachedWaveform(): number[] {
    return [...this.cachedWaveform];
  }

  // 设置画布
  public setCanvas(canvasElement: HTMLCanvasElement): void {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext("2d");

    if (this.isActive) {
      this.startVisualization();
    }
  }

  // 调整音量（与波形显示相关的调整）
  public adjustWaveformForVolume(volume: number): void {
    // 根据音量调整波形显示的视觉效果
    // 这只是一个示例实现，具体逻辑可能需要根据实际需求调整
    const adjustedVolume = Math.max(0.1, volume);
    this.setLowFreqVolume(adjustedVolume * 0.7);
  }

  // 检查是否支持波形可视化
  public isSupported(): boolean {
    return !!(window.AudioContext || (window as any).webkitAudioContext);
  }

  // 清理资源
  public destroy(): void {
    this.stopVisualization();

    // 移除事件监听
    eventBus.off("audio:play", this.startVisualization);
    eventBus.off("audio:pause", this.stopVisualization);
    eventBus.off("audio:ended", this.stopVisualization);
    eventBus.off("audio:time-update", this.updatePosition);

    // 关闭音频上下文
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.dataArray = null;
    this.canvas = null;
    this.ctx = null;
    this.audioBuffer = null;
    this.cachedWaveform = [];
  }
}