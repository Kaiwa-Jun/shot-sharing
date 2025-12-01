/**
 * グローバル画像読み込み状態キャッシュ
 *
 * ページ間で画像の読み込み状態を共有し、
 * 一度読み込んだ画像は即座に表示できるようにする
 */

// 読み込み済み画像URLを記憶（モジュールレベルでページ遷移後も保持）
const loadedImageUrls = new Set<string>();

/**
 * 画像URLを読み込み済みとしてマーク
 */
export function markImageAsLoaded(url: string): void {
  loadedImageUrls.add(url);
}

/**
 * 画像URLが読み込み済みかどうかを確認
 */
export function isImageLoaded(url: string): boolean {
  return loadedImageUrls.has(url);
}

/**
 * キャッシュをクリア（デバッグ用）
 */
export function clearImageCache(): void {
  loadedImageUrls.clear();
}

/**
 * キャッシュサイズを取得（デバッグ用）
 */
export function getImageCacheSize(): number {
  return loadedImageUrls.size;
}
