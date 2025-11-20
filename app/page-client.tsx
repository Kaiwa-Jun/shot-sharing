"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/header";
import { SearchFAB } from "@/components/layout/search-fab";
import { SearchChat } from "@/components/search/search-chat";
import { MasonryGrid } from "@/components/gallery/masonry-grid";
import { SearchLoadingSkeleton } from "@/components/gallery/search-loading-skeleton";
import { PostDetailModal } from "@/components/post-detail/post-detail-modal";
import { PhotoCardProps } from "@/components/gallery/photo-card";
import { Post } from "@/app/actions/posts";
import { searchPosts } from "@/app/actions/search";
import { ChatMessage, ConversationMessage } from "@/lib/types/search";
import type { User } from "@supabase/supabase-js";

interface PageClientProps {
  initialPhotos: PhotoCardProps[];
  initialUser: User | null;
}

export function PageClient({ initialPhotos, initialUser }: PageClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [initialIsSaved, setInitialIsSaved] = useState(false);
  const [initialIsOwner, setInitialIsOwner] = useState(false);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // 検索状態
  const [isSearchMode, setIsSearchMode] = useState(false);

  // /me画面ではSearchFABを非表示
  const showSearchFAB = pathname === "/";
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

    // PhotoCardのuserIdを使って初期所有者判定を行う
    const initialOwner = photoData.userId
      ? initialUser?.id === photoData.userId
      : false;
    setInitialIsOwner(initialOwner);

    // 保存状態をリセット（前の投稿の状態が残らないように）
    setInitialIsSaved(false);

    // 初期表示用に既存のPhotoCardデータから仮のPostデータを作成
    const tempPost: Post = {
      id: photoData.id,
      userId: photoData.userId || "",
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
        // 所有者判定
        const isOwner = initialUser
          ? initialUser.id === postData.data.userId
          : false;
        setInitialIsOwner(isOwner);
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

  // 削除成功時の処理
  const handleDeleteSuccess = () => {
    if (selectedPostId) {
      setDeletedIds((prev) => new Set(prev).add(selectedPostId));
    }

    // モーダルを閉じる
    setSelectedPostId(null);
    setSelectedPost(null);

    // URLをルートに戻す（Next.jsのRouter Stateを確実に更新するため replace を使用）
    router.replace("/");

    // サーバー側のデータを更新（バックグラウンドで実行）
    // 少し遅延させて、URLの更新が完了してからリフレッシュする
    // router.refresh() は非同期で実行され、完了するとinitialPhotosが更新される
    // MasonryGridはinitialPhotosの更新を検知して再レンダリングされるが、
    // deletedIdsによるフィルタリングは即座に適用されるため、ユーザー体験はスムーズになる
    setTimeout(() => {
      router.refresh();
    }, 100);
  };

  // 検索処理（ストリーミング対応）
  const handleSearch = async (query: string) => {
    try {
      setIsSearching(true);
      setIsSearchMode(true); // 検索モードを開始
      console.log("🔍 [DEBUG] 検索開始:", query);

      // ユーザーのメッセージを追加
      const userMessage: ChatMessage = {
        role: "user",
        content: query,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, userMessage]);

      // 空のアシスタントメッセージを追加（ストリーミング用）
      const initialAssistantMessage: ChatMessage = {
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, initialAssistantMessage]);

      // ストリーミングリクエストを送信
      const response = await fetch("/api/search/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error("検索APIへのリクエストに失敗しました");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("レスポンスの読み取りに失敗しました");
      }

      let accumulatedText = "";
      let postIds: string[] = [];
      let conversationId = "";

      // ストリーミングレスポンスを処理
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));

            if (data.type === "text") {
              // テキストチャンクを受信
              accumulatedText += data.content;

              // 最後のアシスタントメッセージを更新
              setChatMessages((prev) => {
                const newMessages = [...prev];
                const lastIndex = newMessages.length - 1;
                if (
                  lastIndex >= 0 &&
                  newMessages[lastIndex].role === "assistant"
                ) {
                  newMessages[lastIndex] = {
                    ...newMessages[lastIndex],
                    content: accumulatedText,
                  };
                }
                return newMessages;
              });
            } else if (data.type === "done") {
              // 完了メッセージを受信
              postIds = data.postIds;
              conversationId = data.conversationId;

              console.log("✅ [DEBUG] ストリーミング完了:", {
                postIds: postIds.length,
                textLength: accumulatedText.length,
              });
            } else if (data.type === "error") {
              throw new Error(data.message);
            }
          }
        }
      }

      // 会話履歴を更新
      setConversationHistory((prev) => [
        ...prev,
        { role: "user", parts: query },
        { role: "model", parts: accumulatedText },
      ]);

      // 検索結果を取得して表示
      if (postIds.length > 0) {
        const postsResponse = await fetch("/api/posts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            limit: 100,
            offset: 0,
          }),
        });

        const { data: allPosts } = await postsResponse.json();

        if (allPosts) {
          // post_idでフィルタリング
          const filteredPosts = allPosts.filter((post: Post) =>
            postIds.includes(post.id)
          );

          const searchResultPhotos: PhotoCardProps[] = filteredPosts.map(
            (post: Post) => ({
              id: post.id,
              imageUrl: post.imageUrl,
              userId: post.userId,
              exifData: post.exifData || undefined,
            })
          );

          setSearchResults(searchResultPhotos);
        }
      }
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

  // 検索を閉じる処理
  const handleCloseSearch = () => {
    setIsSearchMode(false);
    setSearchResults([]);
    setChatMessages([]);
    setConversationHistory([]);
  };

  // 表示する写真を決定（検索モードか通常モードか）
  const displayPhotos = isSearchMode ? searchResults : initialPhotos;

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <Header initialUser={initialUser} />

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 pb-24 pt-20">
        {isSearching && isSearchMode ? (
          // 検索中: ローディングスケルトンを表示
          <SearchLoadingSkeleton />
        ) : displayPhotos.length > 0 ? (
          // 検索結果または通常の投稿を表示
          <MasonryGrid
            initialPhotos={displayPhotos}
            onPhotoClick={handlePhotoClick}
            isSearchMode={isSearchMode}
            deletedIds={deletedIds}
          />
        ) : (
          // 投稿がない場合
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
      <SearchChat
        messages={chatMessages}
        isExpanded={true}
        onClose={handleCloseSearch}
      />

      {/* フローティングアクションボタン */}
      {showSearchFAB && (
        <SearchFAB
          onSearch={handleSearch}
          isLoading={isSearching}
          showExamples={chatMessages.length === 0}
          isSearchMode={isSearchMode}
        />
      )}

      {/* 詳細モーダル */}
      <AnimatePresence mode="sync">
        {selectedPostId && selectedPost && (
          <PostDetailModal
            key={selectedPostId}
            post={selectedPost}
            initialIsSaved={initialIsSaved}
            initialIsOwner={initialIsOwner}
            onClose={handleCloseModal}
            onDeleteSuccess={handleDeleteSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
