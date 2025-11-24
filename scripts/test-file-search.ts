// @ts-nocheck
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

// .env.localを読み込む
dotenv.config({ path: ".env.local" });

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const FILE_SEARCH_STORE_ID = process.env.GEMINI_FILE_SEARCH_STORE_ID!.replace(
  /^["']|["']$/g,
  ""
);

async function testFileSearch() {
  console.log("🔍 File Search APIテスト検索\n");
  console.log(`📦 Store ID: ${FILE_SEARCH_STORE_ID}\n`);
  console.log("=".repeat(80));

  const testQueries = [
    { name: "紫陽花(短い)", query: "紫陽花" },
    { name: "桜(短い)", query: "桜" },
    { name: "風鈴(短い)", query: "風鈴" },
    { name: "花火(短い)", query: "花火" },
    {
      name: "紫陽花(キャプション風)",
      query: "あじさい 紫陽花 花 植物 屋外 庭園 初夏 日中 青 緑 鮮やか 明るい",
    },
    {
      name: "桜(キャプション風)",
      query:
        "桜 花 枝 屋外 自然 春 夕日 ピンク 白 青 茶色 黄色 明るい 鮮やか 優しい光 穏やか",
    },
    {
      name: "風鈴(キャプション風)",
      query:
        "風鈴 短冊 風車 ガラス風鈴 人 木製フレーム 装飾 屋外 神社 参道 夏 日中 赤 白 青 黄 緑 カラフル 明るい 鮮やか 涼やか 和風",
    },
    {
      name: "紫陽花(EXIF込み)",
      query:
        "紫陽花 ISO100 f5.6 1/400 37mm ILCE-6400 E PZ 16-50mm F3.5-5.6 OSS",
    },
  ];

  for (let i = 0; i < testQueries.length; i++) {
    const { name, query } = testQueries[i];
    console.log(`\n[${i + 1}/${testQueries.length}] ${name}`);
    console.log(`📝 クエリ: "${query}"`);
    console.log("-".repeat(80));

    try {
      const startTime = Date.now();

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user" as const,
            parts: [{ text: query }],
          },
        ],
        config: {
          tools: [
            {
              fileSearch: {
                fileSearchStoreNames: [FILE_SEARCH_STORE_ID],
              },
            },
          ],
        } as any,
      });

      const elapsedTime = Date.now() - startTime;

      // Grounding metadataを確認
      const groundingMetadata = response.groundingMetadata;

      if (groundingMetadata && groundingMetadata.fileSearchResults) {
        const results = groundingMetadata.fileSearchResults;
        console.log(`✅ Grounding Metadata検出 (${elapsedTime}ms)`);
        console.log(`📊 File Search結果: ${results.length}件\n`);

        results.forEach((result: any, idx: number) => {
          console.log(`  [${idx + 1}] ${result.uri || result.title || "不明"}`);
          if (result.title) console.log(`      Title: ${result.title}`);
          if (result.score !== undefined)
            console.log(`      Score: ${result.score}`);
        });

        // URIからpost_idを抽出してみる
        console.log(`\n🔍 URIからのpost_id抽出:`);
        results.forEach((result: any, idx: number) => {
          const uri = result.uri || "";
          // fileSearchStores/{store}/documents/{doc} の形式から{doc}を抽出
          const match = uri.match(/documents\/([^\/]+)/);
          if (match) {
            console.log(`  [${idx + 1}] Document ID: ${match[1]}`);
          }
        });
      } else {
        console.log(`❌ Grounding Metadataなし (${elapsedTime}ms)`);

        // レスポンス全体を確認
        console.log(
          "\n🔍 [DEBUG] レスポンス全体:",
          JSON.stringify(response, null, 2).substring(0, 500)
        );
      }
    } catch (error: any) {
      console.log(`❌ エラー: ${error.message}`);
    }

    // API Rate Limitを考慮
    if (i < testQueries.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("\n✅ テスト完了!");
}

testFileSearch();
