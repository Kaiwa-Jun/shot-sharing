/**
 * Embedding-based類似検索のテストスクリプト
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
  console.log("🧪 Embedding-based類似検索テスト\n");

  // テスト対象の投稿を取得（桜の投稿）
  const { data: posts } = await supabase
    .from("posts")
    .select("id, description")
    .eq("visibility", "public")
    .ilike("description", "%桜%")
    .limit(1);

  if (!posts || posts.length === 0) {
    console.error("❌ テスト対象の投稿が見つかりません");
    return;
  }

  const testPost = posts[0];
  console.log(`📝 テスト投稿ID: ${testPost.id.substring(0, 8)}...`);
  console.log(`📝 Description: ${testPost.description}\n`);

  // Embeddingを取得
  const { data: embeddingData } = await supabase
    .from("post_embeddings")
    .select("embedding")
    .eq("post_id", testPost.id)
    .single();

  if (!embeddingData) {
    console.error("❌ Embeddingが見つかりません");
    return;
  }

  const embedding = JSON.parse(embeddingData.embedding as string);
  console.log(`✅ Embedding取得完了: ${embedding.length}次元`);
  console.log(
    `📊 First 5 values: [${embedding
      .slice(0, 5)
      .map((v: number) => v.toFixed(4))
      .join(", ")}]\n`
  );

  // 類似検索を実行
  console.log("🔍 類似検索を実行中...\n");
  const { data: similarPosts, error } = await supabase.rpc(
    "search_similar_posts",
    {
      query_embedding: `[${embedding.join(",")}]`,
      match_threshold: 0.5,
      match_count: 5,
    }
  );

  if (error) {
    console.error("❌ 類似検索エラー:", error);
    return;
  }

  if (!similarPosts || similarPosts.length === 0) {
    console.log("⚠️ 類似投稿が見つかりませんでした");
    return;
  }

  console.log(`✅ 類似投稿: ${similarPosts.length}件\n`);

  // 類似投稿の詳細を取得
  for (let i = 0; i < similarPosts.length; i++) {
    const similar = similarPosts[i];
    const { data: post } = await supabase
      .from("posts")
      .select("id, description")
      .eq("id", similar.post_id)
      .single();

    if (post) {
      console.log(
        `${i + 1}. [${(similar.similarity * 100).toFixed(1)}%] ${post.description?.substring(0, 60)}...`
      );
    }
  }
}

main().catch(console.error);
