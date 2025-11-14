"use server";

import { createClient } from "@/lib/supabase/server";
import { ExifData } from "@/components/gallery/photo-card";

export interface Post {
  id: string;
  userId: string;
  imageUrl: string;
  thumbnailUrl: string;
  description: string | null;
  exifData: ExifData | null;
  fileSearchStoreId: string | null;
  visibility: string | null;
  width: number | null;
  height: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

/**
 * 投稿一覧を取得（ページネーション対応）
 */
export async function getPosts(
  limit: number = 20,
  offset: number = 0
): Promise<{ data: Post[] | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("visibility", "public") // 公開設定の投稿のみ
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching posts:", error);
      return { data: null, error: error.message };
    }

    // データベースの型からフロントエンド用の型に変換
    const posts: Post[] = (data || []).map((post) => ({
      id: post.id,
      userId: post.user_id,
      imageUrl: post.image_url,
      thumbnailUrl: post.thumbnail_url,
      description: post.description,
      exifData: post.exif_data as ExifData | null,
      fileSearchStoreId: post.file_search_store_id,
      visibility: post.visibility,
      width: post.width,
      height: post.height,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
    }));

    return { data: posts, error: null };
  } catch (err) {
    console.error("Unexpected error fetching posts:", err);
    return { data: null, error: "予期しないエラーが発生しました" };
  }
}

/**
 * 投稿総数を取得
 */
export async function getPostsCount(): Promise<{
  data: number | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { count, error } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("visibility", "public");

    if (error) {
      console.error("Error counting posts:", error);
      return { data: null, error: error.message };
    }

    return { data: count, error: null };
  } catch (err) {
    console.error("Unexpected error counting posts:", err);
    return { data: null, error: "予期しないエラーが発生しました" };
  }
}

/**
 * 特定の投稿を取得
 */
export async function getPostById(
  id: string
): Promise<{ data: Post | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching post:", error);
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: "投稿が見つかりません" };
    }

    const post: Post = {
      id: data.id,
      userId: data.user_id,
      imageUrl: data.image_url,
      thumbnailUrl: data.thumbnail_url,
      description: data.description,
      exifData: data.exif_data as ExifData | null,
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
}
