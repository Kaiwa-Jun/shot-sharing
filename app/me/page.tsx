import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "マイページ",
  description: "あなたの投稿と保存した作例を管理できます",
  robots: {
    index: false,
    follow: false,
  },
};

// プロフィールデータ取得関数
async function getProfileData(userId: string) {
  const [
    profile,
    postsResult,
    savedPostsResult,
    postsCountResult,
    savedCountResult,
  ] = await Promise.all([
    getCurrentUserProfile(),
    getUserPosts(userId, 10, 0),
    getUserSavedPosts(userId, 10, 0),
    getUserPostsCount(userId),
    getUserSavedPostsCount(userId),
  ]);

  return {
    profile: profile.profile,
    userPhotos: postsResult.data || [],
    savedPhotos: savedPostsResult.data || [],
    postsCount: postsCountResult.data || 0,
    savedCount: savedCountResult.data || 0,
  };
}

export default async function ProfilePage() {
  // サーバー側で認証状態を確認
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未認証の場合はログイン画面へリダイレクト
  if (!user) {
    redirect("/login");
  }

  // プロフィールデータを取得
  const {
    profile,
    userPhotos: posts,
    savedPhotos: saves,
    postsCount,
    savedCount,
  } = await getProfileData(user.id);

  // Postデータ型をPhotoCardProps型に変換
  const userPhotos: PhotoCardProps[] = posts.map((post) => ({
    id: post.id,
    imageUrl: post.imageUrl,
    userId: post.userId,
    exifData: post.exifData || undefined,
  }));

  const savedPhotos: PhotoCardProps[] = saves.map((post) => ({
    id: post.id,
    imageUrl: post.imageUrl,
    userId: post.userId,
    exifData: post.exifData || undefined,
  }));

  return (
    <ProfileClient
      key="profile"
      profile={profile}
      initialUserPhotos={userPhotos}
      initialSavedPhotos={savedPhotos}
      postsCount={postsCount}
      savedCount={savedCount}
      userId={user.id}
    />
  );
}
