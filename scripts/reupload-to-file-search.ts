/**
 * 既存の投稿をFile Search Storeに再アップロード
 * チャンキング設定を適用するため、既存のドキュメントを削除して再作成
 */
import * as dotenv from "dotenv";
import * as path from "path";

// .env.localを読み込む（最初に実行）
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import { uploadPhotoToFileSearch } from "@/lib/gemini/file-search-upload";
import { deleteFileFromStore } from "@/lib/gemini/file-search";

async function reuploadAllPosts() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ 環境変数が設定されていません");
    process.exit(1);
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY が設定されていません");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  console.log("=".repeat(80));
  console.log("既存投稿のFile Search Store再アップロード開始");
  console.log("=".repeat(80));

  // 1. すべての投稿を取得
  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (postsError || !posts) {
    console.error("投稿の取得エラー:", postsError);
    return;
  }

  console.log(`\n📊 合計 ${posts.length} 件の投稿を処理します\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log("-".repeat(80));
    console.log(`[${i + 1}/${posts.length}] 投稿ID: ${post.id}`);
    console.log(`作成日時: ${post.created_at}`);

    // file_search_store_idがない投稿はスキップ
    if (!post.file_search_store_id) {
      console.log("⚠️ file_search_store_idが未設定のためスキップ");
      skipCount++;
      continue;
    }

    // 画像URLがない投稿はスキップ
    if (!post.image_url) {
      console.log("⚠️ image_urlが未設定のためスキップ");
      skipCount++;
      continue;
    }

    try {
      // 2. 古いドキュメントを削除
      console.log(`🗑️ 古いドキュメントを削除中: ${post.file_search_store_id}`);
      await deleteFileFromStore(post.file_search_store_id);

      // 3. 画像をダウンロード
      console.log(`⬇️ 画像をダウンロード中: ${post.image_url}`);
      const imageResponse = await fetch(post.image_url);
      if (!imageResponse.ok) {
        throw new Error(`画像のダウンロード失敗: ${imageResponse.statusText}`);
      }
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

      // 4. 新しいチャンキング設定で再アップロード
      console.log("📤 新しいチャンキング設定でアップロード中...");
      const result = await uploadPhotoToFileSearch(
        imageBuffer,
        post.id,
        post.exif_data || {},
        post.description || "",
        post.image_url
      );

      // 5. データベースのfile_search_store_idを更新
      console.log(`💾 データベース更新中: ${result.fileName}`);
      const { error: updateError } = await supabase
        .from("posts")
        .update({ file_search_store_id: result.fileName })
        .eq("id", post.id);

      if (updateError) {
        throw new Error(`DB更新エラー: ${updateError.message}`);
      }

      // 6. キャッシュをクリア
      console.log("🗑️ キャッシュをクリア中...");
      await supabase
        .from("similar_posts_cache")
        .delete()
        .eq("post_id", post.id);

      console.log("✅ 再アップロード完了");
      successCount++;

      // レート制限を避けるため、少し待機
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(
        "❌ エラー:",
        error instanceof Error ? error.message : error
      );
      errorCount++;
    }

    console.log("");
  }

  console.log("=".repeat(80));
  console.log("再アップロード完了");
  console.log("=".repeat(80));
  console.log(`✅ 成功: ${successCount} 件`);
  console.log(`⚠️ スキップ: ${skipCount} 件`);
  console.log(`❌ エラー: ${errorCount} 件`);
  console.log("=".repeat(80));
}

reuploadAllPosts().catch((error) => {
  console.error("エラーが発生しました:", error);
  process.exit(1);
});
