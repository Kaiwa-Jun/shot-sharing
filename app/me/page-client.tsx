"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, PanInfo, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Settings,
  User,
  UserPen,
  HelpCircle,
  FileText,
  Shield,
  LogOut,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PhotoCardProps } from "@/components/gallery/photo-card";
import { Post } from "@/app/actions/posts";
import Masonry from "react-masonry-css";
import Image from "next/image";
import { PostDetailModal } from "@/components/post-detail/post-detail-modal";
import { createClient } from "@/lib/supabase/client";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { ContentView } from "@/app/@modal/(.)me/content-view";

interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ProfileClientProps {
  profile: Profile | null;
  initialUserPhotos: PhotoCardProps[];
  initialSavedPhotos: PhotoCardProps[];
  postsCount: number;
  savedCount: number;
  userId: string;
}

export function ProfileClient({
  profile,
  initialUserPhotos,
  initialSavedPhotos,
  postsCount,
  savedCount,
  userId,
}: ProfileClientProps) {
  const router = useRouter();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [initialIsSaved, setInitialIsSaved] = useState(false);
  const [initialIsOwner, setInitialIsOwner] = useState(false);

  // ビュー状態 ('profile' | 'terms' | 'privacy')
  const [view, setView] = useState<"profile" | "terms" | "privacy">("profile");
  const [isExiting, setIsExiting] = useState(false);

  // 投稿タブの状態
  const [userPhotos, setUserPhotos] =
    useState<PhotoCardProps[]>(initialUserPhotos);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(
    initialUserPhotos.length < postsCount
  );

  // 保存タブの状態
  const [savedPhotos, setSavedPhotos] =
    useState<PhotoCardProps[]>(initialSavedPhotos);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [hasMoreSaved, setHasMoreSaved] = useState(
    initialSavedPhotos.length < savedCount
  );

  // 現在のタブ
  const [activeTab, setActiveTab] = useState("posts");

  // 投稿の追加読み込み
  const loadMorePosts = useCallback(async () => {
    if (isLoadingPosts || !hasMorePosts) return;

    setIsLoadingPosts(true);
    try {
      const response = await fetch("/api/users/me/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 10, offset: userPhotos.length }),
      });

      if (response.ok) {
        const { data } = await response.json();
        if (data && data.length > 0) {
          setUserPhotos((prev) => [...prev, ...data]);
          if (data.length < 10) setHasMorePosts(false);
        } else {
          setHasMorePosts(false);
        }
      }
    } catch (error) {
      console.error("Error loading more posts:", error);
    } finally {
      setIsLoadingPosts(false);
    }
  }, [userPhotos.length, isLoadingPosts, hasMorePosts]);

  // 保存の追加読み込み
  const loadMoreSaved = useCallback(async () => {
    if (isLoadingSaved || !hasMoreSaved) return;

    setIsLoadingSaved(true);
    try {
      const response = await fetch("/api/users/me/saves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 10, offset: savedPhotos.length }),
      });

      if (response.ok) {
        const { data } = await response.json();
        if (data && data.length > 0) {
          setSavedPhotos((prev) => [...prev, ...data]);
          if (data.length < 10) setHasMoreSaved(false);
        } else {
          setHasMoreSaved(false);
        }
      }
    } catch (error) {
      console.error("Error loading more saved:", error);
    } finally {
      setIsLoadingSaved(false);
    }
  }, [savedPhotos.length, isLoadingSaved, hasMoreSaved]);

  // スクロール検出
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 500
      ) {
        if (activeTab === "posts") {
          loadMorePosts();
        } else {
          loadMoreSaved();
        }
      }
    };

    let timeoutId: NodeJS.Timeout;
    const debouncedScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 100);
    };

    window.addEventListener("scroll", debouncedScroll);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("scroll", debouncedScroll);
    };
  }, [loadMorePosts, loadMoreSaved, activeTab]);

  // 戻るボタンのハンドラー
  const handleBack = () => {
    router.push("/");
  };

  // プロフィール編集のハンドラー
  const handleEditProfile = () => {
    router.push("/me/edit");
  };

  // ログアウトのハンドラー
  const handleLogout = async () => {
    console.log("🔴 ログアウト処理開始");
    console.log("🔴 現在のURL:", window.location.href);

    const supabase = createClient();
    console.log("🔴 Supabaseクライアント作成完了");

    const result = await supabase.auth.signOut();
    console.log("🔴 サインアウト完了:", result);

    console.log("🔴 /へリダイレクト開始");
    window.location.href = "/";
    console.log("🔴 リダイレクト実行後（このログは表示されないはず）");
  };

  // 写真クリックのハンドラー
  const handlePhotoClick = async (photo: PhotoCardProps) => {
    // 即座にモーダルを表示（楽観的UI更新）
    setSelectedPostId(photo.id);

    // PhotoCardのuserIdを使って初期所有者判定を行う
    const initialOwner = photo.userId ? userId === photo.userId : false;
    setInitialIsOwner(initialOwner);

    // 保存状態をリセット
    setInitialIsSaved(false);

    // 初期表示用に既存のPhotoCardデータから仮のPostデータを作成
    const tempPost: Post = {
      id: photo.id,
      userId: photo.userId || "",
      imageUrl: photo.imageUrl,
      thumbnailUrl: photo.imageUrl,
      description: null,
      exifData: photo.exifData || null,
      fileSearchStoreId: null,
      visibility: "public",
      width: null,
      height: null,
      createdAt: null,
      updatedAt: null,
    };
    setSelectedPost(tempPost);

    // /me画面ではURLを変更しない（履歴の複雑化を防ぐ）

    // バックグラウンドで詳細データと保存状態を取得
    try {
      const [postResponse, saveResponse] = await Promise.all([
        fetch(`/api/posts/${photo.id}`),
        fetch(`/api/saves/check?postId=${photo.id}`),
      ]);

      if (postResponse.ok) {
        const postData = await postResponse.json();
        setSelectedPost(postData.data);
        // 所有者判定
        const isOwner = userId === postData.data.userId;
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

  // モーダルを閉じるハンドラー
  const handleCloseModal = () => {
    setSelectedPostId(null);
    setSelectedPost(null);
    // URLは変更していないので戻す必要なし
  };

  // 削除成功時のハンドラー
  const handleDeleteSuccess = () => {
    if (selectedPostId) {
      // 投稿一覧から削除
      setUserPhotos((prev) => prev.filter((p) => p.id !== selectedPostId));
      // 保存一覧からも削除（自分の投稿を保存していた場合）
      setSavedPhotos((prev) => prev.filter((p) => p.id !== selectedPostId));
    }
    handleCloseModal();
    router.refresh();
  };

  // Pull-to-Refreshのリロード処理
  const handleRefresh = async () => {
    try {
      if (activeTab === "posts") {
        // 投稿タブのリロード
        const response = await fetch("/api/users/me/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 10, offset: 0 }),
        });

        if (response.ok) {
          const { data } = await response.json();
          setUserPhotos(data || []);
          setHasMorePosts((data?.length || 0) >= 10);
        }
      } else {
        // 保存タブのリロード
        const response = await fetch("/api/users/me/saves", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 10, offset: 0 }),
        });

        if (response.ok) {
          const { data } = await response.json();
          setSavedPhotos(data || []);
          setHasMoreSaved((data?.length || 0) >= 10);
        }
      }
    } catch (error) {
      console.error("Failed to refresh:", error);
      throw error; // エラーを再スローしてPullToRefreshコンポーネントに伝える
    }
  };

  // スワイプ終了時のハンドラー
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    // モーダルが開いているときはスワイプ処理をスキップ
    if (selectedPostId) return;

    // プロフィールビュー以外ではスワイプで閉じない
    if (view !== "profile") return;

    if (info.offset.x < -100) {
      // 右から左へのスワイプでホームに戻る
      router.push("/");
    }
  };

  // Masonry のブレークポイント（2列）
  const breakpointColumns = {
    default: 2,
    640: 2,
  };

  // プロフィールビュー
  return (
    <>
      <motion.div
        initial={false}
        animate={{ opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "tween", duration: 0.3 }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        className="min-h-screen bg-background"
      >
        <div className="xl:mx-auto xl:max-w-4xl">
          {/* ヘッダー */}
          <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center px-4">
              <button
                onClick={handleBack}
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="flex-1 text-center font-semibold">プロフィール</h1>
              <div className="w-10" />
            </div>
          </header>

          {/* プロフィール情報 */}
          <div className="relative border-b px-4 py-6">
            {/* 設定メニュー */}
            <div className="absolute right-4 top-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent">
                    <Settings className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEditProfile}>
                    <UserPen className="mr-2 h-4 w-4" />
                    プロフィール編集
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    ヘルプ/お問い合わせ
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setView("terms")}>
                    <FileText className="mr-2 h-4 w-4" />
                    利用規約
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setView("privacy")}>
                    <Shield className="mr-2 h-4 w-4" />
                    プライバシーポリシー
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      console.log(
                        "🔴 ログアウトメニューがクリックされました",
                        e
                      );
                      handleLogout();
                    }}
                    className="text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    ログアウト
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-4">
              {/* アバター */}
              <div className="h-16 w-16 overflow-hidden rounded-full bg-muted">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt="Avatar"
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* ユーザー情報 */}
              <div className="flex-1">
                <h2 className="text-lg font-semibold">
                  {profile?.display_name || "名前未設定"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {profile?.email}
                </p>
              </div>
            </div>

            {/* 自己紹介 */}
            {profile?.bio && (
              <p className="mt-4 text-sm text-foreground">{profile.bio}</p>
            )}
          </div>

          {/* タブ */}
          <PullToRefresh
            onRefresh={handleRefresh}
            disabled={!!selectedPostId}
            topOffset={56}
          >
            <Tabs
              defaultValue="posts"
              className="w-full"
              onValueChange={setActiveTab}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="posts">投稿（{postsCount}）</TabsTrigger>
                <TabsTrigger value="saved">保存（{savedCount}）</TabsTrigger>
              </TabsList>

              {/* 投稿タブ */}
              <TabsContent value="posts" className="p-4" asChild>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  {userPhotos.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      まだ投稿がありません
                    </div>
                  ) : (
                    <>
                      <Masonry
                        breakpointCols={breakpointColumns}
                        className="flex w-full gap-2"
                        columnClassName="flex flex-col gap-2"
                      >
                        {userPhotos.map((photo) => (
                          <div
                            key={photo.id}
                            className="cursor-pointer overflow-hidden rounded-lg"
                            onClick={() => handlePhotoClick(photo)}
                          >
                            <motion.div
                              layoutId={`photo-${photo.id}`}
                              transition={{
                                duration: 0.55,
                                ease: [0.25, 0.1, 0.25, 1],
                              }}
                            >
                              <Image
                                src={photo.imageUrl}
                                alt=""
                                width={300}
                                height={400}
                                className="w-full object-cover"
                                unoptimized
                              />
                            </motion.div>
                          </div>
                        ))}
                      </Masonry>
                      {isLoadingPosts && (
                        <div className="flex justify-center py-4">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      )}
                      {!hasMorePosts && userPhotos.length > 0 && (
                        <div className="py-4 text-center text-sm text-muted-foreground">
                          すべての投稿を表示しました
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              </TabsContent>

              {/* 保存タブ */}
              <TabsContent value="saved" className="p-4" asChild>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  {savedPhotos.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      保存した投稿がありません
                    </div>
                  ) : (
                    <>
                      <Masonry
                        breakpointCols={breakpointColumns}
                        className="flex w-full gap-2"
                        columnClassName="flex flex-col gap-2"
                      >
                        {savedPhotos.map((photo) => (
                          <div
                            key={photo.id}
                            className="cursor-pointer overflow-hidden rounded-lg"
                            onClick={() => handlePhotoClick(photo)}
                          >
                            <motion.div
                              layoutId={`photo-${photo.id}`}
                              transition={{
                                duration: 0.55,
                                ease: [0.25, 0.1, 0.25, 1],
                              }}
                            >
                              <Image
                                src={photo.imageUrl}
                                alt=""
                                width={300}
                                height={400}
                                className="w-full object-cover"
                                unoptimized
                              />
                            </motion.div>
                          </div>
                        ))}
                      </Masonry>
                      {isLoadingSaved && (
                        <div className="flex justify-center py-4">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      )}
                      {!hasMoreSaved && savedPhotos.length > 0 && (
                        <div className="py-4 text-center text-sm text-muted-foreground">
                          すべての保存を表示しました
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              </TabsContent>
            </Tabs>
          </PullToRefresh>
        </div>

        {/* 投稿詳細モーダル */}
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
      </motion.div>

      {/* 利用規約・プライバシーポリシーのオーバーレイ */}
      <AnimatePresence
        mode="wait"
        onExitComplete={() => {
          if (isExiting) {
            setView("profile");
            setIsExiting(false);
          }
        }}
      >
        {(view === "terms" || view === "privacy") && !isExiting && (
          <div className="fixed inset-0 z-50">
            <ContentView
              key={view}
              type={view}
              onBack={() => setIsExiting(true)}
            />
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
