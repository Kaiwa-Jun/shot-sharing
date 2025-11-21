/**
 * 検索機能をテストしてログを詳細に確認するスクリプト
 */

import { searchWithFileSearch } from "@/lib/gemini/file-search-query";
import * as dotenv from "dotenv";
import * as path from "path";

// .env.localを読み込む
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function testSearch() {
  const testQueries = [
    "花火",
    "花火の撮り方",
    "fireworks",
    "how to shoot fireworks",
    "風鈴",
    "紫陽花",
  ];

  console.log("🔍 検索機能をテスト中...\n");
  console.log("=".repeat(80));

  for (const query of testQueries) {
    console.log(`\n📝 クエリ: "${query}"`);
    console.log("-".repeat(80));

    try {
      const result = await searchWithFileSearch(query);

      console.log(`✅ 検索完了`);
      console.log(`  - 検出されたPost ID数: ${result.postIds.length}`);
      console.log(`  - Post IDs: ${result.postIds.join(", ") || "(なし)"}`);
      console.log(`  - AI回答:\n    ${result.aiResponse.substring(0, 200)}...`);
      console.log("-".repeat(80));
    } catch (error) {
      console.error(`❌ エラー:`, error);
      console.log("-".repeat(80));
    }

    // API Rate Limitを避けるため少し待機
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log("\n" + "=".repeat(80));
  console.log("✅ すべてのテスト完了");
}

testSearch().catch(console.error);
