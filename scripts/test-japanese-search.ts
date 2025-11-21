/**
 * 日本語検索機能を包括的にテストするスクリプト
 */

import { searchWithFileSearch } from "@/lib/gemini/file-search-query";
import * as dotenv from "dotenv";
import * as path from "path";

// .env.localを読み込む
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function testJapaneseSearch() {
  const testQueries = [
    // 修正前は失敗していたクエリ
    { query: "花火の撮り方", expected: "成功（修正前は失敗）" },
    { query: "夜景の撮り方", expected: "成功（修正前は失敗）" },

    // 単語検索（修正前も成功していた）
    { query: "花火", expected: "成功（修正前も成功）" },
    { query: "打ち上げ花火", expected: "成功" },
    { query: "風鈴", expected: "成功（修正前も成功）" },
    { query: "神社", expected: "成功" },

    // より複雑な日本語クエリ
    { query: "花火を綺麗に撮るコツ", expected: "成功（日本語質問形式）" },
    { query: "長時間露光の設定", expected: "成功（撮影技法）" },
    { query: "夏祭りの雰囲気", expected: "成功（シーン・雰囲気）" },
  ];

  console.log("🔍 日本語検索機能を包括的にテスト中...\n");
  console.log("=".repeat(80));

  const results: Array<{
    query: string;
    expected: string;
    postCount: number;
    postIds: string[];
    aiResponse: string;
    success: boolean;
  }> = [];

  for (const { query, expected } of testQueries) {
    console.log(`\n📝 クエリ: "${query}"`);
    console.log(`   期待値: ${expected}`);
    console.log("-".repeat(80));

    try {
      const result = await searchWithFileSearch(query);

      const success = result.postIds.length > 0;
      const status = success ? "✅ 成功" : "❌ 失敗";

      console.log(`${status}`);
      console.log(`  - 検出されたPost ID数: ${result.postIds.length}`);

      if (result.postIds.length > 0) {
        console.log(
          `  - Post IDs: ${result.postIds.slice(0, 3).join(", ")}${result.postIds.length > 3 ? "..." : ""}`
        );
      }

      console.log(
        `  - AI回答の冒頭:\n    ${result.aiResponse.substring(0, 150).replace(/\n/g, "\n    ")}...`
      );

      results.push({
        query,
        expected,
        postCount: result.postIds.length,
        postIds: result.postIds,
        aiResponse: result.aiResponse.substring(0, 200),
        success,
      });

      console.log("-".repeat(80));
    } catch (error) {
      console.error(`❌ エラー:`, error);
      results.push({
        query,
        expected,
        postCount: 0,
        postIds: [],
        aiResponse: `エラー: ${error}`,
        success: false,
      });
      console.log("-".repeat(80));
    }

    // API Rate Limitを避けるため待機
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // 結果サマリーを表示
  console.log("\n" + "=".repeat(80));
  console.log("📊 テスト結果サマリー\n");

  const successCount = results.filter((r) => r.success).length;
  const totalCount = results.length;

  console.log(
    `成功率: ${successCount}/${totalCount} (${Math.round((successCount / totalCount) * 100)}%)\n`
  );

  console.log("詳細:");
  console.log("-".repeat(80));

  results.forEach((result, index) => {
    const statusIcon = result.success ? "✅" : "❌";
    console.log(`${index + 1}. ${statusIcon} "${result.query}"`);
    console.log(`   検出: ${result.postCount}件 | 期待: ${result.expected}`);
  });

  console.log("\n" + "=".repeat(80));
  console.log("✅ すべてのテスト完了");

  // 特に注目すべき結果
  const criticalTests = results.filter(
    (r) =>
      r.query.includes("撮り方") ||
      r.query.includes("コツ") ||
      r.query.includes("設定")
  );

  console.log("\n💡 重要な結果（質問形式のクエリ）:");
  console.log("-".repeat(80));
  criticalTests.forEach((result) => {
    const statusIcon = result.success ? "✅" : "❌";
    console.log(`${statusIcon} "${result.query}": ${result.postCount}件検出`);
  });
}

testJapaneseSearch().catch(console.error);
