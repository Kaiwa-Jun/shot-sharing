/**
 * 既存のEmbeddingをすべて削除するスクリプト
 *
 * 使い方:
 * npx tsx scripts/clear-embeddings.ts
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// .env.localを読み込み
config({ path: ".env.local" });

// 環境変数の読み込み
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
}

// Supabaseクライアントの作成（Service Roleキーを使用）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * メイン処理
 */
async function main() {
  console.log("🗑️  既存のEmbeddingを削除します...");

  // post_embeddingsテーブルのすべてのレコードを削除
  const { error } = await supabase
    .from("post_embeddings")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // すべてのレコードを削除

  if (error) {
    console.error("❌ 削除に失敗:", error);
    process.exit(1);
  }

  console.log("✅ すべてのEmbeddingを削除しました");
}

// スクリプト実行
main().catch((error) => {
  console.error("❌ エラーが発生しました:", error);
  process.exit(1);
});
