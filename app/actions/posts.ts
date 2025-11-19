"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ExifData } from "@/lib/types/exif";
import { extractExifData } from "@/lib/image/exif";
import { createThumbnail, resizeForDisplay } from "@/lib/image/resize";
import {
  uploadImageToStorage,
  getPublicUrl,
  generateStoragePath,
  deleteFromStorage,
} from "@/lib/supabase/storage";
import { uploadPhotoToFileSearch } from "@/lib/gemini/file-search-upload";

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
    const posts: Post[] = (data || []).map((post) => {
      // DBのスネークケースExifDataをキャメルケースに変換
      let exifData: ExifData | null = null;
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
        exifData: exifData,
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

    // DBのスネークケースExifDataをキャメルケースに変換
    let exifData: ExifData | null = null;
    if (data.exif_data) {
      const dbExif = data.exif_data as any;
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

    const post: Post = {
      id: data.id,
      userId: data.user_id,
      imageUrl: data.image_url,
      thumbnailUrl: data.thumbnail_url,
      description: data.description,
      exifData: exifData,
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

/**
 * 投稿作成Server Action
 * @param formData フォームデータ
 */
export async function createPost(formData: FormData) {
  const supabase = await createClient();

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("認証が必要です");
  }

  try {
    // 1. フォームデータの取得
    const imageFile = formData.get("image") as File;
    const description = (formData.get("description") as string) || "";

    if (!imageFile) {
      throw new Error("画像ファイルが選択されていません");
    }

    console.log("📸 投稿処理を開始します...");

    // 2. 画像をBufferに変換
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

    // 3. Exif情報を抽出（Bufferを渡してサーバーサイドで処理）
    console.log("📊 Exif情報を抽出中...");
    const exifData = await extractExifData(imageBuffer);

    // 4. 投稿IDを生成
    const postId = crypto.randomUUID();

    // 5. サムネイルと表示用画像を生成
    console.log("🖼️ サムネイルと表示用画像を生成中...");
    const [thumbnailBuffer, displayBuffer] = await Promise.all([
      createThumbnail(imageBuffer),
      resizeForDisplay(imageBuffer),
    ]);

    // 6. Supabase Storageにアップロード
    console.log("☁️ Supabase Storageにアップロード中...");
    const imagePath = generateStoragePath(user.id, postId, "original.jpg");
    const thumbnailPath = generateStoragePath(user.id, postId, "thumbnail.jpg");

    try {
      await Promise.all([
        uploadImageToStorage(displayBuffer, imagePath, imageFile.type),
        uploadImageToStorage(thumbnailBuffer, thumbnailPath, "image/jpeg"),
      ]);
    } catch (error) {
      console.error("Storageへのアップロードに失敗しました:", error);
      throw new Error("画像のアップロードに失敗しました");
    }

    // 7. パブリックURLを取得
    const [imageUrl, thumbnailUrl] = await Promise.all([
      getPublicUrl(imagePath),
      getPublicUrl(thumbnailPath),
    ]);

    // 8. File Search Storeに登録
    console.log("🔍 File Search Storeに登録中...");
    let fileSearchSuccess = false;

    try {
      await uploadPhotoToFileSearch(
        imageBuffer,
        postId,
        exifData,
        description,
        imageUrl
      );
      fileSearchSuccess = true;
    } catch (error) {
      console.error("File Search Storeへの登録に失敗しました:", error);
      // File Search失敗時でも投稿は続行（後で再登録可能）
    }

    // 9. DBに投稿情報を保存
    console.log("💾 DBに投稿情報を保存中...");
    const { error: dbError } = await supabase.from("posts").insert({
      id: postId,
      user_id: user.id,
      image_url: imageUrl,
      thumbnail_url: thumbnailUrl,
      description,
      exif_data: exifData,
      visibility: "public",
    });

    if (dbError) {
      console.error("DB保存に失敗しました:", dbError);

      // ロールバック: Storageから画像を削除
      try {
        await Promise.all([
          deleteFromStorage(imagePath),
          deleteFromStorage(thumbnailPath),
        ]);
      } catch (cleanupError) {
        console.error("クリーンアップに失敗しました:", cleanupError);
      }

      throw new Error("投稿の保存に失敗しました");
    }

    console.log("✅ 投稿が完了しました!");

    // キャッシュを再検証
    console.log("🔄 [DEBUG] revalidatePath開始:", new Date().toISOString());
    revalidatePath("/");
    revalidatePath("/me");
    console.log("🔄 [DEBUG] revalidatePath完了:", new Date().toISOString());

    const result = {
      success: true,
      postId,
      fileSearchSuccess,
    };

    console.log("📤 [DEBUG] Server Action戻り値:", result);
    return result;
  } catch (error) {
    console.error("投稿処理でエラーが発生しました:", error);
    throw error;
  }
}

/**
 * DBのスネークケースExifDataをキャメルケースに変換するヘルパー関数
 */
function convertExifData(dbExif: any): ExifData | null {
  if (!dbExif) return null;

  return {
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

/**
 * 特定ユーザーの投稿一覧を取得（ページネーション対応）
 */
export async function getUserPosts(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ data: Post[] | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("posts")
      .select(
        "id, user_id, image_url, thumbnail_url, description, exif_data, file_search_store_id, visibility, width, height, created_at, updated_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching user posts:", error);
      return { data: null, error: error.message };
    }

    const posts: Post[] = (data || []).map((post) => ({
      id: post.id,
      userId: post.user_id,
      imageUrl: post.image_url,
      thumbnailUrl: post.thumbnail_url,
      description: post.description,
      exifData: convertExifData(post.exif_data),
      fileSearchStoreId: post.file_search_store_id,
      visibility: post.visibility,
      width: post.width,
      height: post.height,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
    }));

    return { data: posts, error: null };
  } catch (err) {
    console.error("Unexpected error fetching user posts:", err);
    return { data: null, error: "予期しないエラーが発生しました" };
  }
}

/**
 * 特定ユーザーの投稿総数を取得
 */
export async function getUserPostsCount(
  userId: string
): Promise<{ data: number | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { count, error } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) {
      console.error("Error counting user posts:", error);
      return { data: null, error: error.message };
    }

    return { data: count, error: null };
  } catch (err) {
    console.error("Unexpected error counting user posts:", err);
    return { data: null, error: "予期しないエラーが発生しました" };
  }
}

/**
 * 特定ユーザーが保存した投稿一覧を取得（ページネーション対応）
 */
export async function getUserSavedPosts(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ data: Post[] | null; error: string | null }> {
  try {
    const supabase = await createClient();

    // savesテーブルとpostsテーブルを結合して取得
    const { data, error } = await supabase
      .from("saves")
      .select(
        `
        post_id,
        created_at,
        posts (*)
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching saved posts:", error);
      return { data: null, error: error.message };
    }

    const posts: Post[] = (data || [])
      .filter((save) => save.posts)
      .map((save) => {
        const post = save.posts as any;
        return {
          id: post.id,
          userId: post.user_id,
          imageUrl: post.image_url,
          thumbnailUrl: post.thumbnail_url,
          description: post.description,
          exifData: convertExifData(post.exif_data),
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
    console.error("Unexpected error fetching saved posts:", err);
    return { data: null, error: "予期しないエラーが発生しました" };
  }
}

/**
 * 特定ユーザーの保存した投稿総数を取得
 */
export async function getUserSavedPostsCount(
  userId: string
): Promise<{ data: number | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { count, error } = await supabase
      .from("saves")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) {
      console.error("Error counting saved posts:", error);
      return { data: null, error: error.message };
    }

    return { data: count, error: null };
  } catch (err) {
    console.error("Unexpected error counting saved posts:", err);
    return { data: null, error: "予期しないエラーが発生しました" };
  }
}
