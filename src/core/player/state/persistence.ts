import type { PlayerState } from '../../../app/types';
import { STORAGE_KEY, STORAGE_VERSION, getDefaultState } from '../../../app/constants';

/**
 * StatePersistence 负责 localStorage 读写与迁移策略
 * - 提供存储和加载 PlayerState 的方法
 * - 实现版本化迁移策略
 * - 默认禁用，遵循最小依赖原则
 */
export class StatePersistence {
  private storageKey: string;
  private currentVersion: string;
  private isEnabled: boolean = false;
  private migrationStrategies: Map<string, (data: any) => PlayerState> = new Map();

  constructor(
    storageKey: string = STORAGE_KEY,
    currentVersion: string = STORAGE_VERSION,
    isEnabled: boolean = false
  ) {
    this.storageKey = storageKey;
    this.currentVersion = currentVersion;
    this.isEnabled = isEnabled;

    // 初始化迁移策略
    this.initMigrationStrategies();
  }

  // 初始化迁移策略
  private initMigrationStrategies(): void {
    // 从版本 1.0.0 迁移到当前版本的策略
    this.migrationStrategies.set('1.0.0', this.migrateFrom100.bind(this));

    // 可以添加更多的迁移策略
    // this.migrationStrategies.set('1.1.0', this.migrateFrom110.bind(this));
  }

  // 从版本 1.0.0 迁移到当前版本
  private migrateFrom100(data: any): PlayerState {
    // 获取默认状态作为基础
    const migratedState = getDefaultState();

    // 从旧数据中迁移可以映射的属性
    if (data.isPlaying !== undefined) migratedState.isPlaying = data.isPlaying;
    if (data.currentPosition !== undefined) migratedState.currentTime = data.currentPosition;
    if (data.duration !== undefined) migratedState.duration = data.duration;
    if (data.lyricDelay !== undefined) migratedState.lyricDelay = data.lyricDelay;
    if (data.wordFadeWidth !== undefined) migratedState.wordFadeWidth = data.wordFadeWidth;
    if (data.isRangeMode !== undefined) migratedState.isRangeMode = data.isRangeMode;
    if (data.rangeStartTime !== undefined) migratedState.rangeStartTime = data.rangeStartTime;
    if (data.rangeEndTime !== undefined) migratedState.rangeEndTime = data.rangeEndTime;
    if (data.showStats !== undefined) migratedState.showStats = data.showStats;
    if (data.invertColors !== undefined) migratedState.invertColors = data.invertColors;

    // 映射背景相关属性
    if (data.backgroundType === 'dynamic') migratedState.backgroundType = 'amll';
    if (data.backgroundFlowSpeed !== undefined) migratedState.backgroundFlowSpeed = data.backgroundFlowSpeed;
    if (data.renderScale !== undefined) migratedState.backgroundRenderScale = data.renderScale;
    if (data.fps !== undefined) migratedState.backgroundFPS = data.fps;
    if (data.roundedCover !== undefined) migratedState.roundedCover = data.roundedCover;

    return migratedState;
  }

  // 启用持久化
  public enable(): void {
    this.isEnabled = true;
  }

  // 禁用持久化
  public disable(): void {
    this.isEnabled = false;
  }

  // 检查是否启用了持久化
  public getEnabled(): boolean {
    return this.isEnabled;
  }

  // 检查 localStorage 是否可用
  private isStorageAvailable(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  // 保存状态到 localStorage
  public saveState(state: PlayerState): boolean {
    if (!this.isEnabled || !this.isStorageAvailable()) {
      return false;
    }

    try {
      const dataToSave = {
        version: this.currentVersion,
        timestamp: Date.now(),
        state: state
      };

      localStorage.setItem(this.storageKey, JSON.stringify(dataToSave));
      return true;
    } catch (error) {
      console.error('Failed to save state to localStorage:', error);
      return false;
    }
  }

  // 从 localStorage 加载状态
  public loadState(): PlayerState | null {
    if (!this.isEnabled || !this.isStorageAvailable()) {
      return null;
    }

    try {
      const storedData = localStorage.getItem(this.storageKey);
      if (!storedData) {
        return null;
      }

      const parsedData = JSON.parse(storedData);

      // 检查数据格式是否有效
      if (!parsedData || typeof parsedData !== 'object') {
        return null;
      }

      // 获取数据版本
      const dataVersion = parsedData.version || '1.0.0';

      // 如果数据版本与当前版本相同，直接返回状态
      if (dataVersion === this.currentVersion && parsedData.state) {
        return parsedData.state;
      }

      // 否则，应用迁移策略
      return this.migrateData(parsedData, dataVersion);
    } catch (error) {
      console.error('Failed to load state from localStorage:', error);
      return null;
    }
  }

  // 迁移数据
  private migrateData(parsedData: any, dataVersion: string): PlayerState | null {
    // 查找对应的迁移策略
    const migrationStrategy = this.migrationStrategies.get(dataVersion);

    if (!migrationStrategy || !parsedData.state) {
      console.warn(`No migration strategy found for version ${dataVersion}`);
      return null;
    }

    try {
      // 应用迁移策略
      const migratedState = migrationStrategy(parsedData.state);

      // 保存迁移后的状态
      this.saveState(migratedState);

      return migratedState;
    } catch (error) {
      console.error(`Migration from version ${dataVersion} failed:`, error);
      return null;
    }
  }

  // 清除存储的状态
  public clearState(): boolean {
    if (!this.isStorageAvailable()) {
      return false;
    }

    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.error('Failed to clear state from localStorage:', error);
      return false;
    }
  }

  // 获取上次保存时间
  public getLastSavedTime(): number | null {
    if (!this.isEnabled || !this.isStorageAvailable()) {
      return null;
    }

    try {
      const storedData = localStorage.getItem(this.storageKey);
      if (!storedData) {
        return null;
      }

      const parsedData = JSON.parse(storedData);
      return parsedData.timestamp || null;
    } catch (error) {
      console.error('Failed to get last saved time:', error);
      return null;
    }
  }

  // 获取存储的状态大小
  public getStateSize(): number {
    if (!this.isStorageAvailable()) {
      return 0;
    }

    try {
      const storedData = localStorage.getItem(this.storageKey);
      return storedData ? storedData.length : 0;
    } catch (error) {
      console.error('Failed to get state size:', error);
      return 0;
    }
  }

  // 检查存储是否超出限制
  public isStorageFull(): boolean {
    if (!this.isStorageAvailable()) {
      return false;
    }

    try {
      // 尝试存储一个大字符串来检查是否已满
      const testKey = '__storage_full_test__';
      const testValue = 'x'.repeat(1024 * 1024); // 1MB
      localStorage.setItem(testKey, testValue);
      localStorage.removeItem(testKey);
      return false;
    } catch (e) {
      return true;
    }
  }

  // 导出状态为 JSON 字符串
  public exportState(): string | null {
    const state = this.loadState();
    if (!state) {
      return null;
    }

    try {
      return JSON.stringify({
        version: this.currentVersion,
        timestamp: Date.now(),
        state: state
      }, null, 2);
    } catch (error) {
      console.error('Failed to export state:', error);
      return null;
    }
  }

  // 从 JSON 字符串导入状态
  public importState(json: string): boolean {
    if (!this.isEnabled || !this.isStorageAvailable()) {
      return false;
    }

    try {
      const parsedData = JSON.parse(json);

      // 检查导入的数据格式是否有效
      if (!parsedData || typeof parsedData !== 'object' || !parsedData.state) {
        return false;
      }

      // 保存导入的状态
      return this.saveState(parsedData.state);
    } catch (error) {
      console.error('Failed to import state:', error);
      return false;
    }
  }
}