import { GoogleGenAI } from "@google/genai";
import { ExifData } from "@/lib/types/exif";
import { getFileSearchStoreId } from "./file-search";

/**
 * File Search Storeに画像とメタデータをアップロード
 * @param imageBuffer 画像のBuffer
 * @param postId 投稿ID
 * @param exifData Exif情報
 * @param description 説明文
 * @returns アップロード結果
 */
export async function uploadPhotoToFileSearch(
  imageBuffer: Buffer,
  postId: string,
  exifData: ExifData,
  description: string
) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const storeId = getFileSearchStoreId();

  try {
    // カスタムメタデータの準備（文字列として保存）
    const customMetadata = [
      { key: "post_id", stringValue: postId },
      { key: "description", stringValue: description || "" },
    ];

    // Exif情報をメタデータに追加（すべて文字列として保存）
    if (exifData.iso) {
      customMetadata.push({ key: "iso", stringValue: String(exifData.iso) });
    }
    if (exifData.f_value) {
      customMetadata.push({
        key: "f_value",
        stringValue: String(exifData.f_value),
      });
    }
    if (exifData.shutter_speed) {
      customMetadata.push({
        key: "shutter_speed",
        stringValue: exifData.shutter_speed,
      });
    }
    if (exifData.exposure_compensation) {
      customMetadata.push({
        key: "exposure_compensation",
        stringValue: String(exifData.exposure_compensation),
      });
    }
    if (exifData.focal_length) {
      customMetadata.push({
        key: "focal_length",
        stringValue: String(exifData.focal_length),
      });
    }
    if (exifData.camera_make) {
      customMetadata.push({
        key: "camera_make",
        stringValue: exifData.camera_make,
      });
    }
    if (exifData.camera_model) {
      customMetadata.push({
        key: "camera_model",
        stringValue: exifData.camera_model,
      });
    }

    console.log(`📤 File Search Storeにアップロード中: photo_${postId}.jpg`);

    // BufferをUint8Array経由でBlobに変換
    const uint8Array = new Uint8Array(imageBuffer);
    const blob = new Blob([uint8Array], { type: "image/jpeg" });

    // 画像をFile Search Storeにアップロード
    let operation = await ai.fileSearchStores.uploadToFileSearchStore({
      file: blob,
      fileSearchStoreName: storeId,
      config: {
        displayName: `photo_${postId}.jpg`,
        customMetadata,
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

    return {
      success: true,
      fileName: operation.name || null,
    };
  } catch (error) {
    console.error("File Search Storeへのアップロードに失敗:", error);
    throw new Error(
      `File Searchアップロード失敗: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
