"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * ユーザーが投稿を保存しているかチェック
 */
export async function checkIsSaved(
  postId: string
): Promise<{ data: boolean; error: string | null }> {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      // 未認証の場合は false を返す（エラーではない）
      return { data: false, error: null };
    }

    // 保存されているかチェック
    const { data, error } = await supabase
      .from("saves")
      .select("id")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .maybeSingle();

    if (error) {
      console.error("Error checking save:", error);
      return { data: false, error: error.message };
    }

    return { data: !!data, error: null };
  } catch (err) {
    console.error("Unexpected error checking save:", err);
    return { data: false, error: "予期しないエラーが発生しました" };
  }
}
