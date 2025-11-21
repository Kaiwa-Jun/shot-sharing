import { createClient } from "@/lib/supabase/server";

/**
 * Storageのパス生成
 * @param userId ユーザーID
 * @param postId 投稿ID
 * @param filename ファイル名
 * @returns Storageパス
 */
export function generateStoragePath(
  userId: string,
  postId: string,
  filename: string
): string {
  return `${userId}/${postId}/${filename}`;
}

/**
 * Supabase Storageに画像をアップロード
 * @param buffer 画像のBuffer
 * @param path Storageパス
 * @param contentType MIMEタイプ
 * @returns アップロード結果
 */
export async function uploadImageToStorage(
  buffer: Buffer,
  path: string,
  contentType: string = "image/jpeg"
) {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from("photos")
    .upload(path, buffer, {
      contentType,
      upsert: false, // 上書きしない
    });

  if (error) {
    console.error("Storageへのアップロードに失敗しました:", error);
    throw new Error(`Storageへのアップロードに失敗: ${error.message}`);
  }

  return data;
}

/**
 * Supabase StorageのパブリックURLを取得
 * @param path Storageパス
 * @returns パブリックURL
 */
export async function getPublicUrl(path: string): Promise<string> {
  const supabase = await createClient();

  const {
    data: { publicUrl },
  } = supabase.storage.from("photos").getPublicUrl(path);

  return publicUrl;
}

/**
 * Supabase Storageからファイルを削除
 * @param path Storageパス
 */
export async function deleteFromStorage(path: string) {
  const supabase = await createClient();

  const { error } = await supabase.storage.from("photos").remove([path]);

  if (error) {
    console.error("Storageからの削除に失敗しました:", error);
    throw new Error(`Storageからの削除に失敗: ${error.message}`);
  }
}

/**
 * アバター画像のパス生成
 * @param userId ユーザーID
 * @returns アバターStorageパス
 */
export function generateAvatarPath(userId: string): string {
  return `${userId}/avatar.jpg`;
}

/**
 * Supabase Storageにアバター画像をアップロード
 * @param buffer 画像のBuffer
 * @param userId ユーザーID
 * @param contentType MIMEタイプ
 * @returns アップロード結果
 */
export async function uploadAvatarToStorage(
  buffer: Buffer,
  userId: string,
  contentType: string = "image/jpeg"
) {
  const supabase = await createClient();
  const path = generateAvatarPath(userId);

  const { data, error } = await supabase.storage
    .from("avatars")
    .upload(path, buffer, {
      contentType,
      upsert: true, // 既存のアバターを上書き
    });

  if (error) {
    console.error("Storageへのアバターアップロードに失敗しました:", error);
    throw new Error(`アバターのアップロードに失敗: ${error.message}`);
  }

  return data;
}

/**
 * アバター画像のパブリックURLを取得
 * @param userId ユーザーID
 * @returns パブリックURL
 */
export async function getAvatarPublicUrl(userId: string): Promise<string> {
  const supabase = await createClient();
  const path = generateAvatarPath(userId);

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  return publicUrl;
}

/**
 * アバター画像を削除
 * @param userId ユーザーID
 */
export async function deleteAvatar(userId: string) {
  const supabase = await createClient();
  const path = generateAvatarPath(userId);

  const { error } = await supabase.storage.from("avatars").remove([path]);

  if (error) {
    console.error("Storageからのアバター削除に失敗しました:", error);
    throw new Error(`アバターの削除に失敗: ${error.message}`);
  }
}
