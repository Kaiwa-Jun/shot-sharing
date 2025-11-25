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
import { Post, getPosts } from "@/app/actions/posts";
import { getSimilarPostsWithEmbedding } from "@/app/actions/similar-posts-embedding";
import { searchPosts } from "@/app/actions/search";
import { ChatMessage, ConversationMessage } from "@/lib/types/search";
import type { User } from "@supabase/supabase-js";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";

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
  const [similarPosts, setSimilarPosts] = useState<Post[]>([]);
  const [isSimilarPostsLoading, setIsSimilarPostsLoading] = useState(false);
  // スクロール位置を保存
  const [savedScrollPosition, setSavedScrollPosition] = useState<number>(0);

  // 投稿データ（Pull-to-Refreshで更新可能）
  const [photos, setPhotos] = useState<PhotoCardProps[]>(initialPhotos);

  // 検索状態
  const [isSearchMode, setIsSearchMode] = useState(false);

  // /me画面ではSearchFABを非表示
  const showSearchFAB = pathname === "/";
  // 最新の検索結果（後方互換性のため残す）
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

  // initialPhotosの変更を監視（router.refresh()で更新された場合など）
  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  // 投稿選択時の処理
  const handlePhotoClick = async (
    photoId: string,
    photoData: PhotoCardProps
  ) => {
    // 現在のスクロール位置を保存（最初の投稿を開く時のみ）
    if (!selectedPostId) {
      setSavedScrollPosition(window.scrollY);
    }

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

    // ローディング開始
    setIsSimilarPostsLoading(true);

    // バックグラウンドで詳細データ、保存状態、類似作例を取得
    try {
      console.log(`🔍 [DEBUG] 投稿詳細データを取得中: ${photoId}`);

      const [postResponse, saveResponse, similarPostsResult] =
        await Promise.all([
          fetch(`/api/posts/${photoId}`),
          fetch(`/api/saves/check?postId=${photoId}`),
          getSimilarPostsWithEmbedding(photoId, 10),
        ]);

      console.log(`📊 [DEBUG] 類似作例の取得結果:`, {
        count: similarPostsResult.data?.length || 0,
        error: similarPostsResult.error,
      });

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

      // 類似作例を設定
      if (similarPostsResult.data) {
        setSimilarPosts(similarPostsResult.data);
        console.log(
          `✅ [DEBUG] 類似作例を設定: ${similarPostsResult.data.length}件`
        );
      } else {
        setSimilarPosts([]);
        console.log(`⚠️ [DEBUG] 類似作例なし`);
      }
    } catch (error) {
      console.error("Error fetching post data:", error);
      setSimilarPosts([]);
    } finally {
      setIsSimilarPostsLoading(false); // ローディング終了
    }
  };

  // モーダルを閉じる処理
  const handleCloseModal = () => {
    setSelectedPostId(null);
    setSelectedPost(null);
    setSimilarPosts([]);

    // URLをホームに戻す（replaceStateで履歴を置き換え）
    window.history.replaceState(null, "", "/");

    // スクロール位置を復元
    window.scrollTo({
      top: savedScrollPosition,
      behavior: "instant", // 即座にスクロール
    });
  };

  // 類似作例クリック時の処理
  const handleSimilarPostClick = (postId: string) => {
    console.log(`🎯 [DEBUG] 類似作例クリック: ${postId}`);
    // 新しい投稿をモーダルで表示
    // handlePhotoClickを使ってモーダルを更新
    const clickedPost = similarPosts.find((p) => p.id === postId);
    if (clickedPost) {
      handlePhotoClick(postId, {
        id: clickedPost.id,
        imageUrl: clickedPost.imageUrl,
        userId: clickedPost.userId,
        exifData: clickedPost.exifData || undefined,
      });
    }
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
        isStreaming: true, // ストリーミング中フラグ
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

              // 最後のアシスタントメッセージを更新（ストリーミング中）
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
                    isStreaming: true, // ストリーミング中を維持
                  };
                }
                return newMessages;
              });
            } else if (data.type === "done") {
              // 完了メッセージを受信
              postIds = data.postIds;
              conversationId = data.conversationId;

              // ストリーミング完了フラグを設定
              setChatMessages((prev) => {
                const newMessages = [...prev];
                const lastIndex = newMessages.length - 1;
                if (
                  lastIndex >= 0 &&
                  newMessages[lastIndex].role === "assistant"
                ) {
                  newMessages[lastIndex] = {
                    ...newMessages[lastIndex],
                    isStreaming: false, // ストリーミング完了
                  };
                }
                return newMessages;
              });

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

          // 検索結果を最後のアシスタントメッセージに紐付け
          setChatMessages((prev) => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            if (lastIndex >= 0 && newMessages[lastIndex].role === "assistant") {
              newMessages[lastIndex] = {
                ...newMessages[lastIndex],
                searchResults: searchResultPhotos,
              };
            }
            return newMessages;
          });

          // 後方互換性のためsetSearchResultsも更新
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

  // Pull-to-Refreshのリロード処理
  const handleRefresh = async () => {
    try {
      // 最初の20件を取得
      const { data: posts, error } = await getPosts(20, 0);

      if (error || !posts) {
        throw new Error(error || "投稿の取得に失敗しました");
      }

      // PhotoCardProps形式に変換
      const newPhotos: PhotoCardProps[] = posts.map((post: Post) => ({
        id: post.id,
        imageUrl: post.imageUrl,
        userId: post.userId,
        exifData: post.exifData || undefined,
      }));

      // 投稿データを更新
      setPhotos(newPhotos);

      // 削除済みIDをクリア（リロード時にリセット）
      setDeletedIds(new Set());
    } catch (error) {
      console.error("Failed to refresh posts:", error);
      throw error; // エラーを再スローしてPullToRefreshコンポーネントに伝える
    }
  };

  // 表示する写真を決定（検索モードか通常モードか）
  const displayPhotos = isSearchMode ? searchResults : photos;

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <Header initialUser={initialUser} onResetSearch={handleCloseSearch} />

      {/* メインコンテンツ */}
      {/* 検索モード時は非表示（DOMには残す） */}
      <div className={isSearchMode ? "hidden" : ""}>
        <PullToRefresh
          onRefresh={handleRefresh}
          disabled={!!selectedPostId || isSearchMode}
          topOffset={56}
        >
          <main className="container mx-auto px-4 pb-24 pt-20 xl:pl-20">
            {photos.length > 0 ? (
              // 通常の投稿を表示
              <MasonryGrid
                key={photos.length} // リロード時にコンポーネントをリセット
                initialPhotos={photos}
                onPhotoClick={handlePhotoClick}
                isSearchMode={false}
                deletedIds={deletedIds}
              />
            ) : (
              // 投稿がない場合
              <div className="flex min-h-[50vh] items-center justify-center">
                <p className="text-muted-foreground">
                  投稿がありません。最初の投稿を作成してみましょう！
                </p>
              </div>
            )}
          </main>
        </PullToRefresh>
      </div>

      {/* チャット領域 */}
      <SearchChat
        messages={chatMessages}
        isExpanded={true}
        onClose={handleCloseSearch}
        searchResults={searchResults}
        onPhotoClick={handlePhotoClick}
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
            similarPosts={similarPosts}
            onSimilarPostClick={handleSimilarPostClick}
            isSimilarPostsLoading={isSimilarPostsLoading}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
