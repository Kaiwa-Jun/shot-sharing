// @ts-nocheck
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkFileSearchIds() {
  console.log("🔍 DBに保存されているfile_search_store_idを確認\n");

  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, file_search_store_id, description")
    .order("created_at", { ascending: true })
    .limit(10);

  if (error) {
    console.error("❌ エラー:", error);
    return;
  }

  console.log(`✅ ${posts.length}件の投稿を確認\n`);

  const documentsFormat = [];
  const operationsFormat = [];

  posts.forEach((post, idx) => {
    console.log(`[${idx + 1}] ${post.id}`);
    console.log(`  説明: ${post.description || "(なし)"}`);
    console.log(`  file_search_store_id: ${post.file_search_store_id}`);

    if (post.file_search_store_id?.includes("/documents/")) {
      console.log(`  ✅ documents形式（正しい）`);
      documentsFormat.push(post);
    } else if (post.file_search_store_id?.includes("/operations/")) {
      console.log(`  ❌ operations形式（間違い）`);
      operationsFormat.push(post);
    } else {
      console.log(`  ⚠️ 不明な形式`);
    }
    console.log("");
  });

  console.log("=".repeat(80));
  console.log("\n📊 サマリー:");
  console.log(`  - documents形式（正しい）: ${documentsFormat.length}件`);
  console.log(`  - operations形式（間違い）: ${operationsFormat.length}件`);

  if (documentsFormat.length > 0) {
    console.log("\n✅ 正しい形式の例:");
    console.log(`  ${documentsFormat[0].file_search_store_id}`);
  }

  if (operationsFormat.length > 0) {
    console.log("\n❌ 間違った形式の例:");
    console.log(`  ${operationsFormat[0].file_search_store_id}`);
  }
}

checkFileSearchIds();
