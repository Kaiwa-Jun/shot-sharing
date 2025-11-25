import { getPostById } from "@/app/actions/posts";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await getPostById(id);

  if (error || !data) {
    return NextResponse.json(
      { error: error || "投稿が見つかりません" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}
