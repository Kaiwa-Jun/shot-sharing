"use client";

import { useRouter } from "next/navigation";
import { Post } from "@/app/actions/posts";
import { PostDetailModal } from "@/components/post-detail/post-detail-modal";

interface PostDetailPageProps {
  post: Post;
  initialIsSaved: boolean;
}

export function PostDetailPage({ post, initialIsSaved }: PostDetailPageProps) {
  const router = useRouter();

  const handleClose = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 詳細モーダル */}
      <PostDetailModal
        post={post}
        initialIsSaved={initialIsSaved}
        onClose={handleClose}
      />
    </div>
  );
}
