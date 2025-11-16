"use client";

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/header";
import { SearchFAB } from "@/components/layout/search-fab";
import { SearchChat } from "@/components/search/search-chat";
import { MasonryGrid } from "@/components/gallery/masonry-grid";
import { PostDetailModal } from "@/components/post-detail/post-detail-modal";
import { PhotoCardProps } from "@/components/gallery/photo-card";
import { Post } from "@/app/actions/posts";
import { searchPosts } from "@/app/actions/search";
import { ChatMessage, ConversationMessage } from "@/lib/types/search";

interface PageClientProps {
  initialPhotos: PhotoCardProps[];
}

export function PageClient({ initialPhotos }: PageClientProps) {
  console.log(
    "🎨 [DEBUG] PageClient レンダリング:",
    new Date().toISOString(),
    "photos:",
    initialPhotos.length
  );

  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [initialIsSaved, setInitialIsSaved] = useState(false);

  // 検索状態
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchResults, setSearchResults] = useState<PhotoCardProps[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [conversationHistory, setConversationHistory] = useState<
    ConversationMessage[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);

  // ブラウザバック時にモーダルを閉じる
  useEffect(() => {
    const handlePopState = () => {
      setSelectedPostId(null);
      setSelectedPost(null);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // initialPhotosの変更を監視
  useEffect(() => {
    console.log(
      "🔄 [DEBUG] initialPhotos更新検知:",
      new Date().toISOString(),
      "件数:",
      initialPhotos.length
    );
    if (initialPhotos.length > 0) {
      console.log("📸 [DEBUG] 最新の投稿ID:", initialPhotos[0].id);
    }
  }, [initialPhotos]);

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

  // 検索処理
  const handleSearch = async (query: string) => {
    try {
      setIsSearching(true);
      console.log("🔍 [DEBUG] 検索開始:", query);

      // ユーザーのメッセージを追加
      const userMessage: ChatMessage = {
        role: "user",
        content: query,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, userMessage]);

      // 検索実行
      const response = await searchPosts(query, conversationHistory);

      console.log("✅ [DEBUG] 検索完了:", response);

      // AIの回答を追加
      const aiMessage: ChatMessage = {
        role: "assistant",
        content: response.aiResponse,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, aiMessage]);

      // 会話履歴を更新
      setConversationHistory((prev) => [
        ...prev,
        { role: "user", parts: query },
        { role: "model", parts: response.aiResponse },
      ]);

      // 検索結果を表示用に変換
      const searchResultPhotos: PhotoCardProps[] = response.posts.map(
        (post) => ({
          id: post.id,
          imageUrl: post.imageUrl,
          exifData: post.exifData || undefined,
        })
      );

      setSearchResults(searchResultPhotos);
      setIsSearchMode(true);
    } catch (error) {
      console.error("❌ 検索エラー:", error);

      // エラーメッセージを表示
      const errorMessage: ChatMessage = {
        role: "assistant",
        content:
          "申し訳ございません。検索中にエラーが発生しました。もう一度お試しください。",
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSearching(false);
    }
  };

  // 表示する写真を決定（検索モードか通常モードか）
  const displayPhotos = isSearchMode ? searchResults : initialPhotos;

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <Header />

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 pb-24 pt-20">
        {displayPhotos.length > 0 ? (
          <MasonryGrid
            initialPhotos={displayPhotos}
            onPhotoClick={handlePhotoClick}
          />
        ) : (
          <div className="flex min-h-[50vh] items-center justify-center">
            <p className="text-muted-foreground">
              {isSearchMode
                ? "検索結果が見つかりませんでした。"
                : "投稿がありません。最初の投稿を作成してみましょう！"}
            </p>
          </div>
        )}
      </main>

      {/* チャット領域 */}
      <SearchChat messages={chatMessages} isExpanded={false} />

      {/* フローティングアクションボタン */}
      <SearchFAB
        onSearch={handleSearch}
        isLoading={isSearching}
        showExamples={chatMessages.length === 0}
      />

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
