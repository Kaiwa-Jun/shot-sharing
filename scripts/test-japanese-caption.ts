/**
 * 日本語キャプション生成をテストするスクリプト
 */

import { generateCaption } from "@/lib/gemini/caption";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/lib/types/database.types";
import * as dotenv from "dotenv";
import * as path from "path";
import * as https from "https";

// .env.localを読み込む
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

/**
 * URLから画像をダウンロードしてBufferとして取得
 */
async function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve(Buffer.concat(chunks)));
      response.on("error", reject);
    });
  });
}

async function testJapaneseCaption() {
  console.log("🎨 日本語キャプション生成をテスト中...\n");
  console.log("=".repeat(80));

  // 花火の投稿を1件取得
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, description, image_url")
    .not("file_search_store_id", "is", null)
    .limit(3);

  if (error || !posts || posts.length === 0) {
    console.error("❌ テスト用の投稿が取得できませんでした:", error);
    return;
  }

  for (const post of posts) {
    console.log(`\n📸 投稿: ${post.description || "(説明なし)"}`);
    console.log(`   ID: ${post.id}`);
    console.log("-".repeat(80));

    try {
      // 画像をダウンロード
      console.log("📥 画像をダウンロード中...");
      const imageBuffer = await downloadImage(post.image_url);
      console.log(`✅ ダウンロード完了 (${imageBuffer.length} bytes)`);

      // 日本語キャプションを生成
      console.log("🎨 日本語キャプションを生成中...");
      const caption = await generateCaption(imageBuffer);

      console.log("\n✅ 生成されたキャプション（日本語）:");
      console.log("─".repeat(80));
      console.log(caption);
      console.log("─".repeat(80));
      console.log(`   文字数: ${caption.length}`);
    } catch (error) {
      console.error("❌ エラー:", error);
    }

    console.log("\n" + "=".repeat(80));

    // API Rate Limitを避けるため待機
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  console.log("\n✅ テスト完了");
}

testJapaneseCaption().catch(console.error);
