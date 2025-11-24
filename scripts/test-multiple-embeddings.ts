/**
 * 複数のEmbedding生成をテストするスクリプト
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { generateImageEmbedding } from "../lib/gemini/embedding";

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
  console.log("🧪 複数のEmbedding生成テスト\n");

  // 最初の3件を取得（桜、風鈴、紫陽花など異なる被写体）
  const { data: posts } = await supabase
    .from("posts")
    .select("id, image_url, description")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(5);

  if (!posts || posts.length === 0) {
    console.error("❌ 投稿が見つかりません");
    return;
  }

  for (const post of posts) {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`📝 投稿ID: ${post.id.substring(0, 8)}...`);
    console.log(`📝 既存のDescription: ${post.description}\n`);

    try {
      // 画像をダウンロード
      const imageBuffer = await fetchImageBuffer(post.image_url);

      // Embedding生成
      const embedding = await generateImageEmbedding(imageBuffer, "image/jpeg");

      console.log(`\n✅ Embedding生成完了`);
      console.log(
        `📊 First 10 values: [${embedding
          .slice(0, 10)
          .map((v) => v.toFixed(4))
          .join(", ")}]`
      );

      // 少し待機
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error("❌ エラー:", error);
    }
  }
}

main().catch(console.error);
