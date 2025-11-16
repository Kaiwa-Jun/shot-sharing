import { GoogleGenAI } from "@google/genai";
import { getFileSearchStoreId } from "./file-search";

export interface SearchResult {
  postIds: string[];
  aiResponse: string;
  conversationId: string;
}

/**
 * File Search APIを使って検索を実行
 * @param query 検索クエリ
 * @param conversationHistory 会話履歴（会話を継続する場合）
 * @returns 検索結果とAI回答
 */
export async function searchWithFileSearch(
  query: string,
  conversationHistory?: Array<{ role: "user" | "model"; parts: string }>
): Promise<SearchResult> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const storeId = getFileSearchStoreId();

  try {
    console.log("🔍 [DEBUG] File Search検索開始:", query);

    // 会話履歴を構築
    const contents = [];

    // 過去の会話履歴を追加
    if (conversationHistory && conversationHistory.length > 0) {
      for (const message of conversationHistory) {
        contents.push({
          role: message.role,
          parts: [{ text: message.parts }],
        });
      }
    }

    // 現在のクエリを追加
    contents.push({
      role: "user" as const,
      parts: [{ text: query }],
    });

    // File Search APIで検索実行（File Searchツールを有効化）
    // Note: File Searchはgemini-2.5-flashでサポートされている
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        tools: [
          {
            fileSearch: {
              fileSearchStoreNames: [storeId],
            },
          },
        ],
      } as any, // 型エラー回避のため一時的にany
    });

    const aiResponse =
      response.text || "申し訳ございません。回答を生成できませんでした。";

    console.log(
      "✅ [DEBUG] AI回答生成完了:",
      aiResponse.substring(0, 100) + "..."
    );

    // Grounding metadataから検索に使用されたファイルのpost_idを抽出
    const postIds: string[] = [];
    const seenPostIds = new Set<string>(); // 重複を避けるため

    try {
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

      if (groundingMetadata) {
        console.log("🔍 [DEBUG] Grounding metadata検出");

        // groundingChunks から post_id を抽出
        if (groundingMetadata.groundingChunks) {
          for (const chunk of groundingMetadata.groundingChunks) {
            try {
              // retrievedContext.text に JSON形式でデータが含まれている
              const text = chunk.retrievedContext?.text;
              if (!text) continue;

              // JSONを抽出（テキストの中にJSONが含まれている可能性がある）
              // "post_id": "xxx" のパターンを探す
              const postIdMatch = text.match(/"post_id":\s*"([^"]+)"/);
              if (postIdMatch && postIdMatch[1]) {
                const postId = postIdMatch[1];
                if (!seenPostIds.has(postId)) {
                  seenPostIds.add(postId);
                  postIds.push(postId);
                  console.log("📄 [DEBUG] Post ID抽出:", postId);
                }
              }
            } catch (chunkError) {
              console.error("⚠️ [DEBUG] チャンク処理エラー:", chunkError);
            }
          }
        }

        console.log("✅ [DEBUG] 抽出されたPost ID数:", postIds.length);
      } else {
        console.log("⚠️ [DEBUG] Grounding metadataが見つかりませんでした");
      }
    } catch (error) {
      console.error("❌ [DEBUG] Grounding metadata抽出エラー:", error);
    }

    // 会話IDを生成（現在の実装ではクエリのハッシュを使用）
    const conversationId = `conv_${Date.now()}`;

    console.log("📤 [DEBUG] 検索結果:", {
      postIds: postIds.length,
      conversationId,
    });

    return {
      postIds,
      aiResponse,
      conversationId,
    };
  } catch (error) {
    console.error("❌ File Search検索に失敗しました:", error);
    throw new Error(
      `File Search検索失敗: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
