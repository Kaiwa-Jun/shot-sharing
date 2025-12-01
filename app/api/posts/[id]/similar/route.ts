import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { createCacheableClient } from "@/lib/supabase/server";
import { Post } from "@/app/actions/posts";
import { ExifData } from "@/lib/types/exif";

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
  ["similar-posts-api"],
  { revalidate: 600, tags: ["posts"] } // 10分間キャッシュ
);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "10", 10);

  const { data, error } = await getCachedSimilarPosts(id, limit);

  if (error) {
    return NextResponse.json({ data: [], error }, { status: 200 });
  }

  return NextResponse.json({ data: data || [], error: null });
}
