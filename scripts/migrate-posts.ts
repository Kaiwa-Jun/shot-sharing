import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { generateCaption } from "../lib/gemini/caption";
import { uploadPhotoToFileSearch } from "../lib/gemini/file-search-upload";

// .env.localを読み込む
dotenv.config({ path: ".env.local" });

// SERVICE_ROLE_KEYを使用してRLSをバイパス
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

interface BackupPost {
  id: string;
  user_id: string;
  image_url: string;
  thumbnail_url: string;
  description: string | null;
  exif_data: any;
  visibility: string;
  created_at: string;
  file_search_store_id: string | null;
}

async function deleteAllData() {
  console.log("\n🗑️  ステップ1: 既存データを削除中...");

  // 1. similar_posts_cacheテーブルを削除
  console.log("  📋 similar_posts_cacheテーブルを削除...");
  const { error: cacheError } = await supabase
    .from("similar_posts_cache")
    .delete()
    .neq("post_id", "00000000-0000-0000-0000-000000000000"); // すべて削除

  if (cacheError) {
    console.error("  ❌ similar_posts_cache削除エラー:", cacheError);
  } else {
    console.log("  ✅ similar_posts_cache削除完了");
  }

  // 2. savesテーブルを削除
  console.log("  📋 savesテーブルを削除...");
  const { error: savesError } = await supabase
    .from("saves")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // すべて削除

  if (savesError) {
    console.log("  ⚠️  savesテーブルは空またはエラー:", savesError.message);
  } else {
    console.log("  ✅ saves削除完了");
  }

  // 3. postsテーブルを削除
  console.log("  📋 postsテーブルを削除...");
  const { error: postsError } = await supabase
    .from("posts")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // すべて削除

  if (postsError) {
    console.error("  ❌ posts削除エラー:", postsError);
    throw postsError;
  } else {
    console.log("  ✅ posts削除完了");
  }

  console.log("✅ ステップ1完了: すべてのデータを削除しました\n");
}

async function deleteFileSearchDocuments(posts: BackupPost[]) {
  console.log("\n🗑️  ステップ2: File Search Storeのドキュメントを削除中...");

  let deleteCount = 0;
  let skipCount = 0;

  for (const post of posts) {
    if (!post.file_search_store_id) {
      console.log(`  ⏭️  スキップ (file_search_store_idなし): ${post.id}`);
      skipCount++;
      continue;
    }

    try {
      await ai.files.delete({ name: post.file_search_store_id });
      console.log(`  ✅ 削除: ${post.file_search_store_id}`);
      deleteCount++;
    } catch (error: any) {
      if (
        error.message?.includes("not found") ||
        error.message?.includes("404")
      ) {
        console.log(`  ⏭️  すでに削除済み: ${post.file_search_store_id}`);
        skipCount++;
      } else {
        console.error(`  ❌ 削除エラー (${post.id}):`, error.message);
      }
    }

    // API Rate Limitを考慮して少し待機
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(
    `✅ ステップ2完了: ${deleteCount}件削除、${skipCount}件スキップ\n`
  );
}

async function reuploadPosts(posts: BackupPost[]) {
  console.log("\n📤 ステップ3: 投稿を再アップロード中...");

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(
      `\n  [${i + 1}/${posts.length}] ${post.id} - ${post.description || "(説明なし)"}`
    );

    try {
      // Supabase Storageから画像を取得
      console.log(`    📥 画像をダウンロード: ${post.image_url}`);
      const imageUrl = new URL(post.image_url);
      const pathParts = imageUrl.pathname.split("/");
      const bucketName = pathParts[pathParts.indexOf("object") + 2];
      const filePath = pathParts
        .slice(pathParts.indexOf("object") + 3)
        .join("/");

      const { data: imageData, error: downloadError } = await supabase.storage
        .from(bucketName)
        .download(filePath);

      if (downloadError || !imageData) {
        throw new Error(`画像ダウンロード失敗: ${downloadError?.message}`);
      }

      const imageBuffer = Buffer.from(await imageData.arrayBuffer());
      console.log(`    ✅ 画像ダウンロード完了 (${imageBuffer.length} bytes)`);

      // File Search Storeにアップロード（新しいキャプション生成を含む）
      console.log(
        `    🎨 新キャプション生成 & File Search Storeへアップロード...`
      );
      const uploadResult = await uploadPhotoToFileSearch(
        imageBuffer,
        post.id,
        post.exif_data,
        post.description || "",
        post.image_url
      );

      if (!uploadResult.success || !uploadResult.fileName) {
        throw new Error("File Search Storeへのアップロード失敗");
      }

      console.log(
        `    ✅ File Search Storeアップロード完了: ${uploadResult.fileName}`
      );

      // postsテーブルに登録
      console.log(`    💾 DBに登録...`);
      const { error: insertError } = await supabase.from("posts").insert({
        id: post.id,
        user_id: post.user_id,
        image_url: post.image_url,
        thumbnail_url: post.thumbnail_url,
        description: post.description,
        exif_data: post.exif_data,
        visibility: post.visibility,
        file_search_store_id: uploadResult.fileName,
        created_at: post.created_at,
        updated_at: new Date().toISOString(),
      });

      if (insertError) {
        throw new Error(`DB登録失敗: ${insertError.message}`);
      }

      console.log(`    ✅ DB登録完了`);
      successCount++;

      // API Rate Limitを考慮
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error: any) {
      console.error(`    ❌ エラー:`, error.message);
      errorCount++;
    }
  }

  console.log(
    `\n✅ ステップ3完了: ${successCount}件成功、${errorCount}件失敗\n`
  );

  if (errorCount > 0) {
    console.warn(
      `⚠️  ${errorCount}件の投稿が失敗しました。ログを確認してください。`
    );
  }
}

async function main() {
  console.log("🚀 投稿データ移行スクリプト開始\n");
  console.log("=".repeat(60));

  // バックアップデータを読み込む
  const backupPath = "scripts/posts-backup.json";
  if (!fs.existsSync(backupPath)) {
    console.error("❌ バックアップファイルが見つかりません:", backupPath);
    console.log("まず `npx tsx scripts/backup-posts.ts` を実行してください");
    process.exit(1);
  }

  const backup = JSON.parse(fs.readFileSync(backupPath, "utf-8"));
  const posts: BackupPost[] = backup.posts;

  console.log(`📦 バックアップデータ読み込み: ${posts.length}件`);
  console.log(`📅 バックアップ日時: ${backup.backup_date}`);
  console.log("=".repeat(60));

  // 確認プロンプト
  console.log("\n⚠️  警告: 以下の操作を実行します:");
  console.log("  1. postsテーブルの全データを削除");
  console.log("  2. savesテーブルの全データを削除");
  console.log("  3. similar_posts_cacheテーブルの全データを削除");
  console.log("  4. File Search Storeの全ドキュメントを削除");
  console.log(
    `  5. ${posts.length}件の投稿を再アップロード（新キャプション生成）`
  );
  console.log("\n続行しますか？ (Ctrl+Cで中止)\n");

  // 5秒待機
  for (let i = 5; i > 0; i--) {
    process.stdout.write(`\r⏳ ${i}秒後に開始...`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  console.log("\n");

  try {
    // ステップ1: データ削除
    await deleteAllData();

    // ステップ2: File Search Storeドキュメント削除
    await deleteFileSearchDocuments(posts);

    // ステップ3: 再アップロード
    await reuploadPosts(posts);

    console.log("\n" + "=".repeat(60));
    console.log("🎉 移行完了!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ 移行中にエラーが発生しました:", error);
    process.exit(1);
  }
}

main();
