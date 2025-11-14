import { getPostById } from "@/app/actions/posts";
import { checkIsSaved } from "@/app/actions/saves";
import { PostDetailPage } from "./page-client";
import { notFound } from "next/navigation";

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

  return <PostDetailPage post={post} initialIsSaved={isSaved || false} />;
}
