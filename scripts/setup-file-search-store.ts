import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
import * as path from "path";

// .env.local を読み込む
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

/**
 * File Search Store を作成するスクリプト
 * 初回セットアップ時に1回だけ実行する
 */
async function setupFileSearchStore() {
  console.log("🚀 File Search Store セットアップを開始します...\n");

  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ エラー: GEMINI_API_KEY が設定されていません");
    console.error("   .env.local ファイルに GEMINI_API_KEY を追加してください");
    process.exit(1);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    console.log("📦 File Search Store を作成中...");

    const createStoreOp = await ai.fileSearchStores.create({
      config: {
        displayName: "shot-sharing-photos",
      },
    });

    // レスポンスからStore名を取得
    const storeName = createStoreOp.name;

    if (!storeName) {
      console.error("取得できたレスポンス:", createStoreOp);
      throw new Error("Store の作成に失敗しました");
    }

    console.log("\n✅ File Search Store が作成されました！\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 以下を .env.local に追加してください:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log(`GEMINI_FILE_SEARCH_STORE_ID="${storeName}"`);
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("💡 ヒント:");
    console.log("   1. 上記の環境変数を .env.local にコピー");
    console.log("   2. 開発サーバーを再起動");
    console.log("   3. Phase 2 の実装に進む\n");
  } catch (error) {
    console.error("\n❌ エラーが発生しました:", error);
    process.exit(1);
  }
}

// スクリプト実行
setupFileSearchStore();
