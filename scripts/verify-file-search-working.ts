import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { getFileSearchStoreId } from "../lib/gemini/file-search";

dotenv.config({ path: ".env.local" });

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * File Search Storeのドキュメントが正しく検索可能かを確認
 * ai.files.get()ではなく、実際のFile Search APIで検証する
 */
async function verifyFileSearchWorking() {
  console.log("🔍 File Search Store の動作確認\n");

  const FILE_SEARCH_STORE_ID = getFileSearchStoreId();
  console.log(`📁 File Search Store ID: ${FILE_SEARCH_STORE_ID}\n`);

  // DBから投稿を取得（説明文があるもの優先）
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, description, file_search_store_id")
    .not("description", "is", null)
    .limit(3);

  if (error || !posts || posts.length === 0) {
    console.error("❌ DBエラー:", error);
    return;
  }

  console.log(`📊 ${posts.length}件の投稿で検索テスト\n`);

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const query = post.description || "写真";

    console.log(`\n[${i + 1}/${posts.length}] テスト`);
    console.log(`  投稿ID: ${post.id}`);
    console.log(`  ドキュメント: ${post.file_search_store_id}`);
    console.log(`  検索クエリ: "${query}"`);

    try {
      // File Search APIで実際に検索（既存実装と同じ形式）
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user" as const,
            parts: [{ text: query }],
          },
        ],
        config: {
          tools: [
            {
              fileSearch: {
                fileSearchStoreNames: [FILE_SEARCH_STORE_ID],
              },
            },
          ],
        } as any,
      });

      // Grounding Metadataをチェック（既存実装と同じ方法）
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

      if (groundingMetadata?.groundingChunks) {
        console.log(`  ✅ File Search動作確認！`);
        console.log(
          `     検索結果: ${groundingMetadata.groundingChunks.length}件のチャンク`
        );

        // post_idを抽出してドキュメントを特定
        const postIds = new Set<string>();
        for (const chunk of groundingMetadata.groundingChunks) {
          try {
            const text = chunk.retrievedContext?.text;
            if (!text) continue;

            const postIdMatch = text.match(/"post_id":\s*"([^"]+)"/);
            if (postIdMatch && postIdMatch[1]) {
              postIds.add(postIdMatch[1]);
            }
          } catch (e) {
            // ignore
          }
        }

        console.log(`     ドキュメント数: ${postIds.size}件`);

        // 自分自身が含まれているか確認
        if (postIds.has(post.id)) {
          console.log(`  🎯 自分自身のドキュメントが検索結果に含まれています`);
        } else {
          console.log(`  ℹ️  他のドキュメントのみヒット（自分自身は含まれず）`);
        }

        // post_idのリストを表示
        const postIdArray = Array.from(postIds);
        postIdArray.forEach((id, idx) => {
          const isSelf = id === post.id;
          console.log(`     [${idx + 1}] ${id}${isSelf ? " (←自分自身)" : ""}`);
        });
      } else {
        console.log(`  ❌ Grounding Metadataなし（検索結果0件）`);
      }
    } catch (error: any) {
      console.log(`  ❌ 検索エラー: ${error.message}`);
    }

    // Rate Limit考慮
    if (i < posts.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("\n✅ 検証完了");
  console.log(
    "\n💡 結論: Grounding Metadataが返ってくれば、File Search Storeは正常に動作しています"
  );
  console.log(
    "   ai.files.get()で404が返るのは正常（File Search StoreはFiles APIとは別）"
  );
}

verifyFileSearchWorking();
