"use client";

import { useRouter } from "next/navigation";
import { Post } from "@/app/actions/posts";
import { PostDetailModal } from "@/components/post-detail/post-detail-modal";
import { MasonryGrid } from "@/components/gallery/masonry-grid";
import { PhotoCardProps } from "@/components/gallery/photo-card";
import { Header } from "@/components/layout/header";
import { SearchFAB } from "@/components/layout/search-fab";

interface PostDetailPageProps {
  post: Post;
  initialIsSaved: boolean;
  initialIsOwner: boolean;
  backgroundPhotos: PhotoCardProps[];
}

export function PostDetailPage({
  post,
  initialIsSaved,
  initialIsOwner,
  backgroundPhotos,
}: PostDetailPageProps) {
  const router = useRouter();

  const handleClose = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー（デスクトップのみ） */}
      <div className="hidden md:block">
        <Header />
      </div>

      {/* 背景ギャラリー（デスクトップのみ） */}
      <main className="hidden md:block">
        <div className="container mx-auto px-4 pb-24 pt-20">
          {backgroundPhotos.length > 0 ? (
            <MasonryGrid
              initialPhotos={backgroundPhotos}
              skipInitialAnimation={true}
            />
          ) : (
            <div className="flex min-h-[50vh] items-center justify-center">
              <p className="text-muted-foreground">
                投稿がありません。最初の投稿を作成してみましょう！
              </p>
            </div>
          )}
        </div>
      </main>

      {/* フローティングアクションボタン（デスクトップのみ） */}
      <div className="hidden md:block">
        <SearchFAB />
      </div>

      {/* 詳細モーダル */}
      <PostDetailModal
        post={post}
        initialIsSaved={initialIsSaved}
        initialIsOwner={initialIsOwner}
        onClose={handleClose}
        onDeleteSuccess={() => router.push("/")}
        skipAnimation={true}
      />
    </div>
  );
}
