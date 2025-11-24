import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { uploadPhotoToFileSearch } from "../lib/gemini/file-search-upload";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testSingleUpload() {
  console.log("🧪 1件のテストアップロードを実行\n");

  // バックアップから1件取得
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, image_url, description, exif_data")
    .limit(1);

  if (error || !posts || posts.length === 0) {
    console.error("❌ 投稿の取得に失敗:", error);
    return;
  }

  const post = posts[0];
  console.log("📝 テスト投稿:");
  console.log(`  ID: ${post.id}`);
  console.log(`  説明: ${post.description || "(なし)"}`);
  console.log(`  画像URL: ${post.image_url}\n`);

  try {
    // 画像をダウンロード
    console.log("📥 画像をダウンロード中...");
    const imageUrl = new URL(post.image_url);
    const pathParts = imageUrl.pathname.split("/");
    const bucketName = pathParts[pathParts.indexOf("object") + 2];
    const filePath = pathParts.slice(pathParts.indexOf("object") + 3).join("/");

    const { data: imageData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(filePath);

    if (downloadError || !imageData) {
      throw new Error(`画像ダウンロード失敗: ${downloadError?.message}`);
    }

    const imageBuffer = Buffer.from(await imageData.arrayBuffer());
    console.log(`✅ 画像ダウンロード完了 (${imageBuffer.length} bytes)\n`);

    // File Search Storeにアップロード
    console.log("📤 File Search Storeにアップロード中...\n");
    const uploadResult = await uploadPhotoToFileSearch(
      imageBuffer,
      `test_${post.id}`,
      post.exif_data,
      post.description || "",
      post.image_url
    );

    console.log("\n" + "=".repeat(80));
    console.log("\n✅ テストアップロード成功!");
    console.log("結果:", uploadResult);
  } catch (error: any) {
    console.error("\n❌ テストアップロード失敗:", error.message);
  }
}

testSingleUpload();
