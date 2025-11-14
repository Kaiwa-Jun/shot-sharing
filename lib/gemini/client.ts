import { GoogleGenerativeAI } from "@google/generative-ai";

// Gemini AI クライアントの初期化（ランタイムでチェック）
function getGenAI() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

/**
 * Gemini モデルを取得
 * @param modelName モデル名（デフォルト: gemini-2.0-flash-exp）
 */
export function getGeminiModel(
  modelName:
    | "gemini-1.5-flash"
    | "gemini-1.5-pro"
    | "gemini-2.0-flash-exp" = "gemini-2.0-flash-exp"
) {
  const genAI = getGenAI();
  return genAI.getGenerativeModel({ model: modelName });
}

/**
 * テキスト生成（シンプル版）
 */
export async function generateText(prompt: string) {
  const model = getGeminiModel();
  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text();
}

/**
 * チャット形式での対話
 */
export function startChat(history?: Array<{ role: string; parts: string }>) {
  const model = getGeminiModel();
  return model.startChat({
    history: history?.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.parts }],
    })),
  });
}
