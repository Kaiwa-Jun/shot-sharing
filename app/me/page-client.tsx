"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, PanInfo, AnimatePresence } from "framer-motion";
import { ArrowLeft, LogOut, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PhotoCardProps } from "@/components/gallery/photo-card";
import { Post } from "@/app/actions/posts";
import Masonry from "react-masonry-css";
import Image from "next/image";
import { PostDetailModal } from "@/components/post-detail/post-detail-modal";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

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

  // デバッグログ
  console.log("📱 [DEBUG] ProfileClient レンダリング");
  console.log("📱 [DEBUG] profile:", profile);
  console.log("📱 [DEBUG] initialUserPhotos:", initialUserPhotos?.length, "件");
  console.log(
    "📱 [DEBUG] initialSavedPhotos:",
    initialSavedPhotos?.length,
    "件"
  );
  console.log("📱 [DEBUG] postsCount:", postsCount);
  console.log("📱 [DEBUG] savedCount:", savedCount);
  console.log("📱 [DEBUG] userId:", userId);

  // 戻るボタンのハンドラー
  const handleBack = () => {
    router.push("/");
  };

  // ログアウトのハンドラー
  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  // 写真クリックのハンドラー
  const handlePhotoClick = async (photo: PhotoCardProps) => {
    // 即座にモーダルを表示（楽観的UI更新）
    setSelectedPostId(photo.id);
    // 保存状態をリセット
    setInitialIsSaved(false);

    // 初期表示用に既存のPhotoCardデータから仮のPostデータを作成
    const tempPost: Post = {
      id: photo.id,
      userId: "",
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

    // URLを更新
    window.history.pushState(null, "", `/posts/${photo.id}`);

    // バックグラウンドで詳細データと保存状態を取得
    try {
      const [postResponse, saveResponse] = await Promise.all([
        fetch(`/api/posts/${photo.id}`),
        fetch(`/api/saves/check?postId=${photo.id}`),
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

  // モーダルを閉じるハンドラー
  const handleCloseModal = () => {
    setSelectedPostId(null);
    setSelectedPost(null);
    window.history.pushState(null, "", "/me");
  };

  // スワイプ終了時のハンドラー
  const handleDragEnd = (_: unknown, info: PanInfo) => {
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

  return (
    <motion.div
      initial={{ x: "-100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "tween", duration: 0.3 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      className="min-h-screen bg-background"
    >
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
          <div className="w-10" /> {/* バランス用のスペーサー */}
        </div>
      </header>

      {/* プロフィール情報 */}
      <div className="border-b px-4 py-6">
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
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
          </div>
        </div>

        {/* 自己紹介 */}
        {profile?.bio && (
          <p className="mt-4 text-sm text-foreground">{profile.bio}</p>
        )}

        {/* ログアウトボタン */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="mt-4 w-full"
        >
          <LogOut className="mr-2 h-4 w-4" />
          ログアウト
        </Button>
      </div>

      {/* タブ */}
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="posts">投稿（{postsCount}）</TabsTrigger>
          <TabsTrigger value="saved">保存（{savedCount}）</TabsTrigger>
        </TabsList>

        {/* 投稿タブ */}
        <TabsContent value="posts" className="p-4">
          {initialUserPhotos.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              まだ投稿がありません
            </div>
          ) : (
            <Masonry
              breakpointCols={breakpointColumns}
              className="flex w-full gap-2"
              columnClassName="flex flex-col gap-2"
            >
              {initialUserPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="cursor-pointer overflow-hidden rounded-lg"
                  onClick={() => handlePhotoClick(photo)}
                >
                  <Image
                    src={photo.imageUrl}
                    alt=""
                    width={300}
                    height={400}
                    className="w-full object-cover"
                  />
                </div>
              ))}
            </Masonry>
          )}
        </TabsContent>

        {/* 保存タブ */}
        <TabsContent value="saved" className="p-4">
          {initialSavedPhotos.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              保存した投稿がありません
            </div>
          ) : (
            <Masonry
              breakpointCols={breakpointColumns}
              className="flex w-full gap-2"
              columnClassName="flex flex-col gap-2"
            >
              {initialSavedPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="cursor-pointer overflow-hidden rounded-lg"
                  onClick={() => handlePhotoClick(photo)}
                >
                  <Image
                    src={photo.imageUrl}
                    alt=""
                    width={300}
                    height={400}
                    className="w-full object-cover"
                  />
                </div>
              ))}
            </Masonry>
          )}
        </TabsContent>
      </Tabs>

      {/* 投稿詳細モーダル */}
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
    </motion.div>
  );
}
