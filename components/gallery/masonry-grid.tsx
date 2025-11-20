"use client";

import { useState, useCallback, useEffect } from "react";
import Masonry from "react-masonry-css";
import { PhotoCard, PhotoCardProps } from "./photo-card";
import "./masonry-grid.css";

interface MasonryGridProps {
  initialPhotos: PhotoCardProps[];
  onPhotoClick?: (photoId: string, photoData: PhotoCardProps) => void;
  skipInitialAnimation?: boolean;
  isSearchMode?: boolean;
  deletedIds?: Set<string>;
}

export function MasonryGrid({
  initialPhotos,
  onPhotoClick,
  skipInitialAnimation = false,
  isSearchMode = false,
  deletedIds = new Set(),
}: MasonryGridProps) {
  const [photos, setPhotos] = useState<PhotoCardProps[]>(initialPhotos);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [newPhotoIds, setNewPhotoIds] = useState<Set<string>>(new Set());

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
          const newPhotos: PhotoCardProps[] = data.filter(
            (photo: PhotoCardProps) => !existingIds.has(photo.id)
          );

          // 新しい写真がない場合はデータ終了
          if (newPhotos.length === 0) {
            setHasMore(false);
            return prev;
          }

          // 新しい写真のIDを記録
          const newIds = new Set(newPhotos.map((p: PhotoCardProps) => p.id));
          setNewPhotoIds(newIds);

          // 2秒後にアニメーションフラグをクリア（メモリリーク防止）
          setTimeout(() => {
            setNewPhotoIds(new Set());
          }, 2000);

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
    // 検索モード中は無限スクロールを無効化
    if (isSearchMode) return;

    if (
      window.innerHeight + document.documentElement.scrollTop >=
      document.documentElement.offsetHeight - 1000
    ) {
      loadMore();
    }
  }, [loadMore, isSearchMode]);

  // initialPhotosの変更を監視してstateを更新
  useEffect(() => {
    console.log(
      "🔄 [DEBUG] MasonryGrid initialPhotos変更検知:",
      new Date().toISOString(),
      "件数:",
      initialPhotos.length
    );
    if (initialPhotos.length > 0) {
      console.log("📸 [DEBUG] MasonryGrid 最新の投稿ID:", initialPhotos[0].id);
    }

    // 新しいinitialPhotosで既存のphotosを上書き
    // （無限スクロールで追加したデータは含まれないため、サーバーから取得した最新データを優先）
    setPhotos(initialPhotos);

    // 最初の投稿に新着アニメーションを適用（router.refresh後に追加された投稿）
    if (
      initialPhotos.length > 0 &&
      photos.length > 0 &&
      initialPhotos[0].id !== photos[0].id
    ) {
      console.log("✨ [DEBUG] 新しい投稿を検知、アニメーション適用");
      setNewPhotoIds(new Set([initialPhotos[0].id]));
      setTimeout(() => {
        setNewPhotoIds(new Set());
      }, 2000);
    }
  }, [initialPhotos]);

  // クライアントサイドマウント検出（ちらつき防止）
  useEffect(() => {
    setIsMounted(true);

    // skipInitialAnimationが有効な場合はアニメーションをスキップ
    if (skipInitialAnimation) {
      return;
    }

    // 初期レンダリング時に全ての写真にフェードインアニメーションを適用
    const initialIds = new Set(initialPhotos.map((p) => p.id));
    setNewPhotoIds(initialIds);

    // 2秒後にアニメーションフラグをクリア
    const timeoutId = setTimeout(() => {
      setNewPhotoIds(new Set());
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [skipInitialAnimation]);

  // スクロールイベントリスナー（デバウンス処理）
  // 検索モード中は無限スクロールを無効化
  useEffect(() => {
    if (isSearchMode) return;

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
  }, [handleScroll, isSearchMode]);

  // SSRハイドレーションミスマッチを防ぐため、マウント後に表示
  // skipInitialAnimationが有効な場合はこのチェックをスキップ
  if (!isMounted && !skipInitialAnimation) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="aspect-auto animate-pulse bg-gray-200"
          />
        ))}
      </div>
    );
  }

  // 削除されたIDを除外
  const displayedPhotos = photos.filter((photo) => !deletedIds.has(photo.id));

  return (
    <div>
      <Masonry
        breakpointCols={breakpointColumns}
        className="masonry-grid"
        columnClassName="masonry-grid_column"
      >
        {displayedPhotos.map((photo, index) => (
          <PhotoCard
            key={photo.id}
            {...photo}
            isNew={newPhotoIds.has(photo.id)}
            priority={index < 8}
            layoutIdDisabled={newPhotoIds.has(photo.id)}
            onClick={() => onPhotoClick?.(photo.id, photo)}
          />
        ))}
      </Masonry>

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
