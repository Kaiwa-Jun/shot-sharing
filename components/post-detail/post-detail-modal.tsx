"use client";

import { Post } from "@/app/actions/posts";
import { motion, useMotionValue, useTransform } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ExifInfo } from "./exif-info";
import { SaveButton } from "./save-button";

interface PostDetailModalProps {
  post: Post;
  initialIsSaved: boolean;
  onClose: () => void;
}

export function PostDetailModal({
  post,
  initialIsSaved,
  onClose,
}: PostDetailModalProps) {
  const [isSaved, setIsSaved] = useState(initialIsSaved);

  // スワイプクローズ用のモーション値
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 300], [1, 0]);

  // 閉じる処理
  const handleClose = () => {
    onClose();
  };

  // ドラッグ終了時の処理
  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.y > 150) {
      // 下方向に150px以上ドラッグした場合は閉じる
      handleClose();
    }
  };

  // 保存ボタンのクリック処理
  const handleSaveClick = async () => {
    try {
      const response = await fetch("/api/saves/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ postId: post.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle save");
      }

      const data = await response.json();
      setIsSaved(data.saved);
    } catch (error) {
      console.error("Error toggling save:", error);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={handleClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* モーダルコンテナ */}
      <motion.div
        className="relative h-full w-full max-w-4xl overflow-hidden bg-background"
        style={{ y, opacity }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.7 }}
        onDragEnd={handleDragEnd}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <motion.div
          className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <SaveButton isSaved={isSaved} onClick={handleSaveClick} />
          <button
            onClick={handleClose}
            className="rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
            aria-label="閉じる"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </motion.div>

        {/* スクロール可能なコンテンツエリア */}
        <div className="h-full overflow-y-auto">
          {/* 画像エリア（ピンチズーム対応） */}
          <div className="relative h-[60vh] min-h-[400px] bg-black">
            <TransformWrapper
              initialScale={1}
              minScale={1}
              maxScale={4}
              centerOnInit
            >
              <TransformComponent
                wrapperClass="!w-full !h-full"
                contentClass="!w-full !h-full flex items-center justify-center"
              >
                <motion.div
                  layoutId={`photo-${post.id}`}
                  className="relative"
                  transition={{
                    duration: 0.55,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                >
                  <Image
                    src={post.imageUrl}
                    alt={post.description || "Photo"}
                    width={post.width || 800}
                    height={post.height || 1200}
                    className="h-auto max-h-full w-auto max-w-full object-contain"
                    priority
                    unoptimized
                  />
                </motion.div>
              </TransformComponent>
            </TransformWrapper>
          </div>

          {/* コンテンツエリア */}
          <motion.div
            className="space-y-6 p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            {/* Exif情報 */}
            {post.exifData && <ExifInfo exifData={post.exifData} />}

            {/* 説明文 */}
            {post.description && (
              <div className="text-sm text-muted-foreground">
                {post.description}
              </div>
            )}

            {/* 類似作例セクション（仮表示） */}
            <div className="border-t pt-6">
              <h3 className="mb-4 text-lg font-semibold">類似の作例</h3>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {/* プレースホルダー */}
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-32 w-24 flex-shrink-0 rounded bg-muted"
                  />
                ))}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                ※ 類似作例の表示は今後実装予定です
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
