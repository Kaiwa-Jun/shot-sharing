/**
 * グローバル画像読み込み状態キャッシュ
 *
 * ページ間で画像の読み込み状態を共有し、
 * 一度読み込んだ画像は即座に表示できるようにする
 *
 * sessionStorage を使用してフルページリロード後も状態を保持
 */

const STORAGE_KEY = "shot-sharing-loaded-images";
const MAX_CACHE_SIZE = 500; // キャッシュする最大URL数

// メモリ内キャッシュ（高速アクセス用）
let memoryCache: Set<string> | null = null;

/**
 * sessionStorage からキャッシュを読み込む
 */
function loadFromStorage(): Set<string> {
  if (memoryCache) return memoryCache;

  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const urls = JSON.parse(stored) as string[];
        memoryCache = new Set(urls);
        return memoryCache;
      }
    }
  } catch (e) {
    console.warn("Failed to load image cache from sessionStorage:", e);
  }

  memoryCache = new Set();
  return memoryCache;
}

/**
 * キャッシュを sessionStorage に保存
 */
function saveToStorage(cache: Set<string>): void {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      // キャッシュサイズを制限（古いものから削除）
      const urls = Array.from(cache);
      if (urls.length > MAX_CACHE_SIZE) {
        const trimmed = urls.slice(-MAX_CACHE_SIZE);
        cache.clear();
        trimmed.forEach((url) => cache.add(url));
      }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(cache)));
    }
  } catch (e) {
    console.warn("Failed to save image cache to sessionStorage:", e);
  }
}

/**
 * 画像URLを読み込み済みとしてマーク
 */
export function markImageAsLoaded(url: string): void {
  const cache = loadFromStorage();
  if (!cache.has(url)) {
    cache.add(url);
    saveToStorage(cache);
  }
}

/**
 * 画像URLが読み込み済みかどうかを確認
 * 注意: SSR時は常にfalseを返す（ハイドレーション不一致を防ぐため）
 * クライアント側でuseEffectで再チェックする必要がある
 */
export function isImageLoaded(url: string): boolean {
  // SSR時は常にfalseを返す（ハイドレーション不一致を防ぐ）
  if (typeof window === "undefined") {
    return false;
  }
  const cache = loadFromStorage();
  return cache.has(url);
}

/**
 * クライアントサイドでのみ使用する画像読み込み状態チェック用フック
 * SSR/ハイドレーション対応
 */
export function useImageLoaded(url: string): boolean {
  // この関数はクライアントコンポーネントでuseStateと組み合わせて使用する
  // 初期値はfalse、useEffectでキャッシュをチェックする
  if (typeof window === "undefined") {
    return false;
  }
  const cache = loadFromStorage();
  return cache.has(url);
}

/**
 * キャッシュをクリア（デバッグ用）
 */
export function clearImageCache(): void {
  memoryCache = new Set();
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    console.warn("Failed to clear image cache:", e);
  }
}

/**
 * キャッシュサイズを取得（デバッグ用）
 */
export function getImageCacheSize(): number {
  const cache = loadFromStorage();
  return cache.size;
}
