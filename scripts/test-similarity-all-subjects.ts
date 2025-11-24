/**
 * 複数の被写体で類似検索をテストするスクリプト
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

async function testSubject(subject: string) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`🧪 被写体: ${subject}\n`);

  // テスト対象の投稿を取得
  const { data: posts } = await supabase
    .from("posts")
    .select("id, description")
    .eq("visibility", "public")
    .ilike("description", `%${subject}%`)
    .limit(1);

  if (!posts || posts.length === 0) {
    console.log(`⚠️ ${subject}の投稿が見つかりませんでした`);
    return;
  }

  const testPost = posts[0];
  console.log(`📝 テスト投稿: ${testPost.description?.substring(0, 60)}...\n`);

  // Embeddingを取得
  const { data: embeddingData } = await supabase
    .from("post_embeddings")
    .select("embedding")
    .eq("post_id", testPost.id)
    .single();

  if (!embeddingData) {
    console.log("❌ Embeddingが見つかりません");
    return;
  }

  const embedding = JSON.parse(embeddingData.embedding as string);

  // 類似検索を実行（閾値0.85で精度向上）
  const { data: similarPosts, error } = await supabase.rpc(
    "search_similar_posts",
    {
      query_embedding: `[${embedding.join(",")}]`,
      match_threshold: 0.85,
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
      .select("description")
      .eq("id", similar.post_id)
      .single();

    if (post) {
      const desc = post.description?.substring(0, 50) || "説明なし";
      console.log(
        `${i + 1}. [${(similar.similarity * 100).toFixed(1)}%] ${desc}...`
      );
    }
  }
}

async function main() {
  console.log("🧪 複数被写体での類似検索テスト");

  // 各被写体でテスト
  await testSubject("桜");
  await testSubject("風鈴");
  await testSubject("紫陽花");
  await testSubject("花火");
  await testSubject("クラゲ");
}

main().catch(console.error);
