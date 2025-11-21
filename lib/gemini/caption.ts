import { GoogleGenAI } from "@google/genai";

/**
 * 画像からキャプションを生成
 * Gemini Vision APIを使用して、画像の内容を説明するテキストを自動生成します
 *
 * @param imageBuffer 画像のBuffer
 * @returns 生成されたキャプション（日本語）
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
        `この写真について、日本語で詳しく説明してください。以下の点に注目してください：

1. **被写体**: 何が写っているか（人物、風景、物体など）
2. **構図**: どのような配置やバランスか
3. **光と色**: 照明の雰囲気、色調、明暗
4. **雰囲気・印象**: 写真から感じる感情や雰囲気
5. **撮影シーン**: 季節、時間帯、場所の特徴（推測できる範囲で）
6. **撮影技法**: ボケ、パース、アングルなどの特徴的な技法

検索に役立つよう、具体的で詳細な説明をお願いします。`,
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
