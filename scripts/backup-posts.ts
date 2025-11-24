import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as dotenv from "dotenv";

// .env.localを読み込む
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function backupPosts() {
  console.log("📦 既存投稿データをバックアップ中...");

  // postsテーブルから全データを取得
  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("❌ データ取得エラー:", error);
    process.exit(1);
  }

  console.log(`✅ ${posts.length}件の投稿データを取得`);

  // JSONファイルに保存
  const backupData = {
    backup_date: new Date().toISOString(),
    total_posts: posts.length,
    posts: posts,
  };

  fs.writeFileSync(
    "scripts/posts-backup.json",
    JSON.stringify(backupData, null, 2)
  );

  console.log("💾 バックアップ完了: scripts/posts-backup.json");
  console.log("\n📋 投稿データサマリー:");
  posts.forEach((post, idx) => {
    console.log(`${idx + 1}. ${post.id} - ${post.description || "(説明なし)"}`);
  });
}

backupPosts();
