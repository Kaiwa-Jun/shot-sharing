/**
 * 既存投稿のEmbedding一括生成スクリプト
 *
 * 使い方:
 * npx tsx scripts/generate-embeddings-batch.ts
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { generateImageEmbedding } from "../lib/gemini/embedding";

// .env.localを読み込み
config({ path: ".env.local" });

// 環境変数の読み込み
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
}
if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set");
}

// Supabaseクライアントの作成（Service Roleキーを使用）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * 画像URLからBufferを取得
 */
async function fetchImageBuffer(imageUrl: string): Promise<Buffer> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`画像の取得に失敗: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * メイン処理
 */
async function main() {
  console.log("🚀 Embedding一括生成を開始します...");

  // 1. Embeddingが未生成の投稿を取得
  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("id, image_url")
    .eq("visibility", "public")
    .order("created_at", { ascending: false });

  if (postsError) {
    console.error("❌ 投稿の取得に失敗:", postsError);
    process.exit(1);
  }

  if (!posts || posts.length === 0) {
    console.log("✅ 投稿が見つかりませんでした");
    return;
  }

  console.log(`📊 全投稿数: ${posts.length}件`);

  // 2. 既に生成済みのEmbeddingを確認
  const { data: existingEmbeddings, error: embeddingsError } = await supabase
    .from("post_embeddings")
    .select("post_id");

  if (embeddingsError) {
    console.error("❌ 既存Embeddingの取得に失敗:", embeddingsError);
    process.exit(1);
  }

  const existingPostIds = new Set(
    existingEmbeddings?.map((e: any) => e.post_id) || []
  );
  console.log(`✅ 既存Embedding数: ${existingPostIds.size}件`);

  // 3. 未生成の投稿をフィルタリング
  const unprocessedPosts = posts.filter(
    (post) => !existingPostIds.has(post.id)
  );
  console.log(`🔍 未生成の投稿数: ${unprocessedPosts.length}件`);

  if (unprocessedPosts.length === 0) {
    console.log("✅ すべての投稿にEmbeddingが生成済みです");
    return;
  }

  // 4. Embedding生成処理
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < unprocessedPosts.length; i++) {
    const post = unprocessedPosts[i];
    const progress = `[${i + 1}/${unprocessedPosts.length}]`;

    try {
      console.log(`${progress} 処理中: ${post.id}`);

      // 画像をダウンロード
      const imageBuffer = await fetchImageBuffer(post.image_url);

      // Embedding生成
      const embedding = await generateImageEmbedding(imageBuffer, "image/jpeg");

      // DBに保存（Supabase JS SDKでは配列をそのまま渡す）
      const { error: insertError } = await supabase
        .from("post_embeddings")
        .insert({
          post_id: post.id,
          embedding: embedding, // 配列をそのまま渡す
        });

      if (insertError) {
        throw insertError;
      }

      successCount++;
      console.log(`${progress} ✅ 成功: ${post.id}`);

      // レート制限対策: 少し待機
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      errorCount++;
      console.error(
        `${progress} ❌ 失敗: ${post.id}`,
        error instanceof Error ? error.message : error
      );
    }
  }

  // 5. 結果サマリー
  console.log("\n📊 実行結果:");
  console.log(`  - 成功: ${successCount}件`);
  console.log(`  - 失敗: ${errorCount}件`);
  console.log(`  - 合計: ${unprocessedPosts.length}件`);
  console.log("\n✅ Embedding一括生成が完了しました");
}

// スクリプト実行
main().catch((error) => {
  console.error("❌ エラーが発生しました:", error);
  process.exit(1);
});
