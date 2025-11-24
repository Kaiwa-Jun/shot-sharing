import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyDocuments() {
  console.log("🔍 ドキュメントの存在確認\n");

  // DBから5件の投稿を取得
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, file_search_store_id, description")
    .limit(5);

  if (error || !posts) {
    console.error("❌ DBエラー:", error);
    return;
  }

  console.log(`📊 ${posts.length}件の投稿を確認\n`);

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(`\n[${i + 1}/${posts.length}] ${post.description || post.id}`);
    console.log(`  file_search_store_id: ${post.file_search_store_id}`);

    try {
      // Gemini Files APIでドキュメント取得を試みる
      const fileResponse = await ai.files.get({
        name: post.file_search_store_id,
      });

      console.log(`  ✅ ドキュメント存在確認`);
      console.log(
        `    - Display Name: ${fileResponse.displayName || "(なし)"}`
      );
      console.log(`    - MIME Type: ${fileResponse.mimeType}`);
      console.log(`    - Size: ${fileResponse.sizeBytes || "不明"} bytes`);
      console.log(`    - State: ${fileResponse.state}`);
      console.log(`    - Create Time: ${fileResponse.createTime}`);

      // stateを確認
      if (fileResponse.state === "ACTIVE") {
        console.log(`    ✅ ステータス: ACTIVE（検索可能）`);
      } else {
        console.log(
          `    ⚠️ ステータス: ${fileResponse.state}（検索不可の可能性）`
        );
      }
    } catch (error: any) {
      console.log(`  ❌ ドキュメントが見つかりません`);
      console.log(`    エラー: ${error.message}`);
    }

    // Rate Limitを考慮
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log("\n" + "=".repeat(80));
  console.log("\n✅ 確認完了");
}

verifyDocuments();
