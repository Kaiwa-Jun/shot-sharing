"use client";

import { motion } from "framer-motion";

/**
 * 検索結果のローディングスケルトン
 * 検索中に表示されるプレースホルダー
 */
export function SearchLoadingSkeleton() {
  // スケルトンカードの高さをランダムに設定（Masonry風）
  const skeletonHeights = [280, 320, 240, 360, 300, 260, 340, 280];

  return (
    <div className="w-full">
      {/* メッセージ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 text-center"
      >
        <p className="text-lg font-medium text-muted-foreground">
          検索結果を取得中
          <span className="inline-flex gap-0.5">
            <motion.span
              animate={{ y: [0, -4, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              .
            </motion.span>
            <motion.span
              animate={{ y: [0, -4, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.2,
              }}
            >
              .
            </motion.span>
            <motion.span
              animate={{ y: [0, -4, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.4,
              }}
            >
              .
            </motion.span>
          </span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground/70">
          AIが最適な写真を探しています
        </p>
      </motion.div>

      {/* スケルトングリッド */}
      <div className="masonry-grid">
        {skeletonHeights.map((height, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: index * 0.1,
              duration: 0.3,
            }}
            className="masonry-item"
          >
            <div
              className="overflow-hidden rounded-lg bg-muted"
              style={{ height: `${height}px` }}
            >
              {/* パルスアニメーション */}
              <motion.div
                className="h-full w-full bg-gradient-to-br from-muted via-muted-foreground/10 to-muted"
                animate={{
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: index * 0.1,
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
