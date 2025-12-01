import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/app/actions/profiles";
import { getUserPostsCount, getUserSavedPostsCount } from "@/app/actions/posts";

/**
 * プロフィール情報取得API
 * GET /api/users/me/profile
 * Response: { data: { profile, postsCount, savedCount }, error: null }
 */
export async function GET() {
  try {
    // 認証チェック
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { data: null, error: "認証が必要です" },
        { status: 401 }
      );
    }

    // プロフィールと統計情報を並行取得
    const [profileResult, postsCountResult, savedCountResult] =
      await Promise.all([
        getCurrentUserProfile(),
        getUserPostsCount(user.id),
        getUserSavedPostsCount(user.id),
      ]);

    return NextResponse.json({
      data: {
        profile: profileResult.profile,
        postsCount: postsCountResult.data || 0,
        savedCount: savedCountResult.data || 0,
        userId: user.id,
      },
      error: null,
    });
  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json(
      { data: null, error: "予期しないエラーが発生しました" },
      { status: 500 }
    );
  }
}
