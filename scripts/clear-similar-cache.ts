import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 類似作例キャッシュをクリア
 * クエリ最適化後、新しいクエリで再生成するため
 */
async function clearCache() {
  console.log("🗑️ 類似作例キャッシュをクリア中...\n");

  try {
    // 全キャッシュを削除
    const { error, count } = await supabase
      .from("similar_posts_cache")
      .delete()
      .not("post_id", "is", null); // 全件削除

    if (error) {
      throw error;
    }

    console.log(`✅ ${count || 0}件のキャッシュを削除しました`);
    console.log("\n💡 次回アクセス時に新しいクエリで再生成されます");
  } catch (error) {
    console.error("❌ エラー:", error);
    throw error;
  }
}

clearCache();
