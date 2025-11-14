import { checkIsSaved } from "@/app/actions/saves";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get("postId");

  if (!postId) {
    return NextResponse.json({ error: "postIdが必要です" }, { status: 400 });
  }

  const { data: saved, error } = await checkIsSaved(postId);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ saved });
}
