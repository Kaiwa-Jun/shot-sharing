import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // リクエストボディからpostIdを取得
    const { postId } = await request.json();

    if (!postId) {
      return NextResponse.json({ error: "postIdが必要です" }, { status: 400 });
    }

    // すでに保存されているかチェック
    const { data: existingSave, error: checkError } = await supabase
      .from("saves")
      .select("*")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking save:", checkError);
      return NextResponse.json(
        { error: "保存状態の確認に失敗しました" },
        { status: 500 }
      );
    }

    if (existingSave) {
      // 既に保存されている場合は削除
      const { error: deleteError } = await supabase
        .from("saves")
        .delete()
        .eq("id", existingSave.id);

      if (deleteError) {
        console.error("Error deleting save:", deleteError);
        return NextResponse.json(
          { error: "保存の解除に失敗しました" },
          { status: 500 }
        );
      }

      // キャッシュを無効化
      revalidateTag("saves", "default");
      return NextResponse.json({ saved: false });
    } else {
      // 保存されていない場合は追加
      const { error: insertError } = await supabase.from("saves").insert({
        user_id: user.id,
        post_id: postId,
      });

      if (insertError) {
        console.error("Error inserting save:", insertError);
        return NextResponse.json(
          { error: "保存に失敗しました" },
          { status: 500 }
        );
      }

      // キャッシュを無効化
      revalidateTag("saves", "default");
      return NextResponse.json({ saved: true });
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "予期しないエラーが発生しました" },
      { status: 500 }
    );
  }
}
