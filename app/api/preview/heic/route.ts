import { NextRequest, NextResponse } from "next/server";
import { convertHeicToJpeg } from "@/lib/image/heic-converter";
import { isHeic } from "@/lib/image/detect-format";

/**
 * HEICファイルをJPEGに変換してプレビュー用に返す
 * POST /api/preview/heic
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "ファイルが指定されていません" },
        { status: 400 }
      );
    }

    // ファイルサイズ制限（10MB）
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "ファイルサイズが大きすぎます（10MB以下）" },
        { status: 400 }
      );
    }

    // ArrayBufferに変換
    const arrayBuffer = await file.arrayBuffer();

    // HEIC判定
    if (!isHeic(arrayBuffer)) {
      return NextResponse.json(
        { error: "HEICファイルではありません" },
        { status: 400 }
      );
    }

    // HEIC→JPEG変換
    const buffer = Buffer.from(arrayBuffer);
    const jpegBuffer = await convertHeicToJpeg(buffer, 0.7); // プレビュー用なので品質を下げる

    // JPEGをBase64で返す（プレビュー表示用）
    const base64 = jpegBuffer.toString("base64");
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    return NextResponse.json({ dataUrl });
  } catch (error) {
    console.error("HEICプレビュー変換エラー:", error);
    return NextResponse.json({ error: "変換に失敗しました" }, { status: 500 });
  }
}
