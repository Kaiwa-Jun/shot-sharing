import { getPosts } from "@/app/actions/posts";
import { PhotoCardProps } from "@/components/gallery/photo-card";
import { PageClient } from "./page-client";
import { createClient } from "@/lib/supabase/server";

// 動的レンダリングを強制（ビルド時のプリレンダリングをスキップ）
export const dynamic = "force-dynamic";

export default async function TestEmbeddingPage() {
  console.log(
    "🧪 [Embedding Test] ページレンダリング開始:",
    new Date().toISOString()
  );

  // サーバー側で認証状態を取得
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Supabaseから投稿データを取得
  console.log(
    "📡 [Embedding Test] getPosts呼び出し前:",
    new Date().toISOString()
  );
  const { data: posts, error } = await getPosts(20, 0);
  console.log(
    "📡 [Embedding Test] getPosts完了:",
    new Date().toISOString(),
    "件数:",
    posts?.length || 0
  );

  // エラーハンドリング
  if (error) {
    console.error("Failed to fetch posts:", error);
  }

  // Postデータ型をPhotoCardProps型に変換
  const photos: PhotoCardProps[] =
    posts?.map((post) => ({
      id: post.id,
      imageUrl: post.imageUrl,
      userId: post.userId,
      exifData: post.exifData || undefined,
    })) || [];

  console.log(
    "📤 [Embedding Test] PageClientに渡すphotos:",
    photos.length,
    "件"
  );
  return <PageClient initialPhotos={photos} initialUser={user} />;
}
