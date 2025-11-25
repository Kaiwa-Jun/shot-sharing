"use server";

import { createClient } from "@/lib/supabase/server";
import { Post } from "./posts";

interface SimilarPostRow {
  post_id: string;
  similarity: number;
}

/**
 * Embedding検索で類似投稿を取得
 * @param postId 基準となる投稿ID
 * @param limit 取得する類似投稿の数（デフォルト: 10）
 * @returns 類似投稿の配列
 */
export async function getSimilarPostsWithEmbedding(
  postId: string,
  limit: number = 10
): Promise<{ data: Post[] | null; error: string | null }> {
  try {
    const startTime = Date.now();
    console.log(`🔍 [Embedding] 類似作例を検索中: ${postId}`);

    const supabase = await createClient();

    // 1. 対象投稿のEmbeddingを取得
    const { data: embeddingData, error: embeddingError } = await supabase
      .from("post_embeddings")
      .select("embedding")
      .eq("post_id", postId)
      .single();

    if (embeddingError || !embeddingData) {
      console.error("Embedding取得に失敗:", embeddingError);
      return { data: null, error: "Embeddingが見つかりません" };
    }

    const queryEmbedding = embeddingData.embedding;
    console.log(
      `✅ [Embedding] Embedding取得完了 (${Date.now() - startTime}ms)`
    );

    // 2. pgvectorを使用してコサイン類似度で検索
    const threshold = 0.85;
    console.log(
      `🔍 [Embedding] 類似度閾値: ${threshold}, 取得件数: ${limit + 1}`
    );

    const { data: similarPosts, error: searchError } = await supabase.rpc(
      "search_similar_posts",
      {
        query_embedding: queryEmbedding,
        match_threshold: threshold, // 類似度の閾値（0.85以上のみ返す）- 関連性の低い投稿を除外
        match_count: limit + 1, // +1は自分自身を含むため
      }
    );

    if (searchError) {
      console.error("類似検索に失敗:", searchError);
      return { data: null, error: "類似検索に失敗しました" };
    }

    console.log(`✅ [Embedding] 類似検索完了 (${Date.now() - startTime}ms)`);
    console.log(
      `📊 [Embedding] 検索結果数: ${((similarPosts as SimilarPostRow[]) || []).length}件`
    );

    // 類似度スコアをログ出力
    if (similarPosts && (similarPosts as SimilarPostRow[]).length > 0) {
      const scores = (similarPosts as SimilarPostRow[])
        .map((row) => `${row.similarity.toFixed(3)}`)
        .join(", ");
      console.log(`📊 [Embedding] 類似度スコア: [${scores}]`);
    }

    // 3. 自分自身を除外
    const filteredPostIds = ((similarPosts as SimilarPostRow[]) || [])
      .filter((row) => row.post_id !== postId)
      .slice(0, limit)
      .map((row) => row.post_id);

    if (filteredPostIds.length === 0) {
      console.log("類似投稿が見つかりませんでした");
      return { data: [], error: null };
    }

    // 4. 投稿データを取得
    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("*")
      .in("id", filteredPostIds)
      .eq("visibility", "public");

    if (postsError) {
      console.error("投稿データ取得に失敗:", postsError);
      return { data: null, error: "投稿データ取得に失敗しました" };
    }

    // 5. フロントエンド用の型に変換
    const formattedPosts: Post[] = (posts || []).map((post) => {
      // DBのスネークケースExifDataをキャメルケースに変換
      let exifData = null;
      if (post.exif_data) {
        const dbExif = post.exif_data as any;
        exifData = {
          iso: dbExif.iso ?? null,
          fValue: dbExif.f_value ?? dbExif.fValue ?? null,
          shutterSpeed: dbExif.shutter_speed ?? dbExif.shutterSpeed ?? null,
          exposureCompensation:
            dbExif.exposure_compensation ?? dbExif.exposureCompensation ?? null,
          focalLength: dbExif.focal_length ?? dbExif.focalLength ?? null,
          whiteBalance: dbExif.white_balance ?? dbExif.whiteBalance ?? null,
          cameraMake: dbExif.camera_make ?? dbExif.cameraMake ?? null,
          cameraModel: dbExif.camera_model ?? dbExif.cameraModel ?? null,
          lens: dbExif.lens ?? null,
          dateTime: dbExif.date_time ?? dbExif.dateTime ?? null,
          width: dbExif.width ?? null,
          height: dbExif.height ?? null,
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

    // 6. 類似度順にソート（filteredPostIdsの順序を保持）
    const sortedPosts = filteredPostIds
      .map((id) => formattedPosts.find((post) => post.id === id))
      .filter((post): post is Post => post !== undefined);

    const totalTime = Date.now() - startTime;
    console.log(
      `✅ [Embedding] 類似作例検索完了: ${sortedPosts.length}件 (${totalTime}ms)`
    );

    return { data: sortedPosts, error: null };
  } catch (err) {
    console.error("❌ [Embedding] 類似作例検索でエラー:", err);
    return { data: null, error: "予期しないエラーが発生しました" };
  }
}
