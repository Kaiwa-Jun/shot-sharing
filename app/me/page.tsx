import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/app/actions/profiles";
import {
  getUserPosts,
  getUserSavedPosts,
  getUserPostsCount,
  getUserSavedPostsCount,
} from "@/app/actions/posts";
import { PhotoCardProps } from "@/components/gallery/photo-card";
import { ProfileClient } from "./page-client";

// 動的レンダリングを強制
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  console.log(
    "📱 [DEBUG] ProfilePage レンダリング開始:",
    new Date().toISOString()
  );

  // サーバー側で認証状態を確認
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未認証の場合はログイン画面へリダイレクト
  if (!user) {
    console.log("📱 [DEBUG] 未認証 - ログイン画面へリダイレクト");
    redirect("/login");
  }

  console.log("📱 [DEBUG] ユーザー認証OK:", user.id);

  // プロフィール情報を取得
  const { profile, error: profileError } = await getCurrentUserProfile();

  if (profileError || !profile) {
    console.error("❌ [DEBUG] Failed to fetch profile:", profileError);
  } else {
    console.log("📱 [DEBUG] プロフィール取得OK");
  }

  // ユーザーの投稿と保存した投稿を並行取得
  console.log("📱 [DEBUG] データ取得開始:", new Date().toISOString());
  const [postsResult, savedPostsResult, postsCountResult, savedCountResult] =
    await Promise.all([
      getUserPosts(user.id, 20, 0),
      getUserSavedPosts(user.id, 20, 0),
      getUserPostsCount(user.id),
      getUserSavedPostsCount(user.id),
    ]);
  console.log("📱 [DEBUG] データ取得完了:", new Date().toISOString());

  // エラーハンドリング
  if (postsResult.error) {
    console.error("Failed to fetch user posts:", postsResult.error);
  }
  if (savedPostsResult.error) {
    console.error("Failed to fetch saved posts:", savedPostsResult.error);
  }

  // Postデータ型をPhotoCardProps型に変換
  const userPhotos: PhotoCardProps[] =
    postsResult.data?.map((post) => ({
      id: post.id,
      imageUrl: post.imageUrl,
      exifData: post.exifData || undefined,
    })) || [];

  const savedPhotos: PhotoCardProps[] =
    savedPostsResult.data?.map((post) => ({
      id: post.id,
      imageUrl: post.imageUrl,
      exifData: post.exifData || undefined,
    })) || [];

  return (
    <ProfileClient
      profile={profile}
      initialUserPhotos={userPhotos}
      initialSavedPhotos={savedPhotos}
      postsCount={postsCountResult.data || 0}
      savedCount={savedCountResult.data || 0}
      userId={user.id}
    />
  );
}
