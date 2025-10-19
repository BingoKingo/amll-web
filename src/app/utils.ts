// 防抖函数
export function debounce(func: Function, wait: number): Function {
  let timeout: number | null = null;
  return function executedFunction(...args: any[]) {
    const later = () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      func(...args);
    };
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = window.setTimeout(later, wait);
    return executedFunction;
  };
}

// 格式化时间为 mm:ss 格式
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

// 计算剩余时间并格式化
export function formatRemainingTime(
  currentTime: number,
  duration: number
): string {
  const remaining = duration - currentTime;
  return `-${formatTime(Math.max(0, remaining))}`;
}

// 安全获取DOM元素
export function getElement<T extends HTMLElement>(selector: string): T | null {
  const element = document.querySelector<T>(selector);
  return element;
}

// 安全获取DOM元素并断言非空
export function getElementOrThrow<T extends HTMLElement>(selector: string): T {
  const element = getElement<T>(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }
  return element;
}

// 颜色转换工具 - RGB转HEX
export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((x) => {
      const hex = x.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    })
    .join("")}`;
}

// 颜色转换工具 - HEX转RGB
export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [255, 255, 255];
}

// 检查是否为有效URL
export function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch (e) {
    return false;
  }
}

// 检查是否为Base64编码
export function isBase64(str: string): boolean {
  try {
    return btoa(atob(str)) === str && /^[A-Za-z0-9+/=]+$/.test(str);
  } catch (e) {
    return false;
  }
}

// 解析URL参数
export function getUrlParams(): Record<string, string> {
  const params: Record<string, string> = {};
  const queryString = window.location.search.substring(1);
  const pairs = queryString.split("&");
  for (const pair of pairs) {
    const [key, value] = pair.split("=");
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(value || "");
    }
  }
  return params;
}

// 生成UUID
export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// 限制数值范围
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// 线性插值
export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

// 平滑滚动到元素
export function scrollToElement(
  element: HTMLElement,
  behavior: ScrollBehavior = "smooth",
  block: ScrollLogicalPosition = "center"
): void {
  element.scrollIntoView({ behavior, block });
}

// 检查元素是否在视口中
export function isInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}
