"use client";

import { Header } from "@/components/layout/header";
import { SearchFAB } from "@/components/layout/search-fab";
import { MasonryGrid } from "@/components/gallery/masonry-grid";
import { mockPhotos } from "@/lib/data/mock-photos";

// 動的レンダリングを強制（ビルド時のプリレンダリングをスキップ）
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <Header />

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 pb-24 pt-20">
        <MasonryGrid photos={mockPhotos} />
      </main>

      {/* フローティングアクションボタン */}
      <SearchFAB />
    </div>
  );
}
