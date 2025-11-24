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

async function checkFileSearchStore() {
  console.log("🔍 File Search Storeの状態を確認中...\n");
  console.log(`📦 Store ID: ${FILE_SEARCH_STORE_ID}\n`);
  console.log("=".repeat(80));

  try {
    // File Search Storeの情報を取得
    console.log("\n📊 Step 1: Store情報を取得");
    const storeInfo = await ai.fileSearchStores.get({
      name: FILE_SEARCH_STORE_ID,
    });
    console.log("✅ Store情報:");
    console.log(`  - Name: ${storeInfo.name}`);
    console.log(`  - Display Name: ${storeInfo.displayName}`);
    console.log(`  - Create Time: ${storeInfo.createTime}`);
    console.log(`  - Update Time: ${storeInfo.updateTime}`);

    // ドキュメント一覧を取得
    console.log("\n📊 Step 2: ドキュメント一覧を取得");
    const documentsResponse = await ai.files.list({
      pageSize: 100,
    });

    // File Search Store内のドキュメントのみをフィルタ
    const documents = documentsResponse.files.filter((file: any) =>
      file.name?.includes(FILE_SEARCH_STORE_ID.split("/").pop() || "")
    );

    console.log(`✅ 登録されているドキュメント数: ${documents.length}件\n`);

    if (documents.length === 0) {
      console.log("⚠️ ドキュメントが1件も登録されていません！");
      return;
    }

    // 各ドキュメントの詳細を確認
    console.log("=".repeat(80));
    console.log("\n📄 各ドキュメントの詳細:\n");

    const documentDetails = [];

    for (let i = 0; i < Math.min(documents.length, 30); i++) {
      const doc = documents[i];
      console.log(`\n[${i + 1}/${documents.length}] ${doc.name}`);
      console.log(`  Display Name: ${doc.displayName || "(なし)"}`);
      console.log(`  MIME Type: ${doc.mimeType}`);
      console.log(`  Size Bytes: ${doc.sizeBytes || "不明"}`);
      console.log(`  Create Time: ${doc.createTime}`);
      console.log(`  Update Time: ${doc.updateTime}`);

      // customMetadataを確認
      if (doc.customMetadata && doc.customMetadata.length > 0) {
        console.log(`  Custom Metadata:`);
        doc.customMetadata.forEach((meta: any) => {
          if (meta.stringValue !== undefined) {
            console.log(`    - ${meta.key}: "${meta.stringValue}"`);
          } else if (meta.numericValue !== undefined) {
            console.log(`    - ${meta.key}: ${meta.numericValue}`);
          }
        });
      } else {
        console.log(`  Custom Metadata: なし`);
      }

      // post_idを抽出
      const postIdMeta = doc.customMetadata?.find(
        (m: any) => m.key === "post_id"
      );
      const postId = postIdMeta?.stringValue || "不明";

      documentDetails.push({
        name: doc.name,
        displayName: doc.displayName,
        mimeType: doc.mimeType,
        sizeBytes: doc.sizeBytes,
        postId: postId,
        hasCustomMetadata: doc.customMetadata && doc.customMetadata.length > 0,
      });
    }

    // サマリー表示
    console.log("\n" + "=".repeat(80));
    console.log("\n📊 サマリー:");
    console.log(`  - 総ドキュメント数: ${documents.length}件`);
    console.log(
      `  - text/plain: ${documents.filter((d) => d.mimeType === "text/plain").length}件`
    );
    console.log(
      `  - image/*: ${documents.filter((d) => d.mimeType?.startsWith("image/")).length}件`
    );
    console.log(
      `  - Custom Metadata付き: ${documentDetails.filter((d) => d.hasCustomMetadata).length}件`
    );

    // post_idの重複チェック
    const postIds = documentDetails
      .map((d) => d.postId)
      .filter((id) => id !== "不明");
    const uniquePostIds = new Set(postIds);
    console.log(`  - ユニークなpost_id数: ${uniquePostIds.size}件`);

    if (postIds.length !== uniquePostIds.size) {
      console.log(
        `  ⚠️ 重複したpost_idがあります (${postIds.length - uniquePostIds.size}件)`
      );
    }

    // テスト検索を実行
    console.log("\n" + "=".repeat(80));
    console.log("\n🔍 Step 3: テスト検索を実行\n");

    const testQueries = [
      "紫陽花",
      "桜",
      "風鈴",
      "花火",
      "あじさい 紫陽花 花 植物 屋外 庭園 初夏 日中 青 緑 鮮やか 明るい",
    ];

    for (const query of testQueries) {
      console.log(`\n🔍 クエリ: "${query}"`);
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: query,
          systemInstruction: `あなたは写真検索アシスタントです。ユーザーの検索クエリに基づいて、類似する写真を見つけてください。`,
          generationConfig: {
            temperature: 0.0,
          },
          tools: [
            {
              fileSearchTools: [{ fileSearchStore: FILE_SEARCH_STORE_ID }],
            },
          ],
        });

        // grounding metadataを確認
        const groundingMetadata = response.groundingMetadata;
        if (groundingMetadata && groundingMetadata.fileSearchResults) {
          const results = groundingMetadata.fileSearchResults;
          console.log(`  ✅ File Search結果: ${results.length}件`);
          results.forEach((result: any, idx: number) => {
            console.log(
              `    [${idx + 1}] ${result.uri || result.title || "不明"}`
            );
          });
        } else {
          console.log(`  ❌ Grounding Metadataなし`);
        }
      } catch (error: any) {
        console.log(`  ❌ エラー: ${error.message}`);
      }

      // API Rate Limitを考慮
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("\n" + "=".repeat(80));
    console.log("\n✅ 確認完了!");
  } catch (error: any) {
    console.error("❌ エラーが発生しました:", error.message);
    if (error.response) {
      console.error("レスポンス:", error.response);
    }
  }
}

checkFileSearchStore();
