/**
 * 生成されたキャプションとEmbeddingを確認するスクリプト
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
  console.log("📝 生成されたキャプションを確認します...\n");

  // 全投稿のdescriptionとEmbeddingを取得
  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("id, description")
    .order("created_at", { ascending: false })
    .limit(10);

  if (postsError || !posts) {
    console.error("❌ 投稿取得エラー:", postsError);
    return;
  }

  for (const post of posts) {
    console.log(`\n投稿ID: ${post.id.substring(0, 8)}...`);
    console.log(`キャプション: ${post.description?.substring(0, 150)}...`);

    // 対応するEmbeddingを取得
    const { data: embedding } = await supabase
      .from("post_embeddings")
      .select("embedding")
      .eq("post_id", post.id)
      .single();

    if (embedding) {
      const vec = JSON.parse(embedding.embedding as string);
      const first5 = vec.slice(0, 5).map((v: number) => v.toFixed(4));
      console.log(`Embedding (最初の5要素): [${first5.join(", ")}]`);
    } else {
      console.log("⚠️ Embeddingなし");
    }
  }
}

main().catch(console.error);
