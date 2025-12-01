"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  uploadAvatarToStorage,
  getAvatarPublicUrl,
} from "@/lib/supabase/storage";
import { createThumbnail } from "@/lib/image/resize";

/**
 * 全てのプロフィールを取得（テスト用）
 */
export async function getAllProfiles() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching profiles:", error);
    return { profiles: [], error: error.message };
  }

  return { profiles: data, error: null };
}

/**
 * 現在ログイン中のユーザーのプロフィールを取得
 */
export async function getCurrentUserProfile() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { profile: null, error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Error fetching current user profile:", error);
    return { profile: null, error: error.message };
  }

  return { profile: data, error: null };
}

/**
 * プロフィール数をカウント（テスト用）
 */
export async function getProfilesCount() {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Error counting profiles:", error);
    return { count: 0, error: error.message };
  }

  return { count, error: null };
}

/**
 * プロフィールを更新
 */
export async function updateProfile(formData: FormData) {
  const supabase = await createClient();

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("認証が必要です");
  }

  try {
    // フォームデータの取得
    const displayName = formData.get("display_name") as string;
    const bio = formData.get("bio") as string;
    const avatarFile = formData.get("avatar") as File | null;

    // バリデーション
    if (!displayName || displayName.trim() === "") {
      throw new Error("表示名は必須です");
    }

    if (displayName.length > 50) {
      throw new Error("表示名は50文字以内で入力してください");
    }

    if (bio && bio.length > 500) {
      throw new Error("自己紹介は500文字以内で入力してください");
    }

    // アバター画像のアップロード処理
    let avatarUrl: string | undefined;

    if (avatarFile && avatarFile.size > 0) {
      console.log("🖼️ アバター画像をアップロード中...");

      // 画像をBufferに変換
      const imageBuffer = Buffer.from(await avatarFile.arrayBuffer());

      // サムネイル生成（リサイズ）
      const resizedBuffer = await createThumbnail(imageBuffer);

      // Supabase Storageにアップロード
      await uploadAvatarToStorage(resizedBuffer, user.id, avatarFile.type);

      // パブリックURLを取得
      avatarUrl = await getAvatarPublicUrl(user.id);
    }

    // DBの更新内容を構築
    const updateData: {
      display_name: string;
      bio: string;
      avatar_url?: string;
      updated_at: string;
    } = {
      display_name: displayName.trim(),
      bio: bio.trim(),
      updated_at: new Date().toISOString(),
    };

    if (avatarUrl) {
      updateData.avatar_url = avatarUrl;
    }

    // プロフィール情報を更新
    const { error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (updateError) {
      console.error("プロフィールの更新に失敗しました:", updateError);
      throw new Error("プロフィールの更新に失敗しました");
    }

    // キャッシュをクリア
    revalidatePath("/me");
    revalidateTag("profile", "default"); // プロフィールキャッシュを無効化

    return { success: true, error: null };
  } catch (error) {
    console.error("プロフィール更新エラー:", error);
    const message =
      error instanceof Error ? error.message : "予期しないエラーが発生しました";
    return { success: false, error: message };
  }
}
