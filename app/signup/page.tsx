import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignupPageClient } from "./page-client";
import { getPosts } from "@/app/actions/posts";
import { PhotoCardProps } from "@/components/gallery/photo-card";

export const metadata = {
  title: "新規登録 - Shot Sharing",
  description: "Shot Sharingに新規登録して、写真作例を共有しましょう",
};

// 動的レンダリングを強制（ビルド時のプリレンダリングをスキップ）
export const dynamic = "force-dynamic";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const supabase = await createClient();

  // 認証状態を確認
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // すでにログインしている場合はホームにリダイレクト
  if (user) {
    const params = await searchParams;
    redirect(params.next || "/");
  }

  // 背景ギャラリー用に投稿データを取得
  const { data: posts } = await getPosts(20, 0);

  // Postデータ型をPhotoCardProps型に変換
  const photos: PhotoCardProps[] =
    posts?.map((post) => ({
      id: post.id,
      imageUrl: post.imageUrl,
      exifData: post.exifData || undefined,
    })) || [];

  // リダイレクトパスを取得
  const params = await searchParams;
  const redirectPath = params.next || "/";

  return (
    <SignupPageClient backgroundPhotos={photos} redirectPath={redirectPath} />
  );
}
