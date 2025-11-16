import { GoogleGenAI } from "@google/genai";
import { getFileSearchStoreId } from "@/lib/gemini/file-search";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SearchStreamRequest {
  query: string;
  conversationHistory?: Array<{ role: "user" | "model"; parts: string }>;
}

export async function POST(request: NextRequest) {
  try {
    const { query, conversationHistory }: SearchStreamRequest =
      await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY is not set" }),
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const storeId = getFileSearchStoreId();

    // 会話履歴を構築
    const contents: Array<{
      role: "user" | "model";
      parts: Array<{ text: string }>;
    }> = [];

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

    console.log("🔍 [DEBUG] File Search検索開始 (ストリーミング):", query);

    // ReadableStreamを作成
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // File Search APIで検索実行（ストリーミング）
          const response = await ai.models.generateContentStream({
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
            } as any,
          });

          let fullText = "";
          const postIds: string[] = [];
          const seenPostIds = new Set<string>();

          // ストリーミングレスポンスを処理
          for await (const chunk of response) {
            const chunkText = chunk.text || "";
            fullText += chunkText;

            // テキストチャンクを送信
            if (chunkText) {
              const data = JSON.stringify({
                type: "text",
                content: chunkText,
              });
              controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
            }

            // Grounding metadataから post_id を抽出
            const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
            if (groundingMetadata?.groundingChunks) {
              for (const gchunk of groundingMetadata.groundingChunks) {
                try {
                  const text = gchunk.retrievedContext?.text;
                  if (!text) continue;

                  const postIdMatch = text.match(/"post_id":\s*"([^"]+)"/);
                  if (postIdMatch && postIdMatch[1]) {
                    const postId = postIdMatch[1];
                    if (!seenPostIds.has(postId)) {
                      seenPostIds.add(postId);
                      postIds.push(postId);
                      console.log("📄 [DEBUG] Post ID抽出:", postId);
                    }
                  }
                } catch (error) {
                  console.error("⚠️ [DEBUG] チャンク処理エラー:", error);
                }
              }
            }
          }

          // 完了メッセージとpost_idを送信
          const completionData = JSON.stringify({
            type: "done",
            postIds: postIds,
            conversationId: `conv_${Date.now()}`,
          });
          controller.enqueue(
            new TextEncoder().encode(`data: ${completionData}\n\n`)
          );

          console.log("✅ [DEBUG] ストリーミング完了:", {
            postIds: postIds.length,
            textLength: fullText.length,
          });

          controller.close();
        } catch (error) {
          console.error("❌ ストリーミングエラー:", error);
          const errorData = JSON.stringify({
            type: "error",
            message: error instanceof Error ? error.message : "Unknown error",
          });
          controller.enqueue(
            new TextEncoder().encode(`data: ${errorData}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("❌ Search stream APIエラー:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
}
