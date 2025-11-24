import { getGeminiClient } from "./client";
import { generateCaption } from "./caption";

/**
 * 画像からEmbeddingを生成
 * ステップ:
 * 1. Gemini Proで画像からテキスト説明を生成
 * 2. テキスト説明からEmbeddingを生成
 *
 * @param imageBuffer 画像のBuffer
 * @param mimeType 画像のMIMEタイプ（例: "image/jpeg", "image/png"）
 * @returns 768次元のEmbeddingベクトル
 */
export async function generateImageEmbedding(
  imageBuffer: Buffer,
  mimeType: string
): Promise<number[]> {
  try {
    // 1. 画像からテキスト説明を生成
    const description = await generateCaption(imageBuffer);

    if (!description) {
      throw new Error("画像説明の生成に失敗しました");
    }

    // 2. テキスト説明からEmbeddingを生成
    return await generateTextEmbedding(description);
  } catch (error) {
    console.error("❌ Embedding生成エラー:", error);
    throw new Error(
      `Embedding生成に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`
    );
  }
}

/**
 * テキストからEmbeddingを生成
 * @param text テキスト
 * @returns 768次元のEmbeddingベクトル
 */
export async function generateTextEmbedding(text: string): Promise<number[]> {
  try {
    const genAI = getGeminiClient();

    const response = await genAI.models.embedContent({
      model: "gemini-embedding-001", // 最新の推奨モデル
      contents: text, // @google/genaiではcontents（複数形）
      config: {
        taskType: "SEMANTIC_SIMILARITY", // 類似度検索用
        outputDimensionality: 1536, // IVFFlatインデックスの制限（2000次元）に対応
      },
    });

    if (!response.embeddings || response.embeddings.length === 0) {
      throw new Error("Embedding生成に失敗しました: 空のレスポンス");
    }

    const embedding = response.embeddings[0].values;

    if (!embedding) {
      throw new Error("Embedding値が取得できませんでした");
    }

    return embedding;
  } catch (error) {
    console.error("❌ Embedding生成エラー:", error);
    throw new Error(
      `Embedding生成に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`
    );
  }
}

/**
 * Embeddingベクトルを文字列形式に変換（PostgreSQL vector型用）
 * @param embedding Embeddingベクトル
 * @returns "[0.1, 0.2, ...]" 形式の文字列
 */
export function embeddingToString(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

/**
 * 文字列形式のEmbeddingをnumber[]に変換
 * @param embeddingString "[0.1, 0.2, ...]" 形式の文字列
 * @returns Embeddingベクトル
 */
export function stringToEmbedding(embeddingString: string): number[] {
  return JSON.parse(embeddingString);
}
