"use client";

import { Post } from "@/app/actions/posts";
import { motion, useMotionValue, useTransform } from "framer-motion";
import Image from "next/image";
import { useState, useEffect } from "react";
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
  const [isMobile, setIsMobile] = useState(false);

  console.log("[PostDetailModal] レンダリング", {
    postId: post.id.slice(0, 8),
  });

  // モバイル判定
  useEffect(() => {
    console.log("[PostDetailModal] マウント");

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // スワイプクローズ用のモーション値
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 300], [1, 0]);

  // 閉じる処理
  const handleClose = () => {
    onClose();
  };

  // ドラッグ終了時の処理
  const handleDragEnd = (_: any, info: any) => {
    if (!isMobile) return; // デスクトップでは処理しない

    // 任意の方向に150px以上ドラッグした場合は閉じる
    const distance = Math.sqrt(info.offset.x ** 2 + info.offset.y ** 2);
    if (distance > 150) {
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
        style={isMobile ? { x, y } : {}}
        drag={isMobile ? true : false}
        dragConstraints={
          isMobile ? { top: 0, bottom: 0, left: 0, right: 0 } : undefined
        }
        dragElastic={isMobile ? 0.2 : undefined}
        onDragEnd={isMobile ? handleDragEnd : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {/* スクロール可能なコンテンツエリア */}
        <div className="h-full overflow-y-auto">
          {/* 画像エリア */}
          <div className="relative h-[60vh] min-h-[400px] bg-black">
            {!isMobile ? (
              // デスクトップ: ピンチズーム有効
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
                    className="relative flex h-full w-full items-center justify-center"
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
                      className="max-h-full max-w-full object-contain"
                      priority
                      unoptimized
                    />
                  </motion.div>
                </TransformComponent>
              </TransformWrapper>
            ) : (
              // モバイル: 画像固定（ピンチズーム無効）
              <div className="flex h-full w-full items-center justify-center">
                <motion.div
                  layoutId={`photo-${post.id}`}
                  className="relative flex h-full w-full items-center justify-center"
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
                    className="max-h-full max-w-full object-contain"
                    priority
                    unoptimized
                  />
                </motion.div>
              </div>
            )}
          </div>

          {/* コンテンツエリア */}
          <motion.div
            className="space-y-6 p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            {/* Exif情報と保存ボタン */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                {post.exifData && <ExifInfo exifData={post.exifData} />}
              </div>
              <SaveButton isSaved={isSaved} onClick={handleSaveClick} />
            </div>

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
