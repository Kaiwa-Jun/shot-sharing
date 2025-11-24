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
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: imageBuffer.toString("base64"),
          },
        },
        `この写真の内容を詳しく説明してください。
以下の観点で、具体的で特徴的な表現を使って説明してください：

1. メインの被写体（何が写っているか）
2. 被写体の状態や特徴（色、形、質感、動き、表情など）
3. 撮影シーン（場所、環境、季節、時間帯など）
4. 写真全体の雰囲気や印象

【重要】
- 被写体を具体的に特定する（例：「花」ではなく「桜」「紫陽花」）
- 被写体固有の特徴を詳しく記述する
- 「明るい」「鮮やか」「綺麗」などの汎用的な形容詞は避ける
- 2-3文程度の自然な日本語文章で記述

【良い例】
満開の桜が枝いっぱいに咲いている。淡いピンク色の花びらが青空に映え、春の訪れを感じさせる柔らかな光が差し込んでいる。
ガラスの風鈴が軒先に吊るされている。透明な本体に涼やかな音色を想起させる金属の舌が見え、夏の風物詩を感じさせる涼しげな雰囲気。
海辺で波打ち際を歩く人のシルエット。夕暮れ時のオレンジ色の空が水面に反射し、静かで穏やかな時間が流れている。

【悪い例】
桜 桜 桜 満開 ピンク 青空 春 柔らか（キーワード羅列）
綺麗な花が咲いている明るい写真（被写体が不明確、汎用的）

説明文のみを出力してください（前置きや「この写真は」などは不要）。`,
      ],
    });

    const caption = response.text || "";
    return caption;
  } catch (error) {
    console.error("❌ キャプション生成に失敗しました:", error);
    // エラーが発生しても投稿処理は続行
    return "";
  }
}
