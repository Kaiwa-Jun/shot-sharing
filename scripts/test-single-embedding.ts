/**
 * 1件のEmbedding生成をテストするスクリプト
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  generateImageEmbedding,
  embeddingToString,
} from "../lib/gemini/embedding";

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

async function fetchImageBuffer(imageUrl: string): Promise<Buffer> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`画像の取得に失敗: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function main() {
  console.log("🧪 1件のEmbedding生成テスト\n");

  // 最初の投稿を取得
  const { data: posts } = await supabase
    .from("posts")
    .select("id, image_url, description")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(1);

  if (!posts || posts.length === 0) {
    console.error("❌ 投稿が見つかりません");
    return;
  }

  const post = posts[0];
  console.log(`📝 投稿ID: ${post.id}`);
  console.log(`📝 既存のDescription: ${post.description}\n`);

  // 画像をダウンロード
  console.log("📥 画像をダウンロード中...");
  const imageBuffer = await fetchImageBuffer(post.image_url);
  console.log(`✅ ダウンロード完了: ${imageBuffer.length} bytes\n`);

  // Embedding生成
  console.log("🔮 Embedding生成中...");
  const embedding = await generateImageEmbedding(imageBuffer, "image/jpeg");

  console.log(`\n✅ Embedding生成完了`);
  console.log(`📊 Vector length: ${embedding.length}`);
  console.log(
    `📊 First 10 values: [${embedding
      .slice(0, 10)
      .map((v) => v.toFixed(4))
      .join(", ")}]`
  );
}

main().catch(console.error);
