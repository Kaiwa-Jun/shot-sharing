import { GoogleGenAI } from "@google/genai";
import { ExifData } from "@/lib/types/exif";
import { getFileSearchStoreId } from "./file-search";
import { generateCaption } from "./caption";

/**
 * File Search Storeに画像メタデータをアップロード
 * 画像そのものではなく、キャプション + Exif + 説明文をJSON形式で保存
 *
 * @param imageBuffer 画像のBuffer（キャプション生成に使用）
 * @param postId 投稿ID
 * @param exifData Exif情報
 * @param description 説明文
 * @param imageUrl 画像のURL
 * @returns アップロード結果
 */
export async function uploadPhotoToFileSearch(
  imageBuffer: Buffer,
  postId: string,
  exifData: ExifData,
  description: string,
  imageUrl: string
) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const storeId = getFileSearchStoreId();

  try {
    // 1. Gemini Vision でキャプション生成
    console.log("🎨 画像キャプションを生成中...");
    const caption = await generateCaption(imageBuffer);

    if (caption) {
      console.log(
        "✅ キャプション生成完了:",
        caption.substring(0, 100) + "..."
      );
    } else {
      console.log("⚠️ キャプション生成失敗（空文字）");
    }

    // 2. 検索用メタデータを作成
    const metadata = {
      post_id: postId,
      caption: caption,
      description: description || "",
      exif: {
        iso: exifData.iso ?? null,
        fValue: exifData.fValue ?? null,
        shutterSpeed: exifData.shutterSpeed ?? null,
        exposureCompensation: exifData.exposureCompensation ?? null,
        focalLength: exifData.focalLength ?? null,
        cameraMake: exifData.cameraMake ?? null,
        cameraModel: exifData.cameraModel ?? null,
      },
      image_url: imageUrl,
      created_at: new Date().toISOString(),
    };

    // 3. JSONテキストとして保存
    const jsonText = JSON.stringify(metadata, null, 2);
    const blob = new Blob([jsonText], { type: "text/plain" });

    console.log(`📤 File Search Storeにアップロード中: photo_${postId}.json`);

    // 4. File Search Storeにアップロード
    let operation = await ai.fileSearchStores.uploadToFileSearchStore({
      file: blob,
      fileSearchStoreName: storeId,
      config: {
        displayName: `photo_${postId}.json`,
        customMetadata: [
          { key: "post_id", stringValue: postId },
          { key: "content_type", stringValue: "photo_metadata" },
        ],
        // チャンキング設定を追加（検索パフォーマンス最適化）
        chunkingConfig: {
          whiteSpaceConfig: {
            maxTokensPerChunk: 150, // 小さなチャンクに分割（推奨: 100-200）
            maxOverlapTokens: 15, // 重複を最小限に（推奨: 10-20）
          },
        },
      },
    });

    // アップロード完了を待機
    let attempts = 0;
    const maxAttempts = 60; // 最大60秒待機

    while (!operation.done && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      operation = await ai.operations.get({ operation });
      attempts++;

      if (attempts % 5 === 0) {
        console.log(`⏳ アップロード処理中... (${attempts}秒経過)`);
      }
    }

    if (!operation.done) {
      throw new Error("アップロードがタイムアウトしました");
    }

    console.log("✅ File Search Storeへのアップロード完了");

    // デバッグ: 完了したoperationの構造を確認
    console.log("🔍 [DEBUG] 完了した操作オブジェクトの構造:");
    console.log("  - operation.name:", (operation as any).name);
    console.log("  - operation.done:", (operation as any).done);
    console.log(
      "  - operation.response:",
      JSON.stringify((operation as any).response, null, 2)
    );
    console.log(
      "  - operation.metadata:",
      JSON.stringify((operation as any).metadata, null, 2)
    );

    // アップロード完了後、ドキュメントIDを取得
    // 完了したoperationのresponse.documentNameに正しいドキュメントIDが含まれる
    const documentName = (operation as any).response?.documentName || null;

    if (!documentName) {
      console.error("❌ ドキュメント名の取得に失敗しました");
      console.log(
        "🔍 [DEBUG] 完了した操作オブジェクト全体:",
        JSON.stringify(operation, null, 2)
      );
      throw new Error(
        "File Search Storeへのアップロードは完了しましたが、ドキュメントIDの取得に失敗しました"
      );
    }

    console.log(`📁 ドキュメント名: ${documentName}`);

    return {
      success: true,
      fileName: documentName,
    };
  } catch (error) {
    console.error("File Search Storeへのアップロードに失敗:", error);
    throw new Error(
      `File Searchアップロード失敗: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
