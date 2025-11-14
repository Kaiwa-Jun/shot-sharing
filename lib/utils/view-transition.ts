/**
 * View Transition APIを使用してナビゲーションを実行
 * APIがサポートされていない場合は通常のナビゲーションにフォールバック
 */
export function navigateWithTransition(callback: () => void) {
  // View Transition APIのサポートチェック
  if (
    typeof document !== "undefined" &&
    "startViewTransition" in document &&
    typeof (document as any).startViewTransition === "function"
  ) {
    // View Transition APIを使用
    (document as any).startViewTransition(() => {
      callback();
    });
  } else {
    // フォールバック: 通常のナビゲーション
    callback();
  }
}
