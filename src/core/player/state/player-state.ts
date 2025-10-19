import type { PlayerState } from '../../../app/types';
import { DEFAULT_PLAYER_STATE } from '../../../app/constants';

/**
 * PlayerStateService 负责状态读写、校验、默认值注入
 * - 提供统一的 get/set API
 * - 校验类型与边界
 * - 管理状态变更通知
 */
export class PlayerStateService {
  private state: PlayerState;
  private listeners: Map<string, Array<(state: PlayerState) => void>> = new Map();

  constructor(initialState: Partial<PlayerState> = {}) {
    // 合并默认状态和初始状态
    this.state = this.mergeWithDefaultState(initialState);
  }

  // 合并默认状态和初始状态
  private mergeWithDefaultState(initialState: Partial<PlayerState>): PlayerState {
    // 深拷贝默认状态
    const mergedState = JSON.parse(JSON.stringify(DEFAULT_PLAYER_STATE)) as PlayerState;

    // 合并初始状态
    Object.keys(initialState).forEach(key => {
      const stateKey = key as keyof PlayerState;
      // 仅在初始状态有值且类型匹配时才合并
      if (initialState[stateKey] !== undefined) {
        (mergedState as any)[stateKey] = initialState[stateKey];
      }
    });

    // 验证合并后的状态
    this.validateState(mergedState);

    return mergedState;
  }

  // 验证状态
  private validateState(state: PlayerState): void {
    // 验证基本类型
    if (typeof state.isPlaying !== 'boolean') state.isPlaying = false;
    if (typeof state.currentTime !== 'number') state.currentTime = 0;
    if (typeof state.duration !== 'number') state.duration = 0;

    // 验证数值范围
    state.currentTime = Math.max(0, Math.min(state.currentTime, state.duration));

    // 验证背景相关参数
    if (state.backgroundFlowSpeed !== undefined) {
      state.backgroundFlowSpeed = Math.max(0, state.backgroundFlowSpeed);
    }

    if (state.backgroundRenderScale !== undefined) {
      state.backgroundRenderScale = Math.max(0.1, state.backgroundRenderScale);
    }

    if (state.backgroundFPS !== undefined) {
      state.backgroundFPS = Math.max(1, Math.min(state.backgroundFPS, 60));
    }

    // 验证歌词相关参数
    if (state.lyricDelay !== undefined) {
      state.lyricDelay = Math.max(-5000, Math.min(state.lyricDelay, 5000));
    }

    if (state.wordFadeWidth !== undefined) {
      state.wordFadeWidth = Math.max(0, Math.min(state.wordFadeWidth, 200));
    }

    // 验证区间选择相关参数
    if (state.rangeStartTime !== undefined) {
      state.rangeStartTime = Math.max(0, Math.min(state.rangeStartTime, state.duration));
    }

    if (state.rangeEndTime !== undefined) {
      state.rangeEndTime = Math.max(0, Math.min(state.rangeEndTime, state.duration));
    }

    // 确保区间开始时间不大于结束时间
    if (state.rangeStartTime > state.rangeEndTime && state.rangeEndTime > 0) {
      [state.rangeStartTime, state.rangeEndTime] = [state.rangeEndTime, state.rangeStartTime];
    }
  }

  // 获取完整状态
  public getState(): Readonly<PlayerState> {
    return { ...this.state };
  }

  // 获取指定属性的值
  public get<K extends keyof PlayerState>(key: K): PlayerState[K] {
    return this.state[key];
  }

  // 设置单个属性的值
  public set<K extends keyof PlayerState>(key: K, value: PlayerState[K]): void {
    // 保存旧值以便比较
    const oldValue = this.state[key];

    // 更新状态
    this.state[key] = value;

    // 验证更新后的状态
    this.validateState(this.state);

    // 如果值发生了变化，通知监听器
    if (oldValue !== this.state[key]) {
      this.notifyListeners(key);
    }
  }

  // 批量更新多个属性
  public update(updates: Partial<PlayerState>): void {
    // 保存旧值以便比较
    const oldState = { ...this.state };

    // 应用更新
    Object.keys(updates).forEach(key => {
      const stateKey = key as keyof PlayerState;
      if (updates[stateKey] !== undefined) {
        (this.state as any)[stateKey] = updates[stateKey];
      }
    });

    // 验证更新后的状态
    this.validateState(this.state);

    // 检查哪些属性发生了变化，并通知相应的监听器
    Object.keys(updates).forEach(key => {
      const stateKey = key as keyof PlayerState;
      if (oldState[stateKey] !== this.state[stateKey]) {
        this.notifyListeners(stateKey);
      }
    });
  }

  // 重置状态
  public reset(): void {
    // 保存旧状态以便比较
    const oldState = { ...this.state };

    // 重置为默认状态
    this.state = JSON.parse(JSON.stringify(DEFAULT_PLAYER_STATE)) as PlayerState;

    // 验证状态
    this.validateState(this.state);

    // 通知所有属性的监听器
    Object.keys(this.listeners).forEach(key => {
      const stateKey = key as keyof PlayerState;
      if (oldState[stateKey] !== this.state[stateKey]) {
        this.notifyListeners(stateKey);
      }
    });
  }

  // 订阅状态变更
  public subscribe(key: keyof PlayerState, listener: (state: PlayerState) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }

    const listeners = this.listeners.get(key)!;
    listeners.push(listener);

    // 返回取消订阅的函数
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);

        // 如果没有监听器了，移除该键
        if (listeners.length === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  // 通知监听器
  private notifyListeners(key: keyof PlayerState): void {
    const listeners = this.listeners.get(key);
    if (listeners) {
      // 创建状态快照
      const stateSnapshot = this.getState();

      // 通知所有监听器
      listeners.forEach(listener => {
        try {
          listener(stateSnapshot);
        } catch (error) {
          console.error(`Error in state listener for ${key}:`, error);
        }
      });
    }
  }

  // 检查状态是否有效
  public isValid(): boolean {
    try {
      this.validateState(this.state);
      return true;
    } catch (error) {
      console.error('Invalid state:', error);
      return false;
    }
  }

  // 获取状态的 JSON 字符串表示
  public toJSON(): string {
    return JSON.stringify(this.state);
  }

  // 从 JSON 字符串恢复状态
  public fromJSON(json: string): void {
    try {
      const parsedState = JSON.parse(json) as Partial<PlayerState>;
      this.update(parsedState);
    } catch (error) {
      console.error('Failed to parse state from JSON:', error);
    }
  }
}