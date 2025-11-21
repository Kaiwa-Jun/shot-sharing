/**
 * 日本語キャプション付きの投稿をシミュレートして、File Search Storeにアップロードするスクリプト
 */

import { generateCaption } from "@/lib/gemini/caption";
import { uploadPhotoToFileSearch } from "@/lib/gemini/file-search-upload";
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

async function simulatePostWithJapaneseCaption() {
  console.log("🚀 日本語キャプション付き投稿のシミュレーション開始\n");
  console.log("=".repeat(80));

  // 花火の投稿を1件取得（まだFile Search Storeにアップロードされていない投稿）
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, description, image_url, exif_data")
    .not("file_search_store_id", "is", null)
    .eq("description", "色とりどりの花火")
    .limit(1);

  if (error || !posts || posts.length === 0) {
    console.error("❌ テスト用の投稿が取得できませんでした:", error);
    return;
  }

  const post = posts[0];

  console.log(`\n📸 投稿: ${post.description}`);
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
    console.log(caption.substring(0, 500) + "...");
    console.log("─".repeat(80));
    console.log(`   文字数: ${caption.length}\n`);

    // File Search Storeにアップロード
    console.log("📤 File Search Storeにアップロード中...");
    const exifData = post.exif_data as any;

    // 新しいPost IDを生成（テスト用）
    const testPostId = `test-${post.id}`;

    const uploadResult = await uploadPhotoToFileSearch(
      imageBuffer,
      testPostId,
      {
        iso: exifData?.iso || null,
        fValue: exifData?.fValue || null,
        shutterSpeed: exifData?.shutterSpeed || null,
        exposureCompensation: exifData?.exposureCompensation || null,
        focalLength: exifData?.focalLength || null,
        cameraMake: exifData?.cameraMake || null,
        cameraModel: exifData?.cameraModel || null,
      },
      post.description || "",
      post.image_url
    );

    console.log("\n✅ File Search Storeへのアップロード完了");
    console.log(`   File Name: ${uploadResult.fileName}`);
    console.log(
      "\n💡 これで「花火の撮り方」などの日本語クエリで検索できるようになります！"
    );
  } catch (error) {
    console.error("❌ エラー:", error);
  }

  console.log("\n" + "=".repeat(80));
  console.log("✅ シミュレーション完了");
}

simulatePostWithJapaneseCaption().catch(console.error);
