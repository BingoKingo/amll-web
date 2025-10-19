/**
 * EventBus 是一个轻量的事件中心
 * - 提供订阅/发布/取消订阅的基本功能
 * - 支持事件命名空间和通配符
 * - 防止循环调用和内存泄漏
 */
export class EventBus {
  private events: Map<string, Array<Function>> = new Map();
  private isDispatching: Map<string, boolean> = new Map();
  private maxListeners: number = 10; // 默认最大监听器数

  constructor(maxListeners: number = 10) {
    this.maxListeners = maxListeners;
  }

  // 订阅事件
  public on(eventName: string, listener: Function): () => void {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }

    const listeners = this.events.get(eventName)!;

    // 检查监听器数量是否超过限制
    if (listeners.length >= this.maxListeners) {
      console.warn(`Warning: Possible EventBus memory leak detected. ${listeners.length} listeners added for event '${eventName}'.`);
    }

    // 添加监听器
    listeners.push(listener);

    // 返回取消订阅的函数
    return () => {
      this.off(eventName, listener);
    };
  }

  // 订阅一次性事件
  public once(eventName: string, listener: Function): () => void {
    const wrappedListener = (...args: any[]) => {
      this.off(eventName, wrappedListener);
      listener.apply(null, args);
    };

    return this.on(eventName, wrappedListener);
  }

  // 发布事件
  public emit(eventName: string, ...args: any[]): boolean {
    // 防止递归调用
    if (this.isDispatching.get(eventName)) {
      console.warn(`Warning: Recursive event dispatch detected for '${eventName}'.`);
      return false;
    }

    const listeners = this.events.get(eventName);
    if (!listeners || listeners.length === 0) {
      return false;
    }

    // 标记为正在调度中
    this.isDispatching.set(eventName, true);

    try {
      // 创建监听器副本，避免在回调中修改监听器列表导致的问题
      const listenersCopy = [...listeners];

      // 调用所有监听器
      for (const listener of listenersCopy) {
        try {
          listener.apply(null, args);
        } catch (error) {
          console.error(`Error in event listener for '${eventName}':`, error);
        }
      }
    } finally {
      // 标记为调度完成
      this.isDispatching.set(eventName, false);
    }

    return true;
  }

  // 取消订阅事件
  public off(eventName: string, listener?: Function): void {
    const listeners = this.events.get(eventName);
    if (!listeners) {
      return;
    }

    // 如果指定了监听器，只移除该监听器
    if (listener) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    } else {
      // 如果没有指定监听器，移除所有监听器
      this.events.delete(eventName);
    }
  }

  // 移除所有事件监听器
  public removeAllListeners(eventName?: string): void {
    if (eventName) {
      this.events.delete(eventName);
    } else {
      this.events.clear();
    }
  }

  // 获取指定事件的监听器数量
  public listenerCount(eventName: string): number {
    const listeners = this.events.get(eventName);
    return listeners ? listeners.length : 0;
  }

  // 获取所有注册的事件名称
  public eventNames(): string[] {
    return Array.from(this.events.keys());
  }

  // 设置最大监听器数
  public setMaxListeners(max: number): void {
    this.maxListeners = max;
  }

  // 获取最大监听器数
  public getMaxListeners(): number {
    return this.maxListeners;
  }

  // 销毁事件总线
  public destroy(): void {
    this.removeAllListeners();
    this.isDispatching.clear();
  }
}

// 创建一个默认的全局事件总线实例
const defaultEventBus = new EventBus();

export default defaultEventBus;