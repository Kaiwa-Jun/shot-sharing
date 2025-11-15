"use client";

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/header";
import { SearchFAB } from "@/components/layout/search-fab";
import { MasonryGrid } from "@/components/gallery/masonry-grid";
import { PostDetailModal } from "@/components/post-detail/post-detail-modal";
import { PhotoCardProps } from "@/components/gallery/photo-card";
import { Post } from "@/app/actions/posts";

interface PageClientProps {
  initialPhotos: PhotoCardProps[];
}

export function PageClient({ initialPhotos }: PageClientProps) {
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [initialIsSaved, setInitialIsSaved] = useState(false);

  // ブラウザバック時にモーダルを閉じる
  useEffect(() => {
    const handlePopState = () => {
      setSelectedPostId(null);
      setSelectedPost(null);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // 投稿選択時の処理
  const handlePhotoClick = async (
    photoId: string,
    photoData: PhotoCardProps
  ) => {
    // 即座にモーダルを表示（楽観的UI更新）
    setSelectedPostId(photoId);
    // 保存状態をリセット（前の投稿の状態が残らないように）
    setInitialIsSaved(false);

    // 初期表示用に既存のPhotoCardデータから仮のPostデータを作成
    const tempPost: Post = {
      id: photoData.id,
      userId: "",
      imageUrl: photoData.imageUrl,
      thumbnailUrl: photoData.imageUrl,
      description: null,
      exifData: photoData.exifData || null,
      fileSearchStoreId: null,
      visibility: "public",
      width: null,
      height: null,
      createdAt: null,
      updatedAt: null,
    };
    setSelectedPost(tempPost);

    // URLを更新（History APIを使用してページ遷移なし）
    window.history.pushState(null, "", `/posts/${photoId}`);

    // バックグラウンドで詳細データと保存状態を取得
    try {
      const [postResponse, saveResponse] = await Promise.all([
        fetch(`/api/posts/${photoId}`),
        fetch(`/api/saves/check?postId=${photoId}`),
      ]);

      if (postResponse.ok) {
        const postData = await postResponse.json();
        setSelectedPost(postData.data);
      }

      if (saveResponse.ok) {
        const saveData = await saveResponse.json();
        setInitialIsSaved(saveData.saved);
      }
    } catch (error) {
      console.error("Error fetching post data:", error);
    }
  };

  // モーダルを閉じる処理
  const handleCloseModal = () => {
    setSelectedPostId(null);
    setSelectedPost(null);
    // URLを元に戻す
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <Header />

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 pb-24 pt-20">
        {initialPhotos.length > 0 ? (
          <MasonryGrid
            initialPhotos={initialPhotos}
            onPhotoClick={handlePhotoClick}
          />
        ) : (
          <div className="flex min-h-[50vh] items-center justify-center">
            <p className="text-muted-foreground">
              投稿がありません。最初の投稿を作成してみましょう！
            </p>
          </div>
        )}
      </main>

      {/* フローティングアクションボタン */}
      <SearchFAB />

      {/* 詳細モーダル */}
      <AnimatePresence mode="sync">
        {selectedPostId && selectedPost && (
          <PostDetailModal
            key={selectedPostId}
            post={selectedPost}
            initialIsSaved={initialIsSaved}
            onClose={handleCloseModal}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
