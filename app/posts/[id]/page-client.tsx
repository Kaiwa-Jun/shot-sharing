"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { Post } from "@/app/actions/posts";
import { PostDetailModal } from "@/components/post-detail/post-detail-modal";
import { PhotoCardProps } from "@/components/gallery/photo-card";
import { PageClient as HomePageClient } from "@/app/page-client";

interface PostDetailPageProps {
  post: Post;
  initialIsSaved: boolean;
  initialIsOwner: boolean;
  backgroundPhotos: PhotoCardProps[];
  initialUser: any;
}

export function PostDetailPage({
  post,
  initialIsSaved,
  initialIsOwner,
  backgroundPhotos,
  initialUser,
}: PostDetailPageProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleDeleteSuccess = () => {
    setIsOpen(false);
  };

  const handleExitComplete = () => {
    // URLのみ変更（ページリロードなし）
    // 背景に既に / 画面が表示されているため、リロードは不要
    window.history.replaceState({}, "", "/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 背景: / 画面を常に表示 */}
      <div className="fixed inset-0">
        <HomePageClient
          initialPhotos={backgroundPhotos}
          initialUser={initialUser}
        />
      </div>

      {/* 前面: 詳細モーダル */}
      <AnimatePresence mode="wait" onExitComplete={handleExitComplete}>
        {isOpen && (
          <PostDetailModal
            key="detail-modal"
            post={post}
            initialIsSaved={initialIsSaved}
            initialIsOwner={initialIsOwner}
            onClose={handleClose}
            onDeleteSuccess={handleDeleteSuccess}
            skipInitialAnimation={true}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
