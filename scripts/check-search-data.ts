/**
 * File Search Storeに保存されている投稿データを確認するスクリプト
 */

import { createClient } from "@supabase/supabase-js";
import { Database } from "@/lib/types/database.types";
import * as dotenv from "dotenv";
import * as path from "path";

// .env.localを読み込む
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ 環境変数が設定されていません");
  console.error("NEXT_PUBLIC_SUPABASE_URL:", !!supabaseUrl);
  console.error("SUPABASE_KEY:", !!supabaseKey);
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

async function checkSearchData() {
  console.log("🔍 File Search Store に保存されている投稿データを確認中...\n");

  // file_search_store_idがnullでない投稿を取得
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, description, file_search_store_id, exif_data, created_at")
    .not("file_search_store_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("❌ データ取得エラー:", error);
    return;
  }

  if (!posts || posts.length === 0) {
    console.log(
      "⚠️ File Search Store に保存されている投稿が見つかりませんでした"
    );
    return;
  }

  console.log(`✅ ${posts.length}件の投稿が見つかりました\n`);
  console.log("=".repeat(80));

  posts.forEach((post, index) => {
    console.log(`\n📸 投稿 ${index + 1}:`);
    console.log(`  ID: ${post.id}`);
    console.log(`  説明文: ${post.description || "(なし)"}`);
    console.log(`  File Search Store ID: ${post.file_search_store_id}`);
    console.log(`  作成日時: ${post.created_at}`);

    if (post.exif_data) {
      const exif = post.exif_data as any;
      console.log(`  EXIF情報:`);
      console.log(
        `    - カメラ: ${exif.cameraMake || ""} ${exif.cameraModel || ""}`
      );
      console.log(`    - ISO: ${exif.iso || "N/A"}`);
      console.log(`    - F値: ${exif.fValue || "N/A"}`);
      console.log(`    - シャッタースピード: ${exif.shutterSpeed || "N/A"}`);
      console.log(`    - 焦点距離: ${exif.focalLength || "N/A"}`);
    }

    console.log("-".repeat(80));
  });

  console.log("\n💡 ヒント:");
  console.log(
    "  - File Search Store には caption（AI生成）が保存されていますが、"
  );
  console.log("    このスクリプトではDBの情報のみ表示しています");
  console.log(
    "  - 実際のキャプション内容を確認するには、投稿時のログを確認してください"
  );
}

checkSearchData().catch(console.error);
