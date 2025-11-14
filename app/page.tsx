import { getPosts } from "@/app/actions/posts";
import { PhotoCardProps } from "@/components/gallery/photo-card";
import { PageClient } from "./page-client";

// 動的レンダリングを強制（ビルド時のプリレンダリングをスキップ）
export const dynamic = "force-dynamic";

export default async function Home() {
  // Supabaseから投稿データを取得
  const { data: posts, error } = await getPosts(20, 0);

  // エラーハンドリング
  if (error) {
    console.error("Failed to fetch posts:", error);
  }

  // Postデータ型をPhotoCardProps型に変換
  const photos: PhotoCardProps[] =
    posts?.map((post) => ({
      id: post.id,
      imageUrl: post.imageUrl,
      exifData: post.exifData || undefined,
    })) || [];

  return <PageClient initialPhotos={photos} />;
}
