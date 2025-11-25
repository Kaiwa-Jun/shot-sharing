# Embedding-Based Similar Posts Implementation Plan

## 概要

Gemini Embedding APIとSupabase pgvectorを使用した、視覚情報ベースの高速な類似作例検索システムの実装計画。

### 目的

- **パフォーマンス改善**: 8-18秒 → **1-3秒** (-80-90%)
- **視覚情報の活用**: 画像の視覚的特徴を直接利用した類似度検索
- **コスト削減**: Embedding生成は初回のみ、検索はローカルDB
- **拡張性**: 将来的な機能追加に対応しやすい設計

---

## アーキテクチャ概要

### 現在のアーキテクチャ (File Search Store)

```
投稿作成
  ↓
JSON生成 (説明文 + EXIF)
  ↓
File Search Storeにアップロード
  ↓
Gemini File Search APIでベクトル検索 (8-18秒)
  ↓
類似投稿IDを取得
```

**問題点**:

- テキスト情報のみ（視覚情報を活用できない）
- File Search API呼び出しが遅い（8-18秒）
- Gemini APIへの依存度が高い

---

### 新しいアーキテクチャ (Embedding + pgvector)

```
投稿作成
  ↓
画像バッファ取得
  ↓
Gemini Embedding API (multimodal-embedding-001)
  ↓
768次元ベクトル生成
  ↓
Supabase pgvectorに保存
  ↓
ベクトル類似度検索 (1-3秒)
  ↓
類似投稿IDを取得
```

**メリット**:

- ✅ 視覚情報を直接活用
- ✅ ローカルDB検索で高速化
- ✅ Embedding生成は初回のみ（コスト削減）
- ✅ File Search Storeとは**完全に別の仕組み**

---

## File Search Storeとの関係

### ❓ File Search Storeはどうなる？

**結論**: **並行稼働 → 検証後に切り替え**

#### Phase 1: 並行稼働期間 (実装〜検証)

```typescript
// 既存: File Search Store (検索機能で使用)
export async function searchWithFileSearch(query: string);

// 新規: Embedding検索 (類似作例のみ)
export async function getSimilarPostsWithEmbedding(postId: string);
```

- **検索機能 (FAB)**: File Search Storeを継続使用
- **類似作例 (新規UI)**: Embedding検索を使用
- データは両方に保存される

#### Phase 2: 検証期間

- 新旧UIを比較テスト
- パフォーマンス・精度を評価
- ユーザーフィードバック収集

#### Phase 3: 完全移行 (検証成功後)

```typescript
// 既存UIを削除して新UIに統一
// File Search Storeは検索機能専用に
// 類似作例はEmbedding検索に一本化
```

---

## データベーススキーマ

### 新規テーブル: `post_embeddings`

```sql
-- pgvector拡張を有効化
CREATE EXTENSION IF NOT EXISTS vector;

-- Embeddingテーブル
CREATE TABLE post_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  embedding vector(768) NOT NULL,
  model_version TEXT NOT NULL DEFAULT 'multimodal-embedding-001',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(post_id)
);

-- ベクトル類似度検索用のインデックス (IVFFlat)
CREATE INDEX post_embeddings_embedding_idx
ON post_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- post_idでの検索用インデックス
CREATE INDEX post_embeddings_post_id_idx
ON post_embeddings(post_id);
```

### ベクトル類似度検索関数

```sql
-- 類似投稿を検索するRPC関数
CREATE OR REPLACE FUNCTION match_similar_posts(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  exclude_post_id uuid DEFAULT NULL
)
RETURNS TABLE (
  post_id uuid,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pe.post_id,
    1 - (pe.embedding <=> query_embedding) AS similarity
  FROM post_embeddings pe
  WHERE
    (exclude_post_id IS NULL OR pe.post_id != exclude_post_id)
    AND (1 - (pe.embedding <=> query_embedding)) > match_threshold
  ORDER BY pe.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## 実装フェーズ

### Phase 1: インフラ準備 (1-2時間)

**1.1 Supabase pgvector設定**

```sql
-- Supabase Dashboard > SQL Editor で実行
-- 上記のスキーマとRPC関数を作成
```

**1.2 Gemini SDK更新**

```bash
npm install @google/generative-ai@latest
```

**1.3 環境変数確認**

```bash
# .env.local
GEMINI_API_KEY=your_key_here
NEXT_PUBLIC_SUPABASE_URL=your_url_here
SUPABASE_SERVICE_ROLE_KEY=your_key_here
```

---

### Phase 2: Embedding生成機能 (2-3時間)

**2.1 Gemini Embedding APIラッパー**

`lib/gemini/embedding.ts` (新規作成)

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * 画像からEmbeddingを生成
 * @param imageBuffer 画像のバイナリデータ
 * @param mimeType 画像のMIMEタイプ
 * @returns 768次元のEmbeddingベクトル
 */
export async function generateImageEmbedding(
  imageBuffer: Buffer,
  mimeType: string
): Promise<number[]> {
  const model = genAI.getGenerativeModel({
    model: "multimodal-embedding-001",
  });

  const result = await model.embedContent({
    content: {
      parts: [
        {
          inlineData: {
            data: imageBuffer.toString("base64"),
            mimeType,
          },
        },
      ],
    },
  });

  return result.embedding.values;
}

/**
 * 既存画像URLからEmbeddingを生成
 * @param imageUrl Supabase StorageのURL
 */
export async function generateEmbeddingFromUrl(
  imageUrl: string
): Promise<number[]> {
  // 画像をダウンロード
  const response = await fetch(imageUrl);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const mimeType = response.headers.get("content-type") || "image/jpeg";

  return generateImageEmbedding(buffer, mimeType);
}
```

**2.2 Embedding保存機能**

`lib/supabase/embeddings.ts` (新規作成)

```typescript
import { createClient } from "@/lib/supabase/server";

/**
 * EmbeddingをSupabaseに保存
 */
export async function savePostEmbedding(
  postId: string,
  embedding: number[]
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("post_embeddings").upsert({
    post_id: postId,
    embedding: `[${embedding.join(",")}]`,
    model_version: "multimodal-embedding-001",
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to save embedding: ${error.message}`);
  }
}

/**
 * 類似投稿を検索
 */
export async function findSimilarPosts(
  queryEmbedding: number[],
  excludePostId?: string,
  limit: number = 10,
  threshold: number = 0.7
): Promise<{ post_id: string; similarity: number }[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("match_similar_posts", {
    query_embedding: `[${queryEmbedding.join(",")}]`,
    match_threshold: threshold,
    match_count: limit,
    exclude_post_id: excludePostId || null,
  });

  if (error) {
    throw new Error(`Failed to find similar posts: ${error.message}`);
  }

  return data || [];
}
```

---

### Phase 3: 投稿作成時のEmbedding生成 (1-2時間)

**3.1 投稿作成処理の拡張**

`app/actions/posts.ts` (既存ファイルに追加)

```typescript
import { generateImageEmbedding } from "@/lib/gemini/embedding";
import { savePostEmbedding } from "@/lib/supabase/embeddings";

/**
 * 投稿作成処理（Embedding追加版）
 */
export async function createPostWithEmbedding(formData: FormData) {
  // 既存の投稿作成処理
  const result = await createPost(formData);

  if (!result.success || !result.postId) {
    return result;
  }

  try {
    // 画像バッファを取得
    const imageFile = formData.get("image") as File;
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Embedding生成
    console.log("🔮 Embedding生成中...");
    const embedding = await generateImageEmbedding(buffer, imageFile.type);

    // Supabaseに保存
    await savePostEmbedding(result.postId, embedding);
    console.log("✅ Embedding保存完了");

    return result;
  } catch (error) {
    console.error("⚠️ Embedding生成失敗（投稿は作成済み）:", error);
    // Embedding失敗しても投稿は成功扱い
    return result;
  }
}
```

---

### Phase 4: 類似作例取得機能 (新規) (2-3時間)

**4.1 Embeddingベースの類似作例取得**

`app/actions/similar-posts-embedding.ts` (新規作成)

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { findSimilarPosts } from "@/lib/supabase/embeddings";

/**
 * Embeddingベースで類似作例を取得
 */
export async function getSimilarPostsWithEmbedding(
  postId: string,
  limit: number = 10
) {
  const startTime = Date.now();
  console.log(`🔍 [EMBEDDING] 類似作例を検索中: ${postId}`);

  try {
    const supabase = await createClient();

    // 1. 対象投稿のEmbeddingを取得
    const { data: embeddingData, error: embeddingError } = await supabase
      .from("post_embeddings")
      .select("embedding")
      .eq("post_id", postId)
      .single();

    if (embeddingError || !embeddingData) {
      console.error("❌ Embedding not found:", embeddingError);
      return { data: [], error: "Embedding not found" };
    }

    // 2. 類似投稿を検索
    const searchStart = Date.now();
    const similarPosts = await findSimilarPosts(
      embeddingData.embedding,
      postId,
      limit,
      0.7 // 類似度閾値
    );
    console.log(`⏱️ [PERF] ベクトル検索: ${Date.now() - searchStart}ms`);

    // 3. 投稿データを取得
    const postIds = similarPosts.map((p) => p.post_id);
    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("*")
      .in("id", postIds);

    if (postsError) {
      console.error("❌ Posts fetch error:", postsError);
      return { data: [], error: postsError.message };
    }

    // 類似度順にソート
    const sortedPosts = posts?.sort((a, b) => {
      const simA =
        similarPosts.find((p) => p.post_id === a.id)?.similarity || 0;
      const simB =
        similarPosts.find((p) => p.post_id === b.id)?.similarity || 0;
      return simB - simA;
    });

    console.log(`✅ ${sortedPosts?.length || 0}件の類似作例を検出`);
    console.log(`⏱️ [PERF] 合計処理時間: ${Date.now() - startTime}ms`);

    return { data: sortedPosts || [], error: null };
  } catch (error: any) {
    console.error("❌ Error:", error);
    return { data: [], error: error.message };
  }
}
```

---

### Phase 5: 新規UI実装 (2-3時間)

**5.1 新しい類似作例カルーセル**

`components/post-detail/similar-posts-carousel-v2.tsx` (新規作成)

```typescript
"use client";

import { useEffect, useState } from "react";
import { getSimilarPostsWithEmbedding } from "@/app/actions/similar-posts-embedding";
import { Post } from "@/lib/types/database.types";
import { PhotoCard } from "@/components/photo-card";

interface SimilarPostsCarouselV2Props {
  postId: string;
}

export function SimilarPostsCarouselV2({ postId }: SimilarPostsCarouselV2Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadTime, setLoadTime] = useState<number | null>(null);

  useEffect(() => {
    async function fetchSimilarPosts() {
      const start = Date.now();
      setLoading(true);

      const { data } = await getSimilarPostsWithEmbedding(postId, 10);

      const time = Date.now() - start;
      setLoadTime(time);
      setPosts(data || []);
      setLoading(false);
    }

    fetchSimilarPosts();
  }, [postId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
        <span>AI分析中...</span>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        類似作例が見つかりませんでした
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          類似作例 (NEW) 🚀
        </h3>
        {loadTime !== null && (
          <span className="text-xs text-muted-foreground">
            {(loadTime / 1000).toFixed(2)}秒
          </span>
        )}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {posts.map((post) => (
          <div key={post.id} className="flex-none w-64">
            <PhotoCard post={post} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**5.2 投稿詳細モーダルに新UIを追加**

`components/post-detail-modal.tsx` (既存ファイルに追加)

```typescript
import { SimilarPostsCarousel } from "./post-detail/similar-posts-carousel"; // 既存
import { SimilarPostsCarouselV2 } from "./post-detail/similar-posts-carousel-v2"; // 新規

export function PostDetailModal({ post }: { post: Post }) {
  return (
    <div>
      {/* 既存のUI */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold">類似作例 (File Search)</h2>
        <SimilarPostsCarousel postId={post.id} />
      </div>

      {/* 新規のUI */}
      <div className="space-y-6 mt-8 border-t pt-8">
        <h2 className="text-xl font-bold">類似作例 (Embedding)</h2>
        <SimilarPostsCarouselV2 postId={post.id} />
      </div>
    </div>
  );
}
```

---

### Phase 6: 既存投稿のEmbedding生成 (1時間)

**6.1 バッチ処理スクリプト**

`scripts/generate-embeddings-batch.ts` (新規作成)

```typescript
import { createClient } from "@supabase/supabase-js";
import { generateEmbeddingFromUrl } from "../lib/gemini/embedding";
import { savePostEmbedding } from "../lib/supabase/embeddings";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 既存の全投稿にEmbeddingを生成
 */
async function generateEmbeddingsForAllPosts() {
  console.log("🔮 既存投稿のEmbedding生成を開始\n");

  // Embeddingが未生成の投稿を取得
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, image_url")
    .not("image_url", "is", null)
    .limit(100); // 最初は100件まで

  if (error || !posts) {
    console.error("❌ エラー:", error);
    return;
  }

  console.log(`📊 ${posts.length}件の投稿を処理します\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(`[${i + 1}/${posts.length}] 処理中: ${post.id}`);

    try {
      // 既にEmbeddingが存在するかチェック
      const { data: existing } = await supabase
        .from("post_embeddings")
        .select("id")
        .eq("post_id", post.id)
        .single();

      if (existing) {
        console.log("  ⏭️  スキップ（既存）\n");
        continue;
      }

      // Embedding生成
      const embedding = await generateEmbeddingFromUrl(post.image_url);
      await savePostEmbedding(post.id, embedding);

      successCount++;
      console.log("  ✅ 完了\n");

      // Rate Limit考慮（1秒待機）
      if (i < posts.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error: any) {
      failCount++;
      console.error(`  ❌ 失敗: ${error.message}\n`);
    }
  }

  console.log("=".repeat(80));
  console.log(`\n✅ 完了`);
  console.log(`  成功: ${successCount}件`);
  console.log(`  失敗: ${failCount}件`);
}

generateEmbeddingsForAllPosts();
```

**6.2 実行**

```bash
npx tsx scripts/generate-embeddings-batch.ts
```

---

## 検証・比較方法

### パフォーマンス計測

**投稿詳細モーダルで両方のUIを表示し、レスポンス時間を比較**

| 指標             | File Search    | Embedding  | 改善率  |
| ---------------- | -------------- | ---------- | ------- |
| 初回読み込み     | 8-18秒         | 1-3秒      | -70-90% |
| キャッシュヒット | <100ms         | <100ms     | 同等    |
| 精度             | テキストベース | 視覚ベース | 要検証  |

### 精度評価

1. **手動テスト**: 同じ投稿で両方の類似作例を比較
2. **ユーザーフィードバック**: どちらが正確かを評価
3. **定量評価**: クリック率・滞在時間を計測

---

## コスト試算（詳細版）

### 前提条件

**ユーザー行動の想定**:

- 1人あたり月間投稿数: 10投稿
- 1人あたり月間類似作例閲覧: 50回
- 初回データ: 既存投稿100件

**APIの料金 (2025年1月現在)**:

| API                           | 料金                         |
| ----------------------------- | ---------------------------- |
| Gemini Embedding API          | $0.00025 / 1,000 images      |
| Gemini File Search - Indexing | $0.15 / 1M tokens            |
| Gemini File Search - Query    | 無料                         |
| Supabase (Free Tier)          | $0 (500MB DB, 1GB bandwidth) |

---

### パターン1: ユーザー数 10人

#### Embedding方式

**初回セットアップ**:

```text
既存100投稿 × $0.00025/1,000 = $0.025
```

**月間コスト**:

```text
新規投稿: 10人 × 10投稿 × $0.00025/1,000 = $0.0025/月
検索実行: 無料（ローカルDB検索）
```

**年間コスト**:

```text
初回: $0.025
月間: $0.0025 × 12 = $0.03
年間合計: $0.055
```

#### File Search Store方式

**初回セットアップ**:

```text
既存100投稿 × 500 tokens × $0.15/1M = $7.50
```

**月間コスト**:

```text
新規投稿: 10人 × 10投稿 × 500 tokens × $0.15/1M = $0.075/月
検索実行: 無料
```

**年間コスト**:

```text
初回: $7.50
月間: $0.075 × 12 = $0.90
年間合計: $8.40
```

**💰 コスト比較（10人）**:

| 方式        | 年間コスト | 削減額     | 削減率     |
| ----------- | ---------- | ---------- | ---------- |
| Embedding   | **$0.055** | -          | -          |
| File Search | $8.40      | **-$8.35** | **-99.3%** |

---

### パターン2: ユーザー数 50人

#### Embedding方式

**初回セットアップ**:

```text
既存100投稿 × $0.00025/1,000 = $0.025
```

**月間コスト**:

```text
新規投稿: 50人 × 10投稿 × $0.00025/1,000 = $0.0125/月
検索実行: 無料
```

**年間コスト**:

```text
初回: $0.025
月間: $0.0125 × 12 = $0.15
年間合計: $0.175
```

#### File Search Store方式

**初回セットアップ**:

```text
既存100投稿 × 500 tokens × $0.15/1M = $7.50
```

**月間コスト**:

```text
新規投稿: 50人 × 10投稿 × 500 tokens × $0.15/1M = $0.375/月
検索実行: 無料
```

**年間コスト**:

```text
初回: $7.50
月間: $0.375 × 12 = $4.50
年間合計: $12.00
```

**💰 コスト比較（50人）**:

| 方式        | 年間コスト | 削減額      | 削減率     |
| ----------- | ---------- | ----------- | ---------- |
| Embedding   | **$0.175** | -           | -          |
| File Search | $12.00     | **-$11.83** | **-98.5%** |

---

### パターン3: ユーザー数 100人

#### Embedding方式

**初回セットアップ**:

```text
既存100投稿 × $0.00025/1,000 = $0.025
```

**月間コスト**:

```text
新規投稿: 100人 × 10投稿 × $0.00025/1,000 = $0.025/月
検索実行: 無料
```

**年間コスト**:

```text
初回: $0.025
月間: $0.025 × 12 = $0.30
年間合計: $0.325
```

#### File Search Store方式

**初回セットアップ**:

```text
既存100投稿 × 500 tokens × $0.15/1M = $7.50
```

**月間コスト**:

```text
新規投稿: 100人 × 10投稿 × 500 tokens × $0.15/1M = $0.75/月
検索実行: 無料
```

**年間コスト**:

```text
初回: $7.50
月間: $0.75 × 12 = $9.00
年間合計: $16.50
```

**💰 コスト比較（100人）**:

| 方式        | 年間コスト | 削減額      | 削減率     |
| ----------- | ---------- | ----------- | ---------- |
| Embedding   | **$0.325** | -           | -          |
| File Search | $16.50     | **-$16.18** | **-98.0%** |

---

### 総合比較表

| ユーザー数 | Embedding (年間) | File Search (年間) | 削減額      | 削減率     | パフォーマンス改善 |
| ---------- | ---------------- | ------------------ | ----------- | ---------- | ------------------ |
| **10人**   | $0.055           | $8.40              | **-$8.35**  | **-99.3%** | 8-18秒 → 1-3秒     |
| **50人**   | $0.175           | $12.00             | **-$11.83** | **-98.5%** | 8-18秒 → 1-3秒     |
| **100人**  | $0.325           | $16.50             | **-$16.18** | **-98.0%** | 8-18秒 → 1-3秒     |

---

### コスト内訳の詳細

#### Embedding方式のコスト構造

```text
初回セットアップ: 一度きり
└── 既存投稿のEmbedding生成

月間コスト: 新規投稿のみ
├── 新規投稿のEmbedding生成
└── 検索実行: 無料（Supabase pgvector）

ストレージ: 無料（Supabase Free Tierで十分）
├── 768次元ベクトル × 投稿数
└── 1,000投稿 ≈ 3MB（Free Tierは500MB）
```

#### File Search Store方式のコスト構造

```text
初回セットアップ: 一度きり
└── 既存投稿のJSON生成 + インデックス作成

月間コスト: 新規投稿のみ
├── 新規投稿のJSON生成 + インデックス作成
└── 検索実行: 無料

ストレージ: 無料（File Search Storeは1GB無料）
├── JSON × 投稿数
└── File Search Storeで管理
```

---

### Supabaseストレージ試算

**pgvectorデータサイズ**:

```text
1投稿のEmbedding: 768次元 × 4 bytes (float32) = 3,072 bytes ≈ 3KB

100投稿: 3KB × 100 = 300KB
1,000投稿: 3KB × 1,000 = 3MB
10,000投稿: 3KB × 10,000 = 30MB
```

**結論**: Supabase Free Tier (500MB DB) で**10,000投稿以上**対応可能

---

### ROI（投資対効果）分析

#### 開発工数コスト

**仮定**: エンジニア時給 $50

```text
開発時間: 9-14時間
開発コスト: $450 - $700
```

#### 回収期間

**10人の場合**:

```text
年間削減額: $8.35
回収期間: $700 / $8.35 = 84年 ❌
```

**50人の場合**:

```text
年間削減額: $11.83
回収期間: $700 / $11.83 = 59年 ❌
```

**100人の場合**:

```text
年間削減額: $16.18
回収期間: $700 / $16.18 = 43年 ❌
```

**⚠️ 注意**: コスト削減だけでは投資回収が難しい

#### 真の価値: パフォーマンス改善

**コスト削減より重要な価値**:

1. **ユーザー体験の向上**: 8-18秒 → 1-3秒（-70-90%）
2. **離脱率の低減**: レスポンスが速いほど離脱率が下がる
3. **視覚情報の活用**: より正確な類似作例の提案
4. **サーバー負荷の削減**: Gemini API呼び出し頻度の削減

**参考**: Googleの調査によると、ページ読み込み時間が1秒増えるごとにコンバージョン率は7%低下

---

### 結論

#### コスト面

- **Embedding方式は年間$8-16削減**（98-99%削減）
- 投資回収にはユーザー数が必要
- ただし、**コストは両方式とも年間$20以下で微々たる額**

#### パフォーマンス面

- **8-18秒 → 1-3秒の劇的な改善**
- ユーザー体験の大幅な向上
- 視覚情報を活用した高精度な検索

#### 総合判断

**Embedding方式を推奨する理由**:

1. ✅ **圧倒的なパフォーマンス改善**（主要価値）
2. ✅ コスト削減（副次的価値）
3. ✅ スケーラビリティ（ユーザー数増加に強い）
4. ✅ 視覚情報の活用（精度向上）

コスト削減額は小さいですが、**ユーザー体験の改善による価値**ははるかに大きいです。

---

## マイグレーション計画

### Step 1: 並行稼働開始

- 新旧UIを同時表示
- データは両方に保存
- File Search Storeは継続使用

### Step 2: 検証期間 (2週間)

- パフォーマンス計測
- 精度評価
- ユーザーフィードバック収集

### Step 3: 完全移行判断

**条件**:

- ✅ レスポンス時間が3秒以内
- ✅ 精度がFile Search以上
- ✅ ユーザーフィードバックが好評

**移行時の処理**:

1. 既存UIを削除
2. 新UIをデフォルトに
3. File Search Storeは検索機能専用に

### Step 4: クリーンアップ

```typescript
// 削除対象
- components/post-detail/similar-posts-carousel.tsx (旧)
- app/actions/posts.ts の searchSimilarPosts() 関数
- similar_posts_cache テーブル（不要になる）

// 残す
- File Search Store（検索機能で使用）
- searchWithFileSearch()（検索機能）
```

---

## リスクと対策

### リスク1: Embedding生成失敗

**対策**: 投稿作成は成功扱い、Embeddingはバックグラウンドで再試行

### リスク2: pgvectorのパフォーマンス低下

**対策**: インデックスの調整、必要に応じてPinecone等の専用DBを検討

### リスク3: 精度がFile Searchより低い

**対策**: 類似度閾値の調整、テキスト情報も組み合わせる

---

## 開発スケジュール

| フェーズ | 作業内容          | 所要時間     |
| -------- | ----------------- | ------------ |
| Phase 1  | インフラ準備      | 1-2時間      |
| Phase 2  | Embedding生成機能 | 2-3時間      |
| Phase 3  | 投稿作成拡張      | 1-2時間      |
| Phase 4  | 類似作例取得      | 2-3時間      |
| Phase 5  | 新規UI実装        | 2-3時間      |
| Phase 6  | 既存投稿処理      | 1時間        |
| **合計** | -                 | **9-14時間** |

---

## まとめ

### File Search Storeとの違い

| 項目           | File Search Store | Embedding + pgvector |
| -------------- | ----------------- | -------------------- |
| **用途**       | テキスト検索・RAG | 画像類似度検索       |
| **データ形式** | JSON (テキスト)   | ベクトル (768次元)   |
| **検索速度**   | 8-18秒            | 1-3秒                |
| **視覚情報**   | ❌                | ✅                   |
| **コスト**     | 中                | 低                   |
| **依存関係**   | Gemini API        | ローカルDB           |

### 並行稼働の理由

1. **リスク低減**: 既存機能を壊さない
2. **比較検証**: 実データで性能比較
3. **段階的移行**: ユーザー影響を最小化
4. **機能分離**: 検索とレコメンドは別の仕組みで

### 最終形態

- **検索機能 (FAB)**: File Search Store継続
- **類似作例**: Embedding検索に移行
- **投稿作成**: 両方のデータを生成（将来的にEmbeddingのみに）

この設計により、リスクを抑えつつ大幅なパフォーマンス改善が実現できます。
