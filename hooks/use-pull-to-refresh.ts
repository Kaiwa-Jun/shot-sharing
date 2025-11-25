import { useEffect, useRef, useState, useCallback } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  disabled?: boolean;
  threshold?: number;
  resistance?: number;
}

interface UsePullToRefreshReturn {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
}

/**
 * Pull-to-Refresh機能を提供するカスタムフック
 * モバイル/タッチデバイスでのみ動作します
 */
export function usePullToRefresh({
  onRefresh,
  disabled = false,
  threshold = 80,
  resistance = 2.5,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef<number>(0);
  const scrollableRef = useRef<number>(0);

  // モバイルデバイス判定
  const isMobile = useCallback(() => {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }, []);

  // タッチ開始
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || !isMobile() || isRefreshing) return;

      // スクロール位置が最上部にある場合のみ有効
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (scrollTop === 0) {
        touchStartY.current = e.touches[0].clientY;
        scrollableRef.current = scrollTop;
      }
    },
    [disabled, isMobile, isRefreshing]
  );

  // タッチ移動
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (disabled || !isMobile() || isRefreshing) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop;

      // スクロール位置が最上部でない場合は処理しない
      if (scrollTop > 0) {
        setIsPulling(false);
        setPullDistance(0);
        return;
      }

      const touchCurrentY = e.touches[0].clientY;
      const distance = touchCurrentY - touchStartY.current;

      // 下方向へのスワイプのみ処理
      if (distance > 0 && scrollTop === 0) {
        // スクロール位置が0の場合のみpreventDefaultを呼び出す（スクロール開始前）
        e.preventDefault();

        setIsPulling(true);

        // 抵抗感を加えてプル距離を計算
        const adjustedDistance = distance / resistance;
        setPullDistance(Math.min(adjustedDistance, threshold * 2.5));
      }
    },
    [disabled, isMobile, isRefreshing, threshold, resistance]
  );

  // タッチ終了
  const handleTouchEnd = useCallback(async () => {
    if (disabled || !isMobile() || isRefreshing) return;

    if (pullDistance >= threshold) {
      // 閾値を超えたらリフレッシュ開始
      setIsRefreshing(true);
      setIsPulling(false);
      setPullDistance(threshold); // 固定位置に表示

      const startTime = Date.now(); // リフレッシュ開始時刻

      try {
        await onRefresh();
      } catch (error) {
        console.error("Failed to refresh:", error);
      }

      // 最低0.7秒は表示する
      const elapsed = Date.now() - startTime;
      const minDuration = 700; // 0.7秒
      if (elapsed < minDuration) {
        await new Promise((resolve) =>
          setTimeout(resolve, minDuration - elapsed)
        );
      }

      setIsRefreshing(false);
      setPullDistance(0);
    } else {
      // 閾値未満なら元に戻す
      setIsPulling(false);
      setPullDistance(0);
    }

    touchStartY.current = 0;
  }, [disabled, isMobile, isRefreshing, pullDistance, threshold, onRefresh]);

  useEffect(() => {
    if (!isMobile() || disabled) return;

    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, isMobile, disabled]);

  return {
    isPulling,
    isRefreshing,
    pullDistance,
  };
}
