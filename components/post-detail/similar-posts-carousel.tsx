"use client";

import { Post } from "@/app/actions/posts";
import { motion } from "framer-motion";
import Image from "next/image";

interface SimilarPostsCarouselProps {
  posts: Post[];
  onPostClick: (postId: string) => void;
}

export function SimilarPostsCarousel({
  posts,
  onPostClick,
}: SimilarPostsCarouselProps) {
  console.log(
    `🎠 [DEBUG] SimilarPostsCarousel: posts.length = ${posts.length}`
  );

  // 類似作例が0件の場合は表示しない
  if (posts.length === 0) {
    console.log(`⚠️ [DEBUG] SimilarPostsCarousel: 0件のため非表示`);
    return null;
  }

  console.log(
    `✅ [DEBUG] SimilarPostsCarousel: カルーセル表示 (${posts.length}件)`
  );

  return (
    <div className="border-t pt-6">
      <h3 className="mb-4 text-lg font-semibold">類似の作例</h3>

      {/* 横スクロールコンテナ */}
      <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-4">
        {posts.map((post) => (
          <motion.button
            key={post.id}
            onClick={() => onPostClick(post.id)}
            className="w-[140px] flex-shrink-0 cursor-pointer rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {/* サムネイル */}
            <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted">
              <Image
                src={post.thumbnailUrl}
                alt={post.description || "類似作例"}
                fill
                className="object-cover transition-opacity hover:opacity-90"
                sizes="140px"
                loading="lazy"
              />
            </div>

            {/* Exif情報 */}
            {post.exifData && (
              <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                {/* 撮影設定 */}
                {(post.exifData.iso ||
                  post.exifData.fValue ||
                  post.exifData.shutterSpeed) && (
                  <div className="line-clamp-1">
                    {[
                      post.exifData.iso && `ISO ${post.exifData.iso}`,
                      post.exifData.fValue && `f/${post.exifData.fValue}`,
                      post.exifData.shutterSpeed,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </div>
                )}

                {/* 焦点距離 */}
                {post.exifData.focalLength && (
                  <div className="line-clamp-1">
                    {post.exifData.focalLength}mm
                  </div>
                )}
              </div>
            )}
          </motion.button>
        ))}
      </div>

      {/* スクロールヒント（モバイル用） */}
      {posts.length > 2 && (
        <p className="mt-2 text-xs text-muted-foreground md:hidden">
          ← スワイプして他の作例を見る →
        </p>
      )}
    </div>
  );
}
