import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { Post } from "@/app/actions/posts";
import { checkIsSaved } from "@/app/actions/saves";
import { PostDetailPage } from "./page-client";
import { PhotoCardProps } from "@/components/gallery/photo-card";
import { notFound } from "next/navigation";
import { createClient, createCacheableClient } from "@/lib/supabase/server";
import { siteConfig } from "@/lib/constants/site";
import { ExifData } from "@/lib/types/exif";
import { ImageObjectJsonLd, ArticleJsonLd } from "@/components/seo/json-ld";

// 投稿詳細のキャッシュ（5分間）
const getCachedPostById = unstable_cache(
  async (
    postId: string
  ): Promise<{ data: Post | null; error: string | null }> => {
    console.log(
      `📡 [CACHE] getPostById実行（キャッシュミス）: ${postId}`,
      new Date().toISOString()
    );
    try {
      const supabase = createCacheableClient();
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .single();

      if (error) {
        console.error("Error fetching post:", error);
        return { data: null, error: error.message };
      }

      if (!data) {
        return { data: null, error: "投稿が見つかりません" };
      }

      // ExifDataの変換
      let exifData: ExifData | null = null;
      if (data.exif_data) {
        const dbExif = data.exif_data as Record<string, unknown>;
        exifData = {
          iso: (dbExif.iso as number) ?? null,
          fValue:
            (dbExif.f_value as number) ?? (dbExif.fValue as number) ?? null,
          shutterSpeed:
            (dbExif.shutter_speed as string) ??
            (dbExif.shutterSpeed as string) ??
            null,
          exposureCompensation:
            (dbExif.exposure_compensation as number) ??
            (dbExif.exposureCompensation as number) ??
            null,
          focalLength:
            (dbExif.focal_length as number) ??
            (dbExif.focalLength as number) ??
            null,
          whiteBalance:
            (dbExif.white_balance as string) ??
            (dbExif.whiteBalance as string) ??
            null,
          cameraMake:
            (dbExif.camera_make as string) ??
            (dbExif.cameraMake as string) ??
            null,
          cameraModel:
            (dbExif.camera_model as string) ??
            (dbExif.cameraModel as string) ??
            null,
          lens: (dbExif.lens as string) ?? null,
          dateTime:
            (dbExif.date_time as string) ?? (dbExif.dateTime as string) ?? null,
          width: (dbExif.width as number) ?? null,
          height: (dbExif.height as number) ?? null,
        };
      }

      const post: Post = {
        id: data.id,
        userId: data.user_id,
        imageUrl: data.image_url,
        thumbnailUrl: data.thumbnail_url,
        description: data.description,
        exifData,
        fileSearchStoreId: data.file_search_store_id,
        visibility: data.visibility,
        width: data.width,
        height: data.height,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      return { data: post, error: null };
    } catch (err) {
      console.error("Unexpected error fetching post:", err);
      return { data: null, error: "予期しないエラーが発生しました" };
    }
  },
  ["post-detail"],
  { revalidate: 300, tags: ["posts"] } // 5分間キャッシュ
);

// 類似作例のキャッシュ（10分間）
const getCachedSimilarPosts = unstable_cache(
  async (
    postId: string,
    limit: number = 10
  ): Promise<{ data: Post[] | null; error: string | null }> => {
    console.log(
      `📡 [CACHE] getSimilarPosts実行（キャッシュミス）: ${postId}`,
      new Date().toISOString()
    );
    try {
      const supabase = createCacheableClient();

      // 1. 対象投稿のEmbeddingを取得
      const { data: embeddingData, error: embeddingError } = await supabase
        .from("post_embeddings")
        .select("embedding")
        .eq("post_id", postId)
        .single();

      if (embeddingError || !embeddingData) {
        return { data: null, error: "Embeddingが見つかりません" };
      }

      // 2. pgvectorを使用してコサイン類似度で検索
      const { data: similarPosts, error: searchError } = await supabase.rpc(
        "search_similar_posts",
        {
          query_embedding: embeddingData.embedding,
          match_threshold: 0.85,
          match_count: limit + 1,
        }
      );

      if (searchError) {
        return { data: null, error: "類似検索に失敗しました" };
      }

      // 3. 自分自身を除外
      const filteredPostIds = (
        (similarPosts as { post_id: string; similarity: number }[]) || []
      )
        .filter((row) => row.post_id !== postId)
        .slice(0, limit)
        .map((row) => row.post_id);

      if (filteredPostIds.length === 0) {
        return { data: [], error: null };
      }

      // 4. 投稿データを取得
      const { data: posts, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .in("id", filteredPostIds)
        .eq("visibility", "public");

      if (postsError) {
        return { data: null, error: "投稿データ取得に失敗しました" };
      }

      // 5. フロントエンド用の型に変換
      const formattedPosts: Post[] = (posts || []).map((post) => {
        let exifData: ExifData | null = null;
        if (post.exif_data) {
          const dbExif = post.exif_data as Record<string, unknown>;
          exifData = {
            iso: (dbExif.iso as number) ?? null,
            fValue:
              (dbExif.f_value as number) ?? (dbExif.fValue as number) ?? null,
            shutterSpeed:
              (dbExif.shutter_speed as string) ??
              (dbExif.shutterSpeed as string) ??
              null,
            exposureCompensation:
              (dbExif.exposure_compensation as number) ??
              (dbExif.exposureCompensation as number) ??
              null,
            focalLength:
              (dbExif.focal_length as number) ??
              (dbExif.focalLength as number) ??
              null,
            whiteBalance:
              (dbExif.white_balance as string) ??
              (dbExif.whiteBalance as string) ??
              null,
            cameraMake:
              (dbExif.camera_make as string) ??
              (dbExif.cameraMake as string) ??
              null,
            cameraModel:
              (dbExif.camera_model as string) ??
              (dbExif.cameraModel as string) ??
              null,
            lens: (dbExif.lens as string) ?? null,
            dateTime:
              (dbExif.date_time as string) ??
              (dbExif.dateTime as string) ??
              null,
            width: (dbExif.width as number) ?? null,
            height: (dbExif.height as number) ?? null,
          };
        }

        return {
          id: post.id,
          userId: post.user_id,
          imageUrl: post.image_url,
          thumbnailUrl: post.thumbnail_url,
          description: post.description,
          exifData,
          fileSearchStoreId: post.file_search_store_id,
          visibility: post.visibility,
          width: post.width,
          height: post.height,
          createdAt: post.created_at,
          updatedAt: post.updated_at,
        };
      });

      // 6. 類似度順にソート
      const sortedPosts = filteredPostIds
        .map((id) => formattedPosts.find((post) => post.id === id))
        .filter((post): post is Post => post !== undefined);

      return { data: sortedPosts, error: null };
    } catch (err) {
      console.error("類似作例検索でエラー:", err);
      return { data: null, error: "予期しないエラーが発生しました" };
    }
  },
  ["similar-posts"],
  { revalidate: 600, tags: ["posts"] } // 10分間キャッシュ
);

// 背景写真のキャッシュ（30秒間）- ホーム画面と同じデータ
const getCachedBackgroundPosts = unstable_cache(
  async (): Promise<{ data: Post[] | null; error: string | null }> => {
    console.log(
      `📡 [CACHE] getBackgroundPosts実行（キャッシュミス）:`,
      new Date().toISOString()
    );
    try {
      const supabase = createCacheableClient();
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .range(0, 19);

      if (error) {
        return { data: null, error: error.message };
      }

      const posts: Post[] = (data || []).map((post) => {
        let exifData: ExifData | null = null;
        if (post.exif_data) {
          const dbExif = post.exif_data as Record<string, unknown>;
          exifData = {
            iso: (dbExif.iso as number) ?? null,
            fValue:
              (dbExif.f_value as number) ?? (dbExif.fValue as number) ?? null,
            shutterSpeed:
              (dbExif.shutter_speed as string) ??
              (dbExif.shutterSpeed as string) ??
              null,
            exposureCompensation:
              (dbExif.exposure_compensation as number) ??
              (dbExif.exposureCompensation as number) ??
              null,
            focalLength:
              (dbExif.focal_length as number) ??
              (dbExif.focalLength as number) ??
              null,
            whiteBalance:
              (dbExif.white_balance as string) ??
              (dbExif.whiteBalance as string) ??
              null,
            cameraMake:
              (dbExif.camera_make as string) ??
              (dbExif.cameraMake as string) ??
              null,
            cameraModel:
              (dbExif.camera_model as string) ??
              (dbExif.cameraModel as string) ??
              null,
            lens: (dbExif.lens as string) ?? null,
            dateTime:
              (dbExif.date_time as string) ??
              (dbExif.dateTime as string) ??
              null,
            width: (dbExif.width as number) ?? null,
            height: (dbExif.height as number) ?? null,
          };
        }

        return {
          id: post.id,
          userId: post.user_id,
          imageUrl: post.image_url,
          thumbnailUrl: post.thumbnail_url,
          description: post.description,
          exifData,
          fileSearchStoreId: post.file_search_store_id,
          visibility: post.visibility,
          width: post.width,
          height: post.height,
          createdAt: post.created_at,
          updatedAt: post.updated_at,
        };
      });

      return { data: posts, error: null };
    } catch (err) {
      console.error("背景写真取得でエラー:", err);
      return { data: null, error: "予期しないエラーが発生しました" };
    }
  },
  ["background-posts"],
  { revalidate: 30, tags: ["posts"] } // 30秒間キャッシュ
);

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
  const { data: post } = await getCachedPostById(id);

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

  console.log(`🔍 [DEBUG] 投稿詳細ページ開始: ${id}`, new Date().toISOString());

  // キャッシュから投稿データを取得（5分間キャッシュ）
  const { data: post, error: postError } = await getCachedPostById(id);

  if (postError || !post) {
    notFound();
  }

  // 保存状態を確認（キャッシュしない - 個人データ）
  const { data: isSaved } = await checkIsSaved(id);

  // 所有者判定（キャッシュしない - 認証依存）
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = user ? user.id === post.userId : false;

  // キャッシュから背景写真を取得（30秒間キャッシュ）
  const { data: posts } = await getCachedBackgroundPosts();
  const backgroundPhotos: PhotoCardProps[] =
    posts?.map((p) => ({
      id: p.id,
      imageUrl: p.imageUrl,
      userId: p.userId,
      exifData: p.exifData ?? undefined,
    })) || [];

  // キャッシュから類似作例を取得（10分間キャッシュ）
  const { data: similarPosts, error: similarError } =
    await getCachedSimilarPosts(id, 10);
  console.log(`📊 [DEBUG] 類似作例の取得結果:`, {
    count: similarPosts?.length || 0,
    error: similarError,
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
