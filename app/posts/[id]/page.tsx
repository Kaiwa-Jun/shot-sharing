import { getPostById } from "@/app/actions/posts";
import { checkIsSaved } from "@/app/actions/saves";
import { getPosts } from "@/app/actions/posts";
import { PostDetailPage } from "./page-client";
import { PhotoCardProps } from "@/components/gallery/photo-card";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  // 投稿データを取得
  const { data: post, error: postError } = await getPostById(id);

  if (postError || !post) {
    notFound();
  }

  // 保存状態を確認
  const { data: isSaved } = await checkIsSaved(id);

  // 所有者判定
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = user ? user.id === post.userId : false;

  // 背景用にギャラリーの写真を取得（デスクトップサイズのみ表示）
  const { data: posts } = await getPosts(20, 0);
  const backgroundPhotos: PhotoCardProps[] =
    posts?.map((p) => ({
      id: p.id,
      imageUrl: p.imageUrl,
      userId: p.userId,
      exifData: p.exifData ?? undefined,
    })) || [];

  return (
    <PostDetailPage
      post={post}
      initialIsSaved={isSaved || false}
      initialIsOwner={isOwner}
      backgroundPhotos={backgroundPhotos}
      initialUser={user}
    />
  );
}
