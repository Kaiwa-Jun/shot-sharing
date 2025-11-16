# Phase 1: Gemini SDK移行とFile Search基盤構築

## 📋 概要

旧SDK（`@google/generative-ai`）から新SDK（`@google/genai`）への移行と、File Search API の基盤を構築します。

**所要時間**: 2-3時間

## 🎯 目的

- 2025年11月30日にサポート終了する旧SDKから新SDKへ移行
- File Search Storeの作成と管理基盤を構築
- 既存のGemini機能（テキスト生成）を新SDKで動作させる

## ⚠️ 重要な変更点

- `@google/generative-ai` → `@google/genai` へ移行
- 旧SDKは2025年11月30日にサポート終了
- 新SDKではFile Search APIがサポートされている

---

## 📦 必要なパッケージ

### インストール

```bash
npm install @google/genai
```

### アンインストール（移行完了後）

```bash
# Phase 1完了後、テストが通ったら実行
npm uninstall @google/generative-ai
```

---

## 📁 ファイル構成

```
lib/gemini/
├── client.ts              # Geminiクライアント（新SDKに移行）
├── file-search.ts         # File Search API関連（新規作成）
└── file-search-setup.ts   # 初回セットアップスクリプト（新規作成）

scripts/
└── setup-file-search-store.ts  # File Search Store作成スクリプト（新規作成）
```

---

## 🔧 実装タスク

### ✅ Task 1-1: 新SDKのインストール

```bash
npm install @google/genai
```

**確認方法**:

```bash
npm list @google/genai
```

---

### ✅ Task 1-2: `lib/gemini/client.ts` の新SDKへの移行

**現在のコード**（旧SDK）:

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

function getGenAI() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

export function getGeminiModel(
  modelName:
    | "gemini-1.5-flash"
    | "gemini-1.5-pro"
    | "gemini-2.0-flash-exp" = "gemini-2.0-flash-exp"
) {
  const genAI = getGenAI();
  return genAI.getGenerativeModel({ model: modelName });
}

export async function generateText(prompt: string) {
  const model = getGeminiModel();
  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text();
}

export function startChat(history?: Array<{ role: string; parts: string }>) {
  const model = getGeminiModel();
  return model.startChat({
    history: history?.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.parts }],
    })),
  });
}
```

**新しいコード**（新SDK）:

```typescript
import { GoogleGenAI } from "@google/genai";

/**
 * Gemini AI クライアントの初期化
 */
function getGenAI() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
  }
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
}

/**
 * Gemini モデルを取得
 * @param modelName モデル名（デフォルト: gemini-2.5-flash）
 */
export function getGeminiModel(
  modelName:
    | "gemini-1.5-flash"
    | "gemini-1.5-pro"
    | "gemini-2.0-flash-exp"
    | "gemini-2.5-flash" = "gemini-2.5-flash"
) {
  const genAI = getGenAI();
  return genAI.models.get({ model: modelName });
}

/**
 * テキスト生成（シンプル版）
 */
export async function generateText(prompt: string) {
  const genAI = getGenAI();
  const response = await genAI.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });
  return response.text;
}

/**
 * チャット形式での対話
 */
export function startChat(history?: Array<{ role: string; parts: string }>) {
  const genAI = getGenAI();
  return genAI.models.startChat({
    model: "gemini-2.5-flash",
    history: history?.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.parts }],
    })),
  });
}

/**
 * Gemini AIクライアントを取得（File Search用）
 */
export function getGeminiClient() {
  return getGenAI();
}
```

**変更点**:

- `GoogleGenerativeAI` → `GoogleGenAI`
- 初期化方法が変更（オブジェクト形式）
- モデル取得方法が変更（`genAI.models.get()`）
- デフォルトモデルを `gemini-2.5-flash` に変更（最新）
- File Search用のクライアント取得関数を追加

**テスト方法**:

```typescript
// app/actions/gemini.ts でテスト
const result = await testGeminiAPI("こんにちは");
console.log(result);
```

---

### ✅ Task 1-3: File Search Store作成スクリプトの実装

**ファイル**: `scripts/setup-file-search-store.ts`

```typescript
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

    const storeName = createStoreOp.fileSearchStore?.name;

    if (!storeName) {
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
```

**実行方法**:

```bash
# TypeScriptを直接実行できるようにtsx をインストール
npm install -D tsx

# スクリプト実行
npx tsx scripts/setup-file-search-store.ts
```

**package.json にスクリプト追加**:

```json
{
  "scripts": {
    "setup:file-search": "tsx scripts/setup-file-search-store.ts"
  }
}
```

---

### ✅ Task 1-4: File Search 基盤ライブラリの実装

**ファイル**: `lib/gemini/file-search.ts`

```typescript
import { GoogleGenAI } from "@google/genai";

/**
 * File Search Store IDを取得
 */
export function getFileSearchStoreId(): string {
  const storeId = process.env.GEMINI_FILE_SEARCH_STORE_ID;
  if (!storeId) {
    throw new Error(
      "GEMINI_FILE_SEARCH_STORE_ID is not set in environment variables"
    );
  }
  return storeId;
}

/**
 * File Search用のクライアントを取得
 */
export function getFileSearchClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
  }

  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
}

/**
 * File Search Store の情報を取得
 */
export async function getFileSearchStoreInfo() {
  const client = getFileSearchClient();
  const storeId = getFileSearchStoreId();

  try {
    const store = await client.fileSearchStores.get({
      fileSearchStoreName: storeId,
    });
    return store;
  } catch (error) {
    console.error("File Search Store の取得に失敗しました:", error);
    throw error;
  }
}

/**
 * File Search Store に登録されているファイル一覧を取得
 */
export async function listFilesInStore() {
  const client = getFileSearchClient();
  const storeId = getFileSearchStoreId();

  try {
    const response = await client.fileSearchStores.listFiles({
      fileSearchStoreName: storeId,
    });
    return response.files || [];
  } catch (error) {
    console.error("ファイル一覧の取得に失敗しました:", error);
    throw error;
  }
}

/**
 * File Search Store からファイルを削除
 */
export async function deleteFileFromStore(fileName: string) {
  const client = getFileSearchClient();

  try {
    await client.fileSearchStores.deleteFile({
      fileName: fileName,
    });
    return { success: true };
  } catch (error) {
    console.error("ファイルの削除に失敗しました:", error);
    throw error;
  }
}
```

---

### ✅ Task 1-5: 環境変数の設定

**ファイル**: `.env.local`

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Gemini API
GEMINI_API_KEY=your-gemini-api-key
GEMINI_FILE_SEARCH_STORE_ID=  # スクリプト実行後に追加
```

**ファイル**: `.env.local.example`

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Gemini API
GEMINI_API_KEY=your-gemini-api-key
GEMINI_FILE_SEARCH_STORE_ID=  # scripts/setup-file-search-store.ts の実行後に設定
```

---

### ✅ Task 1-6: テストコードの作成

**ファイル**: `__tests__/lib/gemini/file-search.test.ts`

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import {
  getFileSearchStoreId,
  getFileSearchStoreInfo,
} from "@/lib/gemini/file-search";

describe("File Search API", () => {
  beforeAll(() => {
    // 環境変数が設定されているか確認
    if (!process.env.GEMINI_FILE_SEARCH_STORE_ID) {
      throw new Error("GEMINI_FILE_SEARCH_STORE_ID が設定されていません");
    }
  });

  it("File Search Store ID が取得できること", () => {
    const storeId = getFileSearchStoreId();
    expect(storeId).toBeTruthy();
    expect(typeof storeId).toBe("string");
  });

  it("File Search Store の情報が取得できること", async () => {
    const storeInfo = await getFileSearchStoreInfo();
    expect(storeInfo).toBeTruthy();
    expect(storeInfo.fileSearchStore?.name).toBe(getFileSearchStoreId());
  });
});
```

**テスト実行**:

```bash
npm test -- file-search.test.ts
```

---

## 🧪 動作確認手順

### 1. 新SDKの動作確認

```bash
# 開発サーバー起動
npm run dev

# ブラウザで http://localhost:3000 にアクセス
# Gemini API接続テストセクションで「シンプルテスト」を実行
```

### 2. File Search Store の作成

```bash
# セットアップスクリプト実行
npm run setup:file-search

# 出力された GEMINI_FILE_SEARCH_STORE_ID を .env.local に追加
# 例: GEMINI_FILE_SEARCH_STORE_ID="fileSearchStores/abc123xyz"
```

### 3. File Search 基盤の動作確認

```bash
# テスト実行
npm test -- file-search.test.ts

# 開発サーバーを再起動
npm run dev
```

---

## ✅ 完了条件

以下がすべて満たされたらPhase 1完了：

- [ ] `@google/genai` パッケージがインストールされている
- [ ] `lib/gemini/client.ts` が新SDKに移行され、既存機能が動作する
- [ ] File Search Store が作成され、Store IDが `.env.local` に設定されている
- [ ] `lib/gemini/file-search.ts` が実装され、基本的なAPI呼び出しができる
- [ ] テストが通る（`npm test -- file-search.test.ts`）
- [ ] Gemini API接続テストが正常に動作する

---

## 🚨 トラブルシューティング

### エラー: "GEMINI_API_KEY is not set"

**原因**: `.env.local` にAPIキーが設定されていない

**解決方法**:

```bash
# .env.local に以下を追加
GEMINI_API_KEY=your-actual-api-key-here
```

### エラー: "File Search Store の作成に失敗"

**原因**: APIキーの権限不足、またはネットワークエラー

**解決方法**:

1. APIキーが正しいか確認
2. [Google AI Studio](https://aistudio.google.com/app/apikey) で新しいAPIキーを発行
3. インターネット接続を確認

### エラー: "Module not found: @google/genai"

**原因**: パッケージがインストールされていない

**解決方法**:

```bash
npm install @google/genai
```

---

## 📚 参考リンク

- [Google GenAI SDK GitHub](https://github.com/googleapis/js-genai)
- [Gemini File Search API](https://ai.google.dev/gemini-api/docs/file-search)
- [Google AI Studio](https://aistudio.google.com/)

---

## 次のステップ

Phase 1が完了したら、`doc/implementation-phase2-post-ui.md` に進んでください。
