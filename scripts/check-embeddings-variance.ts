/**
 * Embeddingの分散を確認するスクリプト
 * 全投稿のEmbeddingが同じになっていないかチェック
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log("🔍 Embeddingの分散を確認します...\n");

  // 全Embeddingを取得
  const { data, error } = await supabase
    .from("post_embeddings")
    .select("post_id, embedding")
    .limit(10);

  if (error || !data) {
    console.error("❌ Embedding取得エラー:", error);
    return;
  }

  console.log(`📊 取得したEmbedding数: ${data.length}件\n`);

  // 各Embeddingの最初の10要素を表示
  for (const row of data) {
    const embedding = JSON.parse(row.embedding as string);
    const first10 = embedding.slice(0, 10).map((v: number) => v.toFixed(4));
    console.log(`Post ID: ${row.post_id.substring(0, 8)}...`);
    console.log(`  First 10 values: [${first10.join(", ")}]`);
    console.log(`  Vector length: ${embedding.length}`);
    console.log();
  }

  // 2つのEmbedding間のコサイン類似度を計算
  if (data.length >= 2) {
    const emb1 = JSON.parse(data[0].embedding as string);
    const emb2 = JSON.parse(data[1].embedding as string);

    const dotProduct = emb1.reduce(
      (sum: number, val: number, i: number) => sum + val * emb2[i],
      0
    );
    const magnitude1 = Math.sqrt(
      emb1.reduce((sum: number, val: number) => sum + val * val, 0)
    );
    const magnitude2 = Math.sqrt(
      emb2.reduce((sum: number, val: number) => sum + val * val, 0)
    );
    const cosineSimilarity = dotProduct / (magnitude1 * magnitude2);

    console.log("\n📏 最初の2つのEmbedding間の類似度:");
    console.log(`  Post 1: ${data[0].post_id.substring(0, 8)}...`);
    console.log(`  Post 2: ${data[1].post_id.substring(0, 8)}...`);
    console.log(`  Cosine Similarity: ${cosineSimilarity.toFixed(6)}`);
  }
}

main().catch(console.error);
