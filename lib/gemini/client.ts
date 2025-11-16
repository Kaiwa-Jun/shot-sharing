import { GoogleGenAI } from "@google/genai";

/**
 * Gemini AI クライアントの初期化
 */
function getGenAI() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
  }
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
}

/**
 * Gemini モデルを取得
 * @param modelName モデル名（デフォルト: gemini-2.5-flash）
 */
export function getGeminiModel(
  modelName:
    | "gemini-1.5-flash"
    | "gemini-1.5-pro"
    | "gemini-2.0-flash-exp"
    | "gemini-2.5-flash" = "gemini-2.5-flash"
) {
  const genAI = getGenAI();
  return genAI.models.get({ model: modelName });
}

/**
 * テキスト生成（シンプル版）
 */
export async function generateText(prompt: string) {
  const genAI = getGenAI();
  const response = await genAI.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });
  return response.text;
}

/**
 * チャット形式での対話
 * TODO: 新SDKでのチャット機能実装（Phase 4で対応）
 */
export async function startChat(
  history?: Array<{ role: string; parts: string }>
) {
  const genAI = getGenAI();
  // 新SDKではチャット機能の実装方法が異なるため、Phase 4で実装予定
  throw new Error("チャット機能は現在実装中です（Phase 4で対応）");

  // 旧実装（参考）
  // const model = await genAI.models.get({ model: "gemini-2.5-flash" });
  // return model.startChat({
  //   history: history?.map((msg) => ({
  //     role: msg.role,
  //     parts: [{ text: msg.parts }],
  //   })),
  // });
}

/**
 * Gemini AIクライアントを取得（File Search用）
 */
export function getGeminiClient() {
  return getGenAI();
}
