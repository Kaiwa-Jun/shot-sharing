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
import { ProfileModal } from "./profile-modal";

export default async function InterceptedProfilePage() {
  // サーバー側で認証状態を確認
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未認証の場合はログイン画面へリダイレクト
  if (!user) {
    redirect("/login");
  }

  // プロフィール情報を取得
  const { profile } = await getCurrentUserProfile();

  // ユーザーの投稿と保存した投稿を並行取得（初期表示10枚）
  const [postsResult, savedPostsResult, postsCountResult, savedCountResult] =
    await Promise.all([
      getUserPosts(user.id, 10, 0),
      getUserSavedPosts(user.id, 10, 0),
      getUserPostsCount(user.id),
      getUserSavedPostsCount(user.id),
    ]);

  // Postデータ型をPhotoCardProps型に変換
  const userPhotos: PhotoCardProps[] =
    postsResult.data?.map((post) => ({
      id: post.id,
      imageUrl: post.imageUrl,
      userId: post.userId,
      exifData: post.exifData || undefined,
    })) || [];

  const savedPhotos: PhotoCardProps[] =
    savedPostsResult.data?.map((post) => ({
      id: post.id,
      imageUrl: post.imageUrl,
      userId: post.userId,
      exifData: post.exifData || undefined,
    })) || [];

  return (
    <ProfileModal
      profile={profile}
      initialUserPhotos={userPhotos}
      initialSavedPhotos={savedPhotos}
      postsCount={postsCountResult.data || 0}
      savedCount={savedCountResult.data || 0}
      userId={user.id}
    />
  );
}
