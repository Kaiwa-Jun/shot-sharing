"use client";

import { useRouter } from "next/navigation";
import { PhotoCardProps } from "@/components/gallery/photo-card";
import { MasonryGrid } from "@/components/gallery/masonry-grid";
import { AuthTabs } from "@/components/auth/auth-tabs";

interface SignupPageClientProps {
  backgroundPhotos: PhotoCardProps[];
  redirectPath: string;
}

export function SignupPageClient({
  backgroundPhotos,
  redirectPath,
}: SignupPageClientProps) {
  const router = useRouter();

  return (
    <div className="relative min-h-screen">
      {/* 背景ギャラリー */}
      <div className="fixed inset-0 overflow-hidden">
        <MasonryGrid
          initialPhotos={backgroundPhotos}
          onPhotoClick={() => {}}
          skipInitialAnimation={true}
        />
      </div>

      {/* 半透明オーバーレイ */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

      {/* 認証フォーム */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-2xl dark:bg-gray-900">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">Shot Sharing</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              写真作例を共有・発見するプラットフォーム
            </p>
          </div>

          <AuthTabs activeTab="signup" redirectPath={redirectPath} />

          <div className="text-center">
            <button
              onClick={() => router.push("/")}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              ホームに戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
