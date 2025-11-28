import type { Metadata } from "next";
import { getPostById, getPosts } from "@/app/actions/posts";
import { getSimilarPostsWithEmbedding } from "@/app/actions/similar-posts-embedding";
import { checkIsSaved } from "@/app/actions/saves";
import { PostDetailPage } from "./page-client";
import { PhotoCardProps } from "@/components/gallery/photo-card";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { siteConfig } from "@/lib/constants/site";
import { ExifData } from "@/lib/types/exif";
import { ImageObjectJsonLd, ArticleJsonLd } from "@/components/seo/json-ld";

interface PageProps {
  params: Promise<{ id: string }>;
}

function generateExifDescription(exifData: ExifData | null): string {
  if (!exifData) return "";

  const parts: string[] = [];

  if (exifData.cameraModel) {
    const make = exifData.cameraMake || "";
    parts.push(`${make} ${exifData.cameraModel}`.trim());
  }

  if (exifData.lens) {
    parts.push(exifData.lens);
  }

  const settings: string[] = [];
  if (exifData.focalLength) settings.push(`${exifData.focalLength}mm`);
  if (exifData.fValue) settings.push(`F${exifData.fValue}`);
  if (exifData.shutterSpeed) settings.push(exifData.shutterSpeed);
  if (exifData.iso) settings.push(`ISO${exifData.iso}`);

  if (settings.length > 0) {
    parts.push(settings.join(" "));
  }

  return parts.join(" | ");
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { data: post } = await getPostById(id);

  if (!post) {
    return {
      title: "投稿が見つかりません",
    };
  }

  const exifDescription = generateExifDescription(post.exifData);
  const description =
    post.description || exifDescription || "Shot Sharingで共有された写真作例";
  const title = exifDescription ? `作例 | ${exifDescription}` : "作例詳細";

  return {
    title,
    description,
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      url: `${siteConfig.url}/posts/${id}`,
      type: "article",
      images: [
        {
          url: post.imageUrl,
          width: post.width || 1200,
          height: post.height || 630,
          alt: description,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${siteConfig.name}`,
      description,
      images: [post.imageUrl],
    },
  };
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

  // 類似作例を取得
  console.log(`🔍 [DEBUG] 投稿詳細ページ: 類似作例を取得中 (postId: ${id})`);
  const { data: similarPosts, error: similarError } =
    await getSimilarPostsWithEmbedding(id, 10);
  console.log(`📊 [DEBUG] 類似作例の取得結果:`, {
    count: similarPosts?.length || 0,
    error: similarError,
    postIds: similarPosts?.map((p) => p.id).slice(0, 5) || [],
  });

  const exifDescription = generateExifDescription(post.exifData);
  const title = exifDescription ? `作例 | ${exifDescription}` : "作例詳細";

  return (
    <>
      <ImageObjectJsonLd
        id={post.id}
        imageUrl={post.imageUrl}
        thumbnailUrl={post.thumbnailUrl}
        description={post.description}
        exifData={post.exifData}
        width={post.width}
        height={post.height}
        createdAt={post.createdAt}
      />
      <ArticleJsonLd
        id={post.id}
        title={title}
        description={post.description}
        imageUrl={post.imageUrl}
        createdAt={post.createdAt}
        updatedAt={post.updatedAt}
      />
      <PostDetailPage
        post={post}
        initialIsSaved={isSaved || false}
        initialIsOwner={isOwner}
        backgroundPhotos={backgroundPhotos}
        initialUser={user}
        similarPosts={similarPosts || []}
      />
    </>
  );
}
