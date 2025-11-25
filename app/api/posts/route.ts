import { NextRequest, NextResponse } from "next/server";
import { getPosts } from "@/app/actions/posts";

/**
 * 投稿一覧取得API（無限スクロール用）
 * POST /api/posts
 * Request Body: { limit: number, offset: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { limit = 20, offset = 0 } = body;

    // バリデーション
    if (typeof limit !== "number" || limit <= 0 || limit > 100) {
      return NextResponse.json(
        { data: null, error: "limit は 1 から 100 の間で指定してください" },
        { status: 400 }
      );
    }

    if (typeof offset !== "number" || offset < 0) {
      return NextResponse.json(
        { data: null, error: "offset は 0 以上で指定してください" },
        { status: 400 }
      );
    }

    // Server Action を呼び出し
    const { data: posts, error } = await getPosts(limit, offset);

    if (error) {
      return NextResponse.json({ data: null, error }, { status: 500 });
    }

    // PhotoCardProps形式のデータを作成
    const photos = posts?.map((post) => ({
      id: post.id,
      imageUrl: post.imageUrl,
      exifData: post.exifData || undefined,
    }));

    return NextResponse.json({ data: photos, error: null });
  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json(
      { data: null, error: "予期しないエラーが発生しました" },
      { status: 500 }
    );
  }
}
