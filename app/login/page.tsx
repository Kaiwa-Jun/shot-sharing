import type { Metadata } from "next";
import { getPosts } from "@/app/actions/posts";
import { PhotoCardProps } from "@/components/gallery/photo-card";
import { LoginPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "ログイン",
  description: "Shot Sharingにログインして、写真作例を共有・検索しましょう",
  robots: {
    index: false,
    follow: true,
  },
};

// 動的レンダリングを強制（ビルド時のプリレンダリングをスキップ）
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { redirect } = await searchParams;

  // 背景ギャラリー用に投稿データを取得
  const { data: posts } = await getPosts(20, 0);

  // Postデータ型をPhotoCardProps型に変換
  const photos: PhotoCardProps[] =
    posts?.map((post) => ({
      id: post.id,
      imageUrl: post.imageUrl,
      exifData: post.exifData || undefined,
    })) || [];

  return (
    <LoginPageClient backgroundPhotos={photos} redirectPath={redirect || "/"} />
  );
}
