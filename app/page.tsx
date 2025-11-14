import { Header } from "@/components/layout/header";
import { SearchFAB } from "@/components/layout/search-fab";
import { MasonryGrid } from "@/components/gallery/masonry-grid";
import { getPosts } from "@/app/actions/posts";
import { PhotoCardProps } from "@/components/gallery/photo-card";

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

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <Header />

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 pb-24 pt-20">
        {posts && posts.length > 0 ? (
          <MasonryGrid initialPhotos={photos} />
        ) : (
          <div className="flex min-h-[50vh] items-center justify-center">
            <p className="text-muted-foreground">
              投稿がありません。最初の投稿を作成してみましょう！
            </p>
          </div>
        )}
      </main>

      {/* フローティングアクションボタン */}
      <SearchFAB />
    </div>
  );
}
