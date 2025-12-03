"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { Loader2 } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
  threshold?: number;
  topOffset?: number; // ヘッダーの高さなど、上からのオフセット（px）
}

/**
 * Pull-to-Refresh機能を提供するコンポーネント
 * モバイル/タッチデバイスでのみ動作します
 */
export function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  threshold = 80,
  topOffset = 0,
}: PullToRefreshProps) {
  const { isPulling, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh,
    disabled,
    threshold,
  });

  // ローディングアイコンの表示状態
  const showLoader = isPulling || isRefreshing;

  // ローディングアイコンの不透明度（プル距離に応じて変化）
  const loaderOpacity = Math.min(pullDistance / threshold, 1);

  // ローディングアイコンの回転角度（プル距離に応じて変化）
  const loaderRotation = isRefreshing ? 0 : (pullDistance / threshold) * 360;

  return (
    <div className="relative">
      {/* ローディングインジケーター（コンテンツの上に相対配置） */}
      <AnimatePresence>
        {showLoader && (
          <motion.div
            className="absolute left-0 right-0 z-20 flex justify-center"
            style={{
              top: 8,
            }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: loaderOpacity, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="rounded-full bg-background p-2 shadow-lg ring-1 ring-border">
              <Loader2
                className="h-6 w-6 text-primary"
                style={{
                  animation: isRefreshing ? "spin 1s linear infinite" : "none",
                  transform: isRefreshing
                    ? undefined
                    : `rotate(${loaderRotation}deg)`,
                  transition: isRefreshing
                    ? undefined
                    : "transform 0.1s ease-out",
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* コンテンツ */}
      <motion.div
        className="relative z-10"
        animate={{
          y: isRefreshing
            ? 48 // リフレッシュ中はローディングアイコンの下で固定
            : isPulling
              ? pullDistance * 0.8
              : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
