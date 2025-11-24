# File Search v2実装設計書

## 📋 概要

画像を直接File Search Storeにアップロードする新しい実装方式。
Vision APIでのキャプション生成を削除し、Geminiが画像を直接解析する方式に変更。

**目標レスポンス時間**: 2-3秒（現状7.7秒から60-70%短縮）

---

## 🎯 主要な変更点

### 変更1: 画像の保存方式

```
❌ 旧方式:
画像 → Gemini Vision（キャプション生成） → JSONテキスト → File Search Store

✅ 新方式:
画像（JPEG/PNG） → 直接File Search Storeへアップロード
```

### 変更2: メタデータの扱い

```typescript
// ✅ 新方式: customMetadataでEXIF情報を添付
{
  file: imageBuffer,  // JPEG/PNGバイナリ
  config: {
    displayName: "photo_{post_id}.jpg",
    customMetadata: [
      { key: "post_id", stringValue: "xxx" },
      { key: "iso", numericValue: 100 },
      { key: "fValue", numericValue: 5.6 },
      { key: "shutterSpeed", stringValue: "1/400" },
      { key: "focalLength", numericValue: 37 },
      { key: "camera", stringValue: "SONY ILCE-6400" },
      { key: "description", stringValue: "紫陽花" }
    ],
    chunkingConfig: {
      whiteSpaceConfig: {
        maxTokensPerChunk: 500,  // 旧150 → 500に拡大
        maxOverlapTokens: 50,     // 旧15 → 50に拡大
      }
    }
  }
}
```

### 変更3: 検索クエリ

```typescript
// ✅ 新方式: 自然言語クエリ
"紫陽花を撮影した写真を探してください。ISO100、f/5.6、1/400秒、37mmで撮影されたものを探しています。";
```

---

## 📁 実装ファイル構成

### 新規作成ファイル

1. **lib/gemini/file-search-upload-v2.ts**
   - 画像を直接File Search Storeにアップロード
   - Vision APIは使用しない
   - チャンキング設定: 500トークン/50オーバーラップ

2. **lib/gemini/file-search-query-v2.ts**
   - 自然言語クエリで検索
   - gemini-2.5-flashを使用

3. **app/actions/posts-v2.ts**
   - 新しいアップロード・検索ロジック
   - 旧実装と並行して動作

4. **scripts/test-new-implementation.ts**
   - 新実装の検証用スクリプト
   - 1投稿をテストアップロード → 検索

5. **scripts/migrate-to-v2.ts**
   - 既存21投稿を新方式で再アップロード
   - 旧JSONドキュメントを削除
   - データベース更新

### 修正ファイル

なし（新規実装として並行開発）

### 削除予定ファイル（検証完了後）

1. **lib/gemini/caption.ts** - Vision API不要
2. **lib/gemini/file-search-upload.ts** - 旧アップロード関数
3. **lib/gemini/file-search-query.ts** - 旧検索関数
4. **app/actions/posts.ts** - 旧アクション（v2に統合）
5. **scripts/reupload-to-file-search.ts** - 旧再アップロードスクリプト

---

## 🔧 詳細設計

### 1. lib/gemini/file-search-upload-v2.ts

```typescript
import { GoogleGenAI } from "@google/genai";
import { ExifData } from "@/lib/types/exif";
import { getFileSearchStoreId } from "./file-search";

export interface UploadPhotoResult {
  success: boolean;
  documentName: string; // file_search_store_id
}

/**
 * 画像を直接File Search Storeにアップロード（v2）
 * Vision APIを使わず、画像をそのまま保存
 *
 * @param imageBuffer 画像のBuffer（JPEG/PNG）
 * @param postId 投稿ID
 * @param exifData Exif情報
 * @param description ユーザーの説明文
 * @returns アップロード結果
 */
export async function uploadPhotoToFileSearchV2(
  imageBuffer: Buffer,
  postId: string,
  exifData: ExifData,
  description: string
): Promise<UploadPhotoResult> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const storeId = getFileSearchStoreId();

  try {
    console.log(
      `📤 [V2] 画像を直接File Search Storeにアップロード中: photo_${postId}.jpg`
    );

    // 画像をBlobに変換
    const blob = new Blob([imageBuffer], { type: "image/jpeg" });

    // customMetadataを構築（検索に必要な情報のみ）
    const customMetadata = [
      { key: "post_id", stringValue: postId },
      { key: "content_type", stringValue: "photo" },
    ];

    // 説明文があれば追加
    if (description) {
      customMetadata.push({ key: "description", stringValue: description });
    }

    // EXIF情報を追加（数値は numericValue、文字列は stringValue）
    if (exifData.iso) {
      customMetadata.push({ key: "iso", numericValue: exifData.iso });
    }
    if (exifData.fValue) {
      customMetadata.push({ key: "fValue", numericValue: exifData.fValue });
    }
    if (exifData.shutterSpeed) {
      customMetadata.push({
        key: "shutterSpeed",
        stringValue: exifData.shutterSpeed,
      });
    }
    if (exifData.focalLength) {
      customMetadata.push({
        key: "focalLength",
        numericValue: exifData.focalLength,
      });
    }
    if (exifData.cameraModel) {
      customMetadata.push({ key: "camera", stringValue: exifData.cameraModel });
    }
    if (exifData.lens) {
      customMetadata.push({ key: "lens", stringValue: exifData.lens });
    }

    // File Search Storeにアップロード
    let operation = await ai.fileSearchStores.uploadToFileSearchStore({
      file: blob,
      fileSearchStoreName: storeId,
      config: {
        displayName: `photo_${postId}.jpg`,
        customMetadata: customMetadata,
        // チャンキング設定（公式推奨値）
        chunkingConfig: {
          whiteSpaceConfig: {
            maxTokensPerChunk: 500, // 公式推奨: 200-500
            maxOverlapTokens: 50, // 公式推奨: 50
          },
        },
      },
    });

    // アップロード完了を待機
    let attempts = 0;
    const maxAttempts = 60; // 最大60秒待機

    while (!operation.done && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      operation = await ai.operations.get({ operation });
      attempts++;

      if (attempts % 5 === 0) {
        console.log(`⏳ [V2] アップロード処理中... (${attempts}秒経過)`);
      }
    }

    if (!operation.done) {
      throw new Error("アップロードがタイムアウトしました");
    }

    console.log("✅ [V2] File Search Storeへのアップロード完了");

    // ドキュメント名を取得
    const documentName = (operation as any).response?.documentName || null;

    if (!documentName) {
      console.error("❌ [V2] ドキュメント名の取得に失敗しました");
      console.log(
        "🔍 [DEBUG] 完了した操作オブジェクト:",
        JSON.stringify(operation, null, 2)
      );
      throw new Error("ドキュメントIDの取得に失敗しました");
    }

    console.log(`📁 [V2] ドキュメント名: ${documentName}`);

    return {
      success: true,
      documentName: documentName,
    };
  } catch (error) {
    console.error("❌ [V2] File Search Storeへのアップロードに失敗:", error);
    throw new Error(
      `File Searchアップロード失敗: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
```

---

### 2. lib/gemini/file-search-query-v2.ts

```typescript
import { GoogleGenAI } from "@google/genai";
import { getFileSearchStoreId } from "./file-search";

export interface SearchResult {
  postIds: string[];
  aiResponse: string;
  conversationId: string;
}

export interface SimilarPostsResult {
  postIds: string[];
}

/**
 * 検索クエリを構築（v2: 自然言語形式）
 *
 * @param description ユーザーの説明文
 * @param exifData EXIF情報
 * @returns 自然言語クエリ
 */
function buildNaturalLanguageQuery(
  description: string | null,
  exifData: {
    iso?: number | null;
    fValue?: number | null;
    shutterSpeed?: string | null;
    focalLength?: number | null;
    cameraModel?: string | null;
    lens?: string | null;
  }
): string {
  const parts: string[] = [];

  // 説明文を先頭に配置
  if (description) {
    parts.push(`「${description}」のような写真を探してください。`);
  } else {
    parts.push("類似した写真を探してください。");
  }

  // 撮影設定を自然言語で追加
  const settings: string[] = [];
  if (exifData.iso) settings.push(`ISO${exifData.iso}`);
  if (exifData.fValue) settings.push(`F値f/${exifData.fValue}`);
  if (exifData.shutterSpeed)
    settings.push(`シャッタースピード${exifData.shutterSpeed}`);
  if (exifData.focalLength) settings.push(`焦点距離${exifData.focalLength}mm`);

  if (settings.length > 0) {
    parts.push(`撮影設定は${settings.join("、")}です。`);
  }

  // カメラ・レンズ情報
  if (exifData.cameraModel) {
    parts.push(`カメラは${exifData.cameraModel}を使用しています。`);
  }
  if (exifData.lens) {
    parts.push(`レンズは${exifData.lens}です。`);
  }

  return parts.join(" ");
}

/**
 * File Search APIで類似作例を検索（v2）
 * 自然言語クエリを使用
 *
 * @param query 検索クエリ（自然言語）
 * @returns 類似投稿のIDリスト
 */
export async function searchSimilarPostsWithFileSearchV2(
  query: string
): Promise<SimilarPostsResult> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const storeId = getFileSearchStoreId();

  try {
    console.log("🔍 [V2 SIMILAR] 類似作例検索開始:", query);

    const startTime = Date.now();

    // File Search APIで検索実行
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
              fileSearchStoreNames: [storeId],
            },
          },
        ],
      } as any,
    });

    const elapsed = Date.now() - startTime;
    console.log(`✅ [V2 SIMILAR] API呼び出し完了 (${elapsed}ms)`);

    // Grounding metadataからpost_idを抽出
    const postIds: string[] = [];
    const seenPostIds = new Set<string>();

    try {
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

      if (groundingMetadata) {
        console.log("🔍 [V2 SIMILAR] Grounding metadata検出");

        if (groundingMetadata.groundingChunks) {
          for (const chunk of groundingMetadata.groundingChunks) {
            try {
              const text = chunk.retrievedContext?.text;
              if (!text) continue;

              // customMetadataのpost_idを抽出
              // 新方式では画像ファイル自体が保存されているため、
              // retrievedContextにはメタデータ情報が含まれる
              const postIdMatch = text.match(/post_id["\s:]+([a-f0-9-]+)/i);
              if (postIdMatch && postIdMatch[1]) {
                const postId = postIdMatch[1];
                if (!seenPostIds.has(postId)) {
                  seenPostIds.add(postId);
                  postIds.push(postId);
                }
              }
            } catch (chunkError) {
              console.error("⚠️ [V2 SIMILAR] チャンク処理エラー:", chunkError);
            }
          }
        }

        console.log(`✅ [V2 SIMILAR] 抽出されたPost ID数: ${postIds.length}`);
      } else {
        console.log("⚠️ [V2 SIMILAR] Grounding metadataが見つかりませんでした");
      }
    } catch (error) {
      console.error("❌ [V2 SIMILAR] Grounding metadata抽出エラー:", error);
    }

    return { postIds };
  } catch (error) {
    console.error("❌ [V2] 類似作例検索に失敗しました:", error);
    throw new Error(
      `類似作例検索失敗: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// エクスポート: クエリ構築関数
export { buildNaturalLanguageQuery };
```

---

### 3. app/actions/posts-v2.ts

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { uploadPhotoToFileSearchV2 } from "@/lib/gemini/file-search-upload-v2";
import {
  searchSimilarPostsWithFileSearchV2,
  buildNaturalLanguageQuery,
} from "@/lib/gemini/file-search-query-v2";
import { Post } from "@/lib/types/post";

/**
 * 投稿を作成（v2: 画像直接アップロード方式）
 */
export async function createPostV2(formData: FormData) {
  const supabase = await createClient();

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("ログインが必要です");
  }

  // formDataから画像とメタデータを取得
  const file = formData.get("file") as File;
  const description = formData.get("description") as string;
  const exifDataStr = formData.get("exifData") as string;
  const exifData = exifDataStr ? JSON.parse(exifDataStr) : {};

  if (!file) {
    throw new Error("画像ファイルが必要です");
  }

  try {
    console.log("📤 [V2] 投稿作成開始");

    // 画像をBufferに変換
    const arrayBuffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // 仮のpost_idを生成（UUIDv4）
    const postId = crypto.randomUUID();

    // 1. Supabase Storageに画像をアップロード（表示用・サムネイル用）
    const filePath = `${user.id}/${postId}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(filePath, imageBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`画像アップロード失敗: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("photos").getPublicUrl(filePath);

    // 2. File Search Storeに画像を直接アップロード
    console.log("🔍 [V2] File Search Storeにアップロード中...");
    const uploadResult = await uploadPhotoToFileSearchV2(
      imageBuffer,
      postId,
      exifData,
      description
    );

    // 3. Supabaseのpostsテーブルに投稿を保存
    const { data: post, error: insertError } = await supabase
      .from("posts")
      .insert({
        id: postId,
        user_id: user.id,
        image_url: publicUrl,
        thumbnail_url: publicUrl, // サムネイル生成は別途実装
        description: description || null,
        exif_data: exifData,
        file_search_store_id: uploadResult.documentName,
        visibility: "public",
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`投稿の保存に失敗: ${insertError.message}`);
    }

    console.log("✅ [V2] 投稿作成完了:", post.id);

    return { success: true, post };
  } catch (error) {
    console.error("❌ [V2] 投稿作成エラー:", error);
    throw error;
  }
}

/**
 * 類似作例を取得（v2: 自然言語クエリ）
 */
export async function getSimilarPostsV2(postId: string) {
  const supabase = await createClient();

  try {
    console.log(`🔍 [V2] 類似作例を検索中: ${postId}`);

    // キャッシュをチェック
    const { data: cached } = await supabase
      .from("similar_posts_cache")
      .select("similar_post_ids")
      .eq("post_id", postId)
      .gte(
        "created_at",
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      )
      .single();

    if (cached && cached.similar_post_ids.length > 0) {
      console.log("✅ [V2 SERVER CACHE] キャッシュヒット");

      // キャッシュから投稿を取得
      const { data: posts } = await supabase
        .from("posts")
        .select("*")
        .in("id", cached.similar_post_ids);

      return posts || [];
    }

    console.log("🔍 [V2 SERVER CACHE] キャッシュミス、Gemini APIで検索");

    // 投稿情報を取得
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .single();

    if (postError || !post) {
      throw new Error("投稿が見つかりません");
    }

    // 自然言語クエリを構築
    const query = buildNaturalLanguageQuery(
      post.description,
      post.exif_data || {}
    );

    console.log("📝 [V2] 検索クエリ:", query);

    // File Search APIで検索
    const result = await searchSimilarPostsWithFileSearchV2(query);

    if (result.postIds.length === 0) {
      console.log("⚠️ [V2] 類似作例が見つかりませんでした");
      return [];
    }

    // 自分自身を除外
    const similarPostIds = result.postIds.filter((id) => id !== postId);

    if (similarPostIds.length === 0) {
      return [];
    }

    // 投稿データを取得
    const { data: similarPosts } = await supabase
      .from("posts")
      .select("*")
      .in("id", similarPostIds);

    // キャッシュに保存
    await supabase.from("similar_posts_cache").upsert({
      post_id: postId,
      similar_post_ids: similarPostIds,
      created_at: new Date().toISOString(),
    });

    console.log(`✅ [V2] ${similarPosts?.length || 0}件の類似作例を取得`);

    return similarPosts || [];
  } catch (error) {
    console.error("❌ [V2] 類似作例取得エラー:", error);
    return [];
  }
}
```

---

### 4. scripts/test-new-implementation.ts

```typescript
/**
 * 新実装（v2）の検証スクリプト
 * 1投稿をテストアップロード → 検索してパフォーマンスを測定
 */
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { uploadPhotoToFileSearchV2 } from "@/lib/gemini/file-search-upload-v2";
import {
  searchSimilarPostsWithFileSearchV2,
  buildNaturalLanguageQuery,
} from "@/lib/gemini/file-search-query-v2";

async function testNewImplementation() {
  console.log("=".repeat(80));
  console.log("新実装（v2）の検証開始");
  console.log("=".repeat(80));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  // テスト用の投稿を1件取得
  const { data: testPost, error } = await supabase
    .from("posts")
    .select("*")
    .limit(1)
    .single();

  if (error || !testPost) {
    console.error("❌ テスト用投稿の取得に失敗");
    return;
  }

  console.log(`\n📋 テスト対象投稿: ${testPost.id}`);
  console.log(`説明文: ${testPost.description || "(なし)"}`);
  console.log(
    `EXIF: ISO${testPost.exif_data?.iso || "-"}, f/${testPost.exif_data?.fValue || "-"}`
  );

  try {
    // 画像をダウンロード
    console.log(`\n⬇️ 画像をダウンロード中: ${testPost.image_url}`);
    const imageResponse = await fetch(testPost.image_url);
    if (!imageResponse.ok) {
      throw new Error("画像のダウンロードに失敗");
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // v2方式でアップロード
    console.log("\n📤 [V2] 新方式でアップロード開始...");
    const uploadStart = Date.now();

    const result = await uploadPhotoToFileSearchV2(
      imageBuffer,
      `test_${testPost.id}`,
      testPost.exif_data || {},
      testPost.description || ""
    );

    const uploadTime = Date.now() - uploadStart;
    console.log(`✅ アップロード完了: ${uploadTime}ms`);
    console.log(`📁 ドキュメント名: ${result.documentName}`);

    // 少し待機（インデックス作成のため）
    console.log("\n⏳ インデックス作成を待機中... (5秒)");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 検索テスト
    console.log("\n🔍 検索テスト開始...");
    const query = buildNaturalLanguageQuery(
      testPost.description,
      testPost.exif_data || {}
    );
    console.log(`📝 クエリ: ${query}`);

    const searchStart = Date.now();
    const searchResult = await searchSimilarPostsWithFileSearchV2(query);
    const searchTime = Date.now() - searchStart;

    console.log(`\n✅ 検索完了: ${searchTime}ms`);
    console.log(`📊 検出されたPost ID数: ${searchResult.postIds.length}`);
    console.log(`📋 Post IDs:`, searchResult.postIds);

    // パフォーマンスサマリー
    console.log("\n" + "=".repeat(80));
    console.log("パフォーマンスサマリー");
    console.log("=".repeat(80));
    console.log(`アップロード時間: ${uploadTime}ms`);
    console.log(`検索時間: ${searchTime}ms`);
    console.log(`合計: ${uploadTime + searchTime}ms`);
    console.log("\n現状との比較:");
    console.log(`現状の平均検索時間: 7,700ms`);
    console.log(`新方式の検索時間: ${searchTime}ms`);
    console.log(`改善率: ${Math.round((1 - searchTime / 7700) * 100)}%`);
    console.log("=".repeat(80));
  } catch (error) {
    console.error("\n❌ エラーが発生しました:", error);
  }
}

testNewImplementation().catch(console.error);
```

---

### 5. scripts/migrate-to-v2.ts

```typescript
/**
 * 既存投稿をv2方式に移行
 * 旧JSONドキュメントを削除 → 画像を直接アップロード → DB更新
 */
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { uploadPhotoToFileSearchV2 } from "@/lib/gemini/file-search-upload-v2";
import { deleteFileFromStore } from "@/lib/gemini/file-search";

async function migrateToV2() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("=".repeat(80));
  console.log("既存投稿のv2移行開始");
  console.log("=".repeat(80));

  // すべての投稿を取得
  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !posts) {
    console.error("❌ 投稿の取得に失敗");
    return;
  }

  console.log(`\n📊 合計 ${posts.length} 件の投稿を移行します\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log("-".repeat(80));
    console.log(`[${i + 1}/${posts.length}] 投稿ID: ${post.id}`);

    try {
      // 旧ドキュメントを削除
      if (post.file_search_store_id) {
        console.log(`🗑️ 旧ドキュメントを削除: ${post.file_search_store_id}`);
        await deleteFileFromStore(post.file_search_store_id);
      }

      // 画像をダウンロード
      console.log(`⬇️ 画像をダウンロード: ${post.image_url}`);
      const imageResponse = await fetch(post.image_url);
      if (!imageResponse.ok) {
        throw new Error("画像のダウンロードに失敗");
      }
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

      // v2方式でアップロード
      console.log("📤 [V2] 新方式でアップロード中...");
      const result = await uploadPhotoToFileSearchV2(
        imageBuffer,
        post.id,
        post.exif_data || {},
        post.description || ""
      );

      // DBを更新
      console.log("💾 データベース更新中...");
      const { error: updateError } = await supabase
        .from("posts")
        .update({ file_search_store_id: result.documentName })
        .eq("id", post.id);

      if (updateError) {
        throw new Error(`DB更新エラー: ${updateError.message}`);
      }

      // キャッシュをクリア
      await supabase
        .from("similar_posts_cache")
        .delete()
        .eq("post_id", post.id);

      console.log("✅ 移行完了");
      successCount++;

      // レート制限を避けるため待機
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(
        "❌ エラー:",
        error instanceof Error ? error.message : error
      );
      errorCount++;
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("移行完了");
  console.log("=".repeat(80));
  console.log(`✅ 成功: ${successCount} 件`);
  console.log(`❌ エラー: ${errorCount} 件`);
  console.log("=".repeat(80));
}

migrateToV2().catch(console.error);
```

---

## 🔄 実装の流れ

### フェーズ1: 検証（1-2時間）

1. ✅ 新規ファイルを作成
   - `lib/gemini/file-search-upload-v2.ts`
   - `lib/gemini/file-search-query-v2.ts`
   - `scripts/test-new-implementation.ts`

2. ✅ 検証スクリプトを実行

   ```bash
   npm run tsx scripts/test-new-implementation.ts
   ```

3. ✅ パフォーマンス測定
   - 目標: 検索時間が7,700ms → 2,000-3,000ms（60-70%短縮）
   - 検出精度: 類似作例が適切に取得できるか確認

### フェーズ2: 本番実装（2-3時間）

4. ✅ 結果が良好な場合、本番実装を進める
   - `app/actions/posts-v2.ts` を作成
   - フロントエンドでv2アクションを使用

5. ✅ 新しい投稿でテスト
   - 投稿作成 → 類似作例検索の一連の流れを確認

### フェーズ3: 既存データ移行（2-3時間）

6. ✅ 移行スクリプトを実行

   ```bash
   npm run tsx scripts/migrate-to-v2.ts
   ```

7. ✅ 全投稿で動作確認

### フェーズ4: クリーンアップ（1時間）

8. ✅ 旧実装ファイルを削除
   - `lib/gemini/caption.ts`
   - `lib/gemini/file-search-upload.ts`
   - `lib/gemini/file-search-query.ts`
   - `scripts/reupload-to-file-search.ts`

9. ✅ `posts-v2.ts` → `posts.ts` にリネーム

10. ✅ ドキュメント更新

---

## 📊 期待される効果

| 項目                   | 現状                        | v2実装後             | 改善率      |
| ---------------------- | --------------------------- | -------------------- | ----------- |
| **検索レスポンス時間** | 7.7秒                       | 2-3秒                | **-60~70%** |
| **投稿処理時間**       | 不明                        | Vision API削除で短縮 | **-30~50%** |
| **API呼び出し回数**    | 2回（Vision + File Search） | 1回（File Search）   | **-50%**    |
| **月間コスト**         | Vision + File Search        | File Searchのみ      | **-30~40%** |

---

## ⚠️ 注意事項

### データの二重管理

- **Supabase Storage**: 画像の表示・サムネイル用
- **File Search Store**: 検索用
- **Supabase DB**: メタデータ・EXIF情報

すべて必要です。File Search Storeだけでは画像表示が遅くなります。

### customMetadataの抽出

新方式では、画像ファイルがFile Searchに保存されるため、`retrievedContext`の形式が変わる可能性があります。
テスト時に実際のレスポンスを確認し、必要に応じて抽出ロジックを調整してください。

### チャンキング設定

公式推奨値（500トークン/50オーバーラップ）を使用していますが、画像の場合は異なる可能性があります。
テスト結果を見て調整してください。

---

## 🎯 成功基準

1. ✅ 検索時間が **3秒以内**に収まる
2. ✅ 類似作例の検出精度が現状と同等以上
3. ✅ すべての既存投稿が正常に移行できる
4. ✅ 新規投稿が問題なく作成できる

これらがすべて達成できれば、旧実装を削除してv2に完全移行します。

---

## 📝 次のステップ

1. この設計書をレビュー
2. 承認後、フェーズ1（検証）の実装を開始
3. 結果を報告 → 次のフェーズに進むか判断
