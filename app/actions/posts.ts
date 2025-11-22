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
import { searchWithFileSearch } from "@/lib/gemini/file-search-query";

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
      // 行が見つからないエラーは正常な動作として扱う（ログに出さない）
      if (error.code === "PGRST116") {
        return { data: null, error: "投稿が見つかりません" };
      }
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
    let fileSearchStoreId: string | null = null;

    try {
      fileSearchSuccess = true;
      // アップロード成功時、ファイル名（ID）を取得して保存
      // uploadPhotoToFileSearchの戻り値を利用するように変更する必要があるが、
      // 現状のuploadPhotoToFileSearchは戻り値を返しているのでそれを使う
      const uploadResult = await uploadPhotoToFileSearch(
        imageBuffer,
        postId,
        exifData,
        description,
        imageUrl
      );

      if (uploadResult.success && uploadResult.fileName) {
        // fileSearchStoreIdとしてファイル名（例: files/xxxxx）を保存
        // 注: DBのカラム名はfile_search_store_idだが、実際にはFile APIのname (files/...) を保存する
        // これにより削除時にこのIDを使って削除できる
        fileSearchStoreId = uploadResult.fileName;
      }
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
      file_search_store_id: fileSearchStoreId, // 追加
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

/**
 * 投稿削除Server Action
 */
export async function deletePost(postId: string) {
  const supabase = await createClient();

  // 1. 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("認証が必要です");
  }

  try {
    // 2. 投稿の取得と所有権チェック
    const { data: post, error: fetchError } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .single();

    if (fetchError || !post) {
      throw new Error("投稿が見つかりません");
    }

    if (post.user_id !== user.id) {
      throw new Error("この投稿を削除する権限がありません");
    }

    console.log(`🗑️ 投稿削除処理を開始します: ${postId}`);

    // 3. Supabase Storageから画像を削除
    const imagePath = generateStoragePath(user.id, postId, "original.jpg");
    const thumbnailPath = generateStoragePath(user.id, postId, "thumbnail.jpg");

    try {
      await Promise.all([
        deleteFromStorage(imagePath),
        deleteFromStorage(thumbnailPath),
      ]);
      console.log("✅ Storageから画像を削除しました");
    } catch (storageError) {
      console.error("Storageからの削除に失敗（処理は続行）:", storageError);
    }

    // 4. Gemini File Search Storeからデータを削除
    if (post.file_search_store_id) {
      try {
        // 動的インポートで循環参照を回避（必要であれば）
        const { deleteFileFromStore } = await import(
          "@/lib/gemini/file-search"
        );
        await deleteFileFromStore(post.file_search_store_id);
      } catch (geminiError) {
        console.error("Geminiからの削除に失敗（処理は続行）:", geminiError);
      }
    }

    // 5. DBから投稿レコードを削除
    // savesテーブルなどの関連レコードはCASCADE設定されていれば自動削除されるはずだが、
    // 明示的に削除する必要がある場合はここで行う
    const { error: deleteError } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId);

    if (deleteError) {
      throw new Error(`DBからの削除に失敗: ${deleteError.message}`);
    }

    console.log("✅ DBから投稿を削除しました");

    // 6. キャッシュの再検証
    revalidatePath("/");
    revalidatePath("/me");
    revalidatePath(`/users/${user.id}`);

    return { success: true };
  } catch (error) {
    console.error("投稿削除エラー:", error);
    throw error;
  }
}

/**
 * 類似検索クエリを構築
 * 投稿の説明文とExif情報から検索クエリを生成
 */
function buildSimilarityQuery(post: Post): string {
  const parts: string[] = [];

  // 説明文を追加
  if (post.description) {
    parts.push(post.description);
  }

  // Exif情報から撮影設定を追加
  if (post.exifData) {
    const exif = post.exifData;
    const settings: string[] = [];

    if (exif.iso) settings.push(`ISO${exif.iso}`);
    if (exif.fValue) settings.push(`f/${exif.fValue}`);
    if (exif.shutterSpeed) settings.push(exif.shutterSpeed);
    if (exif.focalLength) settings.push(`${exif.focalLength}mm`);

    if (settings.length > 0) {
      parts.push(`撮影設定: ${settings.join(" ")}`);
    }

    // カメラとレンズ情報
    if (exif.cameraMake || exif.cameraModel) {
      const camera = [exif.cameraMake, exif.cameraModel]
        .filter(Boolean)
        .join(" ");
      if (camera) parts.push(`カメラ: ${camera}`);
    }
    if (exif.lens) {
      parts.push(`レンズ: ${exif.lens}`);
    }
  }

  // クエリが空の場合はデフォルトのクエリを使用
  if (parts.length === 0) {
    return "類似した写真を探してください";
  }

  return parts.join(" ");
}

/**
 * 類似作例を取得
 * Gemini File Search APIのベクトル検索を使用して、現在の投稿に類似した作例を取得
 * @param postId 現在の投稿ID
 * @param limit 取得件数（デフォルト: 10）
 * @returns 類似作例のリスト
 */
export async function getSimilarPosts(
  postId: string,
  limit: number = 10
): Promise<{ data: Post[] | null; error: string | null }> {
  try {
    console.log(`🔍 類似作例を検索中: ${postId}`);

    // サーバーサイドキャッシュをチェック（24時間以内のキャッシュのみ使用）
    const supabase = await createClient();
    const { data: cachedData, error: cacheError } = await supabase
      .from("similar_posts_cache")
      .select("similar_post_ids, created_at")
      .eq("post_id", postId)
      .gte(
        "created_at",
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      )
      .single();

    if (!cacheError && cachedData && cachedData.similar_post_ids) {
      console.log(
        `💾 [SERVER CACHE] キャッシュヒット: ${cachedData.similar_post_ids.length}件`
      );

      // キャッシュから投稿データを取得
      const { data: allPosts } = await getPosts(100, 0);
      if (allPosts) {
        const similarPosts = cachedData.similar_post_ids
          .map((id: string) => allPosts.find((p: Post) => p.id === id))
          .filter((post: Post | undefined): post is Post => post !== undefined)
          .slice(0, limit);

        console.log(`✅ [SERVER CACHE] ${similarPosts.length}件を返却`);
        return { data: similarPosts, error: null };
      }
    } else {
      console.log(`🔍 [SERVER CACHE] キャッシュミス、Gemini APIで検索`);
    }

    // 1. 現在の投稿を取得
    const { data: currentPost, error: postError } = await getPostById(postId);
    if (postError || !currentPost) {
      console.error("投稿の取得エラー:", postError);
      return { data: null, error: "投稿が見つかりません" };
    }

    // 2. file_search_store_idが未設定の場合はフォールバック
    console.log(
      `📋 [DEBUG] file_search_store_id: ${currentPost.fileSearchStoreId || "未設定"}`
    );

    if (!currentPost.fileSearchStoreId) {
      console.log("⚠️ file_search_store_idが未設定、最新の投稿を返します");
      const { data: fallbackPosts } = await getPosts(limit + 1, 0);
      console.log(
        `📊 [DEBUG] フォールバック投稿数: ${fallbackPosts?.length || 0}`
      );
      const filteredPosts =
        fallbackPosts?.filter((p) => p.id !== postId).slice(0, limit) || [];
      console.log(`✅ [DEBUG] フィルタ後: ${filteredPosts.length}件を返却`);
      return { data: filteredPosts, error: null };
    }

    // 3. 類似検索クエリを構築
    const query = buildSimilarityQuery(currentPost);
    console.log("📝 検索クエリ:", query);

    // 4. File Search APIで類似検索を実行
    console.log(`🔍 [DEBUG] File Search API呼び出し開始`);
    const { postIds } = await searchWithFileSearch(query);
    console.log(`✅ ${postIds.length}件の類似作例を検出`);
    console.log(`📋 [DEBUG] 検出されたpost_ids:`, postIds.slice(0, 5));

    // 5. 自分自身を除外
    const filteredPostIds = postIds.filter((id) => id !== postId);

    // 類似作例が少ない場合は空配列を返す
    if (filteredPostIds.length === 0) {
      console.log("⚠️ 類似作例が見つかりませんでした");
      return { data: [], error: null };
    }

    // 6. 投稿データを取得（十分な量を取得してフィルタリング）
    const { data: allPosts, error: fetchError } = await getPosts(100, 0);
    if (fetchError || !allPosts) {
      console.error("投稿一覧の取得エラー:", fetchError);
      return { data: null, error: "投稿の取得に失敗しました" };
    }

    // 7. post_idsの順序を保持してソート（類似度順）
    const similarPosts = filteredPostIds
      .map((id) => allPosts.find((p) => p.id === id))
      .filter((post): post is Post => post !== undefined)
      .slice(0, limit);

    console.log(`📤 ${similarPosts.length}件の類似作例を返却`);

    // 8. サーバーサイドキャッシュに保存（UPSERT）
    const similarPostIds = similarPosts.map((p) => p.id);
    const { error: cacheInsertError } = await supabase
      .from("similar_posts_cache")
      .upsert(
        {
          post_id: postId,
          similar_post_ids: similarPostIds,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "post_id",
        }
      );

    if (cacheInsertError) {
      console.warn("⚠️ [SERVER CACHE] キャッシュ保存エラー:", cacheInsertError);
    } else {
      console.log(
        `✅ [SERVER CACHE] ${similarPostIds.length}件をキャッシュに保存`
      );
    }

    return { data: similarPosts, error: null };
  } catch (error) {
    console.error("類似作例の取得エラー:", error);

    // エラー時はフォールバック（最新の投稿を返す）
    try {
      const { data: fallbackPosts } = await getPosts(limit + 1, 0);
      const filteredPosts =
        fallbackPosts?.filter((p) => p.id !== postId).slice(0, limit) || [];
      console.log(`⚠️ フォールバック: ${filteredPosts.length}件の投稿を返却`);
      return { data: filteredPosts, error: null };
    } catch (fallbackError) {
      console.error("フォールバックも失敗:", fallbackError);
      return { data: null, error: "類似作例の取得に失敗しました" };
    }
  }
}
