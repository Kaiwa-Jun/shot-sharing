import { GoogleGenAI } from "@google/genai";

/**
 * 画像からキャプションを生成
 * Gemini Vision APIを使用して、画像の内容を説明するテキストを自動生成します
 *
 * @param imageBuffer 画像のBuffer
 * @returns 生成されたキャプション（英語）
 */
export async function generateCaption(imageBuffer: Buffer): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY が設定されていません");
    return "";
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  try {
    console.log("🎨 [DEBUG] Gemini Vision でキャプション生成開始");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: imageBuffer.toString("base64"),
          },
        },
        "Describe this photo in detail. Focus on the main subject, composition, lighting, and mood. Be specific and descriptive.",
      ],
    });

    const caption = response.text || "";
    console.log(
      "✅ [DEBUG] キャプション生成完了:",
      caption.substring(0, 100) + "..."
    );

    return caption;
  } catch (error) {
    console.error("❌ キャプション生成に失敗しました:", error);
    // エラーが発生しても投稿処理は続行
    return "";
  }
}
