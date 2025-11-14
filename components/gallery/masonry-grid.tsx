"use client";

import { useState, useCallback, useEffect } from "react";
import Masonry from "react-masonry-css";
import { PhotoCard, PhotoCardProps } from "./photo-card";
import "./masonry-grid.css";

interface MasonryGridProps {
  initialPhotos: PhotoCardProps[];
}

export function MasonryGrid({ initialPhotos }: MasonryGridProps) {
  const [photos, setPhotos] = useState<PhotoCardProps[]>(initialPhotos);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const breakpointColumns = {
    default: 4, // デフォルト（大画面）: 4列
    640: 2, // スマホ（640px以下）: 2列
    1024: 3, // タブレット（1024px以下）: 3列
    1280: 4, // デスクトップ（1280px以下）: 4列
  };

  // 無限スクロール: 追加データロード
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          limit: 20,
          offset: photos.length,
        }),
      });

      if (!response.ok) {
        throw new Error("データの取得に失敗しました");
      }

      const { data, error: apiError } = await response.json();

      if (apiError) {
        throw new Error(apiError);
      }

      if (data && data.length > 0) {
        // 重複チェック: 既存のIDセットを作成
        setPhotos((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newPhotos = data.filter(
            (photo: PhotoCardProps) => !existingIds.has(photo.id)
          );

          // 新しい写真がない場合はデータ終了
          if (newPhotos.length === 0) {
            setHasMore(false);
            return prev;
          }

          return [...prev, ...newPhotos];
        });
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Error loading more photos:", err);
      setError(
        err instanceof Error ? err.message : "予期しないエラーが発生しました"
      );
    } finally {
      setIsLoading(false);
    }
  }, [photos.length, isLoading, hasMore]);

  // スクロール検出（デバウンス付き）
  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop >=
      document.documentElement.offsetHeight - 1000
    ) {
      loadMore();
    }
  }, [loadMore]);

  // スクロールイベントリスナー（デバウンス処理）
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const debouncedScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 100); // 100ms のデバウンス
    };

    window.addEventListener("scroll", debouncedScroll);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("scroll", debouncedScroll);
    };
  }, [handleScroll]);

  return (
    <div>
      <Masonry
        breakpointCols={breakpointColumns}
        className="masonry-grid"
        columnClassName="masonry-grid_column"
      >
        {photos.map((photo) => (
          <PhotoCard key={photo.id} {...photo} />
        ))}
      </Masonry>

      {/* ローディングスピナー */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <div
            role="status"
            className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
            aria-label="読み込み中"
          />
        </div>
      )}

      {/* エラーメッセージ */}
      {error && (
        <div className="flex justify-center py-8">
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {/* すべて表示済み */}
      {!hasMore && !isLoading && (
        <div className="flex justify-center py-8">
          <p className="text-gray-500">すべての画像を表示しました</p>
        </div>
      )}
    </div>
  );
}
