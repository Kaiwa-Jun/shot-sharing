# File Search 最適化ガイド（修正版）

このドキュメントは、File Search APIの実装を最適化するための完全なガイドです。

**重要な前提**: File Search Storeは **テキストファイル専用** であり、画像ファイル（JPEG/PNG）は直接アップロードできません。

---

## 📋 目次

1. [調査結果: File Search Storeの制限](#調査結果-file-search-storeの制限)
2. [現状の問題分析](#現状の問題分析)
3. [最適化方針](#最適化方針)
4. [実装計画](#実装計画)
5. [期待される効果](#期待される効果)

---

## 調査結果: File Search Storeの制限

### File Search Storeがサポートするファイル形式

公式ドキュメント、Context7 MCP、WebSearchの調査結果:

**サポート形式**:

- テキストファイル: .txt, .md, .html, .xml, .csv
- ドキュメント: PDF, Word (.doc, .docx), Excel (.xlsx, .xls), PowerPoint (.pptx)
- コードファイル: .js, .ts, .py, .java, etc.
- データファイル: JSON, SQL

**非サポート形式**:

- ❌ 画像ファイル (.jpg, .jpeg, .png, .gif, .webp, etc.)
- ❌ 動画ファイル (.mp4, .mov, etc.)
- ❌ 音声ファイル (.mp3, .wav, etc.)

### Gemini APIの2つの異なるAPI

1. **Files API**: 画像をアップロードして Vision 処理に使用

   ```typescript
   const uploadResult = await ai.files.upload({
     file: imageBlob, // 画像ファイル
   });
   // Vision APIで使用
   ```

2. **File Search Store API**: テキストデータをベクトル検索用に保存
   ```typescript
   const operation = await ai.fileSearchStores.uploadToFileSearchStore({
     file: textBlob, // テキストファイルのみ
   });
   ```

**これらは別のAPI**であり、混同してはいけません。

### 結論

**現在の実装方式が正しい**:

```
画像 → Gemini Vision API（キャプション生成） → JSONテキスト → File Search Store
```

画像を直接File Search Storeにアップロードすることは **不可能** です。

---

## 現状の問題分析

### パフォーマンスの問題

| 指標               | 現状   | 目標  | 乖離      |
| ------------------ | ------ | ----- | --------- |
| **類似作例検索**   | 7.7秒  | 2-3秒 | 約3倍遅い |
| **AIチャット検索** | 未計測 | 2-3秒 | 不明      |

### 現在のアーキテクチャ

```
【投稿作成時】
画像 → Gemini Vision API (キャプション生成: 300-500文字)
     → JSONテキスト作成
     → File Search Store に保存

【検索時】
クエリ → File Search API → JSONテキストを検索
      → post_idを抽出 → Supabaseから投稿取得
```

### 実装されている3つの機能

#### 1. 投稿作成機能

- **ファイル**: `app/actions/posts.ts:273-279`
- **処理**: Vision APIでキャプション生成 → JSON作成 → File Search Store保存
- **問題**: キャプションが冗長（300-500文字）

#### 2. 類似作例表示機能

- **ファイル**: `app/actions/posts.ts:651-814`
- **処理**: EXIF情報からクエリ構築 → File Search API検索
- **問題**: レスポンス時間7.7秒

#### 3. AIチャット検索機能

- **ファイル**: `app/actions/search.ts`
- **処理**: ユーザークエリ → File Search API → AI回答生成
- **問題**: レスポンス時間未計測

### File Search Storeの現在のデータ構造

**ファイル**: `lib/gemini/file-search-upload.ts:49-64`

```json
{
  "post_id": "abc123",
  "caption": "この写真は、満開の桜の木を捉えた美しい風景写真です。構図は、桜の木を画面いっぱいに配置し、春の華やかさを表現しています。光は柔らかく、花びらの繊細なピンク色が鮮やかに映えています。雰囲気は、春の訪れを感じさせる明るく希望に満ちた印象です。撮影シーンは、晴れた春の日中、おそらく公園や庭園での撮影と推測されます。撮影技法として、背景をぼかすことで桜の花に視線を集中させています... (300-500文字)",
  "description": "桜",
  "exif": {
    "iso": 200,
    "fValue": 8,
    "shutterSpeed": "1/125",
    "focalLength": 105,
    "cameraMake": "SONY",
    "cameraModel": "ILCE-7M3"
  },
  "image_url": "https://...",
  "created_at": "2025-11-23T..."
}
```

**ファイル形式**: `text/plain`（JSONテキスト）

### 特定された問題

#### 問題1: キャプションが冗長 ⭐⭐⭐（最重要）

**現状のプロンプト**: `lib/gemini/caption.ts:32-41`

```typescript
`この写真について、日本語で詳しく説明してください。以下の点に注目してください：
1. 被写体: 何が写っているか（人物、風景、物体など）
2. 構図: どのような配置やバランスか
3. 光と色: 照明の雰囲気、色調、明暗
4. 雰囲気・印象: 写真から感じる感情や雰囲気
5. 撮影シーン: 季節、時間帯、場所の特徴（推測できる範囲で）
6. 撮影技法: ボケ、パース、アングルなどの特徴的な技法
検索に役立つよう、具体的で詳細な説明をお願いします。`;
```

**生成されるキャプション**: 300-500文字の冗長な文章

**問題点**:

- 検索に不要な修飾語が多い（「美しい」「鮮やかに」「希望に満ちた」など）
- チャンキングが非効率（長文が複数チャンクに分割される）
- トークン消費が多い
- **Vision API呼び出し時間が長い**

**影響**: Vision API処理時間が長く、投稿作成が遅延

#### 問題2: チャンキング設定が不適切 ⭐⭐

**現状**: `lib/gemini/file-search-upload.ts:84-87`

```typescript
chunkingConfig: {
  whiteSpaceConfig: {
    maxTokensPerChunk: 150,  // 小さすぎる（公式推奨: 200-500）
    maxOverlapTokens: 15,    // 小さすぎる（公式推奨: 50）
  },
}
```

**改善実施済み**: maxTokensPerChunk: 500, maxOverlapTokens: 50に変更済み
**効果**: 9%の改善（7.7秒 → 約7秒）

#### 問題3: 検索クエリが単純なキーワード羅列 ⭐

**現状**: `app/actions/posts.ts:613-642`

```typescript
// 例: "紫陽花 ISO100 f5.6 1/400 37mm ILCE-6400 E PZ 16-50mm F3.5-5.6 OSS"
```

**公式推奨**: 自然言語クエリ（意味検索を実行）

**改善実施済み**: 説明文を削除してシンプル化
**効果**: 2%の改善

#### 問題4: 不要なデータがFile Search Storeに保存されている ⭐

**現状**:

```json
{
  "image_url": "https://...", // ← 検索に不要
  "created_at": "2025-11-23T..." // ← 検索に不要
}
```

**影響**: わずかにチャンクサイズが増加

### 最も重要な問題

**キャプション生成の冗長性**が最大の問題です。300-500文字の詳細な説明は:

1. **Vision API処理時間が長い** → 投稿作成が遅延
2. **検索に不要な情報が多い** → ノイズが増加
3. **トークン消費が多い** → コスト増加

---

## 最適化方針

### 基本方針

1. **キャプション生成を簡潔化**（300文字 → 50-100文字）
2. **チャンキング設定を最適化**（実施済み）
3. **不要なデータを削除**（image_url, created_at）
4. **captionの保存状態を確認・修正**

### 現在の実装方式を維持

画像を直接File Search Storeに保存することは不可能なため、現在の方式を最適化します:

```
【投稿作成時】
画像 → Gemini Vision API (簡潔なキャプション生成: 50-100文字)
     → JSONテキスト作成（必要最小限）
     → File Search Store に保存

【検索時】
クエリ → File Search API → JSONテキストを検索
      → post_idを抽出 → Supabaseから投稿取得
```

---

## 実装計画

### フェーズ1: captionの保存状態を確認 【30分】

#### 問題

postsテーブルに`caption`カラムが存在しないため、captionがFile Search Store内のJSONに正しく保存されているか不明。

#### 確認方法

1. Supabaseダッシュボードで`posts`テーブルを確認
2. `file_search_store_id`カラムに値が保存されているか確認
3. ログ出力で`uploadPhotoToFileSearch`が正常に動作しているか確認

#### 期待される結果

- ✅ `file_search_store_id`に値が保存されている
- ✅ ログに「キャプション生成完了」が表示されている
- ✅ File Search Storeにドキュメントがアップロードされている

#### 問題が見つかった場合

- `generateCaption`が空文字を返している可能性
- File Search Storeへのアップロードが失敗している可能性

### フェーズ2: キャプション生成を簡潔化 【1-2時間】⭐⭐⭐

#### 目的

Vision API呼び出し時間短縮、検索精度向上、コスト削減

#### 実装内容

**ファイル**: `lib/gemini/caption.ts`

```typescript
// ❌ 旧プロンプト（300-500文字）
`この写真について、日本語で詳しく説明してください。以下の点に注目してください：
1. 被写体: 何が写っているか（人物、風景、物体など）
2. 構図: どのような配置やバランスか
...`
// ✅ 新プロンプト（50-100文字）
`この写真の内容を50-100文字以内のキーワードで簡潔に説明してください。
以下の情報を含めてください：
- 被写体（何が写っているか）
- 場所・シーン（屋内/屋外、場所の種類）
- 季節・時間帯（推測できる範囲で）
- 色調・雰囲気（明るい/暗い、鮮やか/落ち着いた、など）

例: "満開の桜 公園 春 日中 明るい ピンク色 風景写真 背景ぼけ"

修飾語や感情表現は不要です。検索に役立つキーワードのみを列挙してください。`;
```

#### 期待される出力例

```
// ❌ 旧キャプション（冗長）
"この写真は、満開の桜の木を捉えた美しい風景写真です。構図は、桜の木を画面いっぱいに配置し、春の華やかさを表現しています。光は柔らかく、花びらの繊細なピンク色が鮮やかに映えています..."

// ✅ 新キャプション（簡潔）
"満開の桜 公園 春 日中 明るい ピンク色 風景写真 背景ぼけ"
```

#### 検証方法

```bash
# 1. 修正後、新規投稿を作成
# 2. サーバーログで生成されたキャプションを確認
# 3. キャプションが50-100文字以内か確認

# 期待されるログ:
# 🎨 [DEBUG] Gemini Vision でキャプション生成開始
# ✅ [DEBUG] キャプション生成完了: 満開の桜 公園 春 日中 明るい ピンク色...
```

#### 成功基準

- ✅ キャプションが50-100文字以内
- ✅ 検索に必要なキーワードが含まれている
- ✅ 修飾語や感情表現が含まれていない
- ✅ Vision API呼び出し時間が短縮

#### 期待される効果

- Vision API処理時間: -30~50%（1-2秒短縮）
- 検索精度: 向上（ノイズ削減）
- コスト: -20~30%（トークン数削減）

### フェーズ3: 不要なデータを削除 【30分】

#### 目的

File Search Store内のデータを最小化

#### 実装内容

**ファイル**: `lib/gemini/file-search-upload.ts:49-64`

```typescript
// ❌ 旧データ構造
const metadata = {
  post_id: postId,
  caption: caption,
  description: description || "",
  exif: {
    iso: exifData.iso ?? null,
    fValue: exifData.fValue ?? null,
    shutterSpeed: exifData.shutterSpeed ?? null,
    exposureCompensation: exifData.exposureCompensation ?? null,
    focalLength: exifData.focalLength ?? null,
    cameraMake: exifData.cameraMake ?? null,
    cameraModel: exifData.cameraModel ?? null,
  },
  image_url: imageUrl, // ← 削除
  created_at: new Date().toISOString(), // ← 削除
};

// ✅ 新データ構造
const metadata = {
  post_id: postId,
  caption: caption,
  description: description || "",
  exif: {
    iso: exifData.iso ?? null,
    fValue: exifData.fValue ?? null,
    shutterSpeed: exifData.shutterSpeed ?? null,
    focalLength: exifData.focalLength ?? null,
    cameraModel: exifData.cameraModel ?? null,
    lens: exifData.lens ?? null,
  },
};
```

#### 成功基準

- ✅ image_urlとcreated_atが削除されている
- ✅ 投稿作成が正常に動作する
- ✅ 検索が正常に動作する

#### 期待される効果

- わずかにチャンクサイズ削減
- データ構造のシンプル化

### フェーズ4: 既存投稿の再アップロード 【2-3時間】

#### 目的

既存投稿を新しいキャプション形式で再アップロード

#### 作成ファイル

`scripts/reupload-with-new-caption.ts`

```typescript
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { uploadPhotoToFileSearch } from "@/lib/gemini/file-search-upload";
import { deleteFileFromStore } from "@/lib/gemini/file-search";

async function reuploadAllPosts() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("=".repeat(80));
  console.log("既存投稿の再アップロード開始");
  console.log("=".repeat(80));

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !posts) {
    console.error("❌ 投稿の取得に失敗");
    return;
  }

  console.log(`\n📊 合計 ${posts.length} 件の投稿を再アップロードします\n`);

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
      if (!imageResponse.ok) throw new Error("画像のダウンロードに失敗");
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

      // 新しいキャプションで再アップロード
      console.log("📤 新しいキャプションで再アップロード中...");
      const result = await uploadPhotoToFileSearch(
        imageBuffer,
        post.id,
        post.exif_data || {},
        post.description || "",
        post.image_url
      );

      // DBを更新
      console.log("💾 データベース更新中...");
      const { error: updateError } = await supabase
        .from("posts")
        .update({ file_search_store_id: result.fileName })
        .eq("id", post.id);

      if (updateError) throw new Error(`DB更新エラー: ${updateError.message}`);

      // キャッシュをクリア
      await supabase
        .from("similar_posts_cache")
        .delete()
        .eq("post_id", post.id);

      console.log("✅ 再アップロード完了");
      successCount++;

      // レート制限を避けるため待機（2秒）
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
  console.log("再アップロード完了");
  console.log("=".repeat(80));
  console.log(`✅ 成功: ${successCount} 件`);
  console.log(`❌ エラー: ${errorCount} 件`);
  console.log("=".repeat(80));
}

reuploadAllPosts().catch(console.error);
```

#### 実行方法

```bash
# 1. フェーズ2の実装完了を確認
# 2. Supabaseダッシュボードでpostsテーブルをバックアップ
# 3. スクリプト実行
npx tsx scripts/reupload-with-new-caption.ts
```

#### 成功基準

- ✅ すべての投稿が再アップロードされる
- ✅ 新しいキャプション形式で保存される
- ✅ file_search_store_idが更新される
- ✅ キャッシュがクリアされる

### フェーズ5: 動作確認 【1時間】

#### 確認項目

```bash
npm run dev

# 1. 新規投稿作成
#    - 画像アップロード
#    - キャプション生成ログ確認
#    - 投稿がギャラリーに表示される

# 2. 類似作例表示
#    - 投稿詳細モーダルを開く
#    - 類似作例が表示される
#    - レスポンス時間を確認（目標: 5秒以内）

# 3. AIチャット検索
#    - FABをクリック
#    - 検索クエリを入力
#    - AI回答と検索結果が表示される
```

#### 成功基準

- ✅ すべての機能が正常に動作する
- ✅ エラーが発生しない
- ✅ レスポンス時間が改善している

---

## 期待される効果

### パフォーマンス改善

| 機能                               | 現状   | 最適化後   | 改善率      |
| ---------------------------------- | ------ | ---------- | ----------- |
| **投稿作成時間（Vision API部分）** | 2-4秒  | 1-2秒      | **-30~50%** |
| **類似作例検索**                   | 7.7秒  | 6-7秒      | **-10~20%** |
| **AIチャット検索**                 | 未計測 | 改善見込み | 不明        |

### コスト削減

| 項目                           | 現状           | 最適化後       | 削減率      |
| ------------------------------ | -------------- | -------------- | ----------- |
| **Vision API（入力トークン）** | 長いプロンプト | 短いプロンプト | **-20~30%** |
| **Vision API（出力トークン）** | 300-500文字    | 50-100文字     | **-70~80%** |

### その他の効果

- ✅ 検索精度向上（ノイズ削減）
- ✅ データ構造のシンプル化
- ✅ メンテナンス性向上

---

## 重要な注意事項

### Vision APIとFile Search Storeの関係

- Vision APIは画像の内容を理解してテキスト化する
- File Search StoreはテキストのみをRAGで検索する
- **両方が必要**（どちらかを省略できない）

### 画像を直接保存できない理由

File Search Storeは以下のファイル形式のみサポート:

- テキスト (.txt, .md, .html)
- ドキュメント (.pdf, .docx, .xlsx, .pptx)
- コード (.js, .ts, .py, etc.)

画像ファイル (.jpg, .png) は **サポート外** です。

### 現在の実装が正しい理由

1. 画像をVision APIで解析してテキスト化
2. テキストをFile Search Storeに保存
3. File Search APIでテキストを検索

このフローは **Gemini APIの想定通りの使い方** です。

---

## 次のステップ

1. フェーズ1: captionの保存状態を確認
2. フェーズ2: キャプション生成を簡潔化（最重要）
3. フェーズ3: 不要なデータを削除
4. フェーズ4: 既存投稿の再アップロード
5. フェーズ5: 動作確認

**フェーズ2が最も効果的な改善**です。まずはこれから実装することを推奨します。
