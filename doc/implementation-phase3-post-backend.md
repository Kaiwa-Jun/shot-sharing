# Phase 3: 投稿処理バックエンド実装

## 📋 概要

投稿処理のバックエンド機能を実装します。画像のアップロード、サムネイル生成、Supabase Storageへのアップロード、File Search Storeへの登録、DBへの保存を統合します。

**所要時間**: 4-5時間

## 🎯 目的

- 画像のリサイズとサムネイル生成
- Supabase Storageへの画像アップロード
- Gemini File Search Storeへの画像とメタデータの登録
- Supabase DBへの投稿情報の保存
- エラーハンドリングとトランザクション処理

## 前提条件

- Phase 1, 2 が完了していること
- Supabase Storage のバケットが作成されていること

---

## 📦 必要なパッケージ

### 確認（Phase 2でインストール済み）

```bash
npm list sharp
```

---

## 📁 ファイル構成

```
lib/image/
├── exif.ts                     # Exif情報抽出（Phase 2で作成済み）
└── resize.ts                   # 画像リサイズ・サムネイル生成（新規作成）

lib/gemini/
├── file-search.ts              # File Search基盤（Phase 1で作成済み）
└── file-search-upload.ts       # File Searchアップロード（新規作成）

app/actions/
└── posts.ts                    # 投稿処理Server Actions（新規作成）

lib/supabase/
└── storage.ts                  # Supabase Storageヘルパー（新規作成）
```

---

## 🗄️ データベース準備

### Supabase Storage バケット作成

**手順**:

1. Supabase Dashboard にアクセス
2. Storage → Create bucket
3. バケット名: `photos`
4. Public bucket: ✅ ON（公開アクセス可能）
5. Create bucket

**または、SQL で作成**:

```sql
-- Storageバケット作成（Supabase Dashboardから実行）
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true);

-- パブリックアクセスポリシー設定
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');

-- 認証ユーザーのみアップロード可能
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'photos' AND
  auth.role() = 'authenticated'
);
```

---

## 🔧 実装タスク

### ✅ Task 3-1: 画像リサイズ・サムネイル生成の実装

**ファイル**: `lib/image/resize.ts`

```typescript
import sharp from "sharp";

/**
 * 画像リサイズの設定
 */
export const IMAGE_CONFIG = {
  // サムネイル設定
  THUMBNAIL: {
    WIDTH: 400,
    HEIGHT: 400,
    QUALITY: 80,
  },
  // 表示用画像設定（オリジナルサイズを保持するが、最大幅を制限）
  DISPLAY: {
    MAX_WIDTH: 2000,
    MAX_HEIGHT: 2000,
    QUALITY: 90,
  },
} as const;

/**
 * サムネイル画像を生成
 * @param buffer 元画像のBuffer
 * @returns サムネイル画像のBuffer
 */
export async function createThumbnail(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .resize(IMAGE_CONFIG.THUMBNAIL.WIDTH, IMAGE_CONFIG.THUMBNAIL.HEIGHT, {
        fit: "cover", // 中央部分を切り抜き
        position: "center",
      })
      .jpeg({ quality: IMAGE_CONFIG.THUMBNAIL.QUALITY })
      .toBuffer();
  } catch (error) {
    console.error("サムネイル生成に失敗しました:", error);
    throw new Error("サムネイル生成に失敗しました");
  }
}

/**
 * 表示用画像を生成（大きすぎる画像をリサイズ）
 * @param buffer 元画像のBuffer
 * @returns リサイズ済み画像のBuffer
 */
export async function resizeForDisplay(buffer: Buffer): Promise<Buffer> {
  try {
    const metadata = await sharp(buffer).metadata();

    // 画像が十分小さい場合はそのまま返す
    if (
      metadata.width &&
      metadata.height &&
      metadata.width <= IMAGE_CONFIG.DISPLAY.MAX_WIDTH &&
      metadata.height <= IMAGE_CONFIG.DISPLAY.MAX_HEIGHT
    ) {
      return buffer;
    }

    // リサイズ処理
    return await sharp(buffer)
      .resize(IMAGE_CONFIG.DISPLAY.MAX_WIDTH, IMAGE_CONFIG.DISPLAY.MAX_HEIGHT, {
        fit: "inside", // アスペクト比を保持
        withoutEnlargement: true, // 拡大しない
      })
      .jpeg({ quality: IMAGE_CONFIG.DISPLAY.QUALITY })
      .toBuffer();
  } catch (error) {
    console.error("画像リサイズに失敗しました:", error);
    throw new Error("画像リサイズに失敗しました");
  }
}

/**
 * 画像のメタデータを取得
 * @param buffer 画像のBuffer
 * @returns 画像メタデータ
 */
export async function getImageMetadata(buffer: Buffer) {
  try {
    return await sharp(buffer).metadata();
  } catch (error) {
    console.error("画像メタデータの取得に失敗しました:", error);
    throw new Error("画像メタデータの取得に失敗しました");
  }
}
```

---

### ✅ Task 3-2: Supabase Storageヘルパーの実装

**ファイル**: `lib/supabase/storage.ts`

```typescript
import { createClient } from "@/lib/supabase/server";

/**
 * Storageのパス生成
 * @param userId ユーザーID
 * @param postId 投稿ID
 * @param filename ファイル名
 * @returns Storageパス
 */
export function generateStoragePath(
  userId: string,
  postId: string,
  filename: string
): string {
  return `${userId}/${postId}/${filename}`;
}

/**
 * Supabase Storageに画像をアップロード
 * @param buffer 画像のBuffer
 * @param path Storageパス
 * @param contentType MIMEタイプ
 * @returns アップロード結果
 */
export async function uploadImageToStorage(
  buffer: Buffer,
  path: string,
  contentType: string = "image/jpeg"
) {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from("photos")
    .upload(path, buffer, {
      contentType,
      upsert: false, // 上書きしない
    });

  if (error) {
    console.error("Storageへのアップロードに失敗しました:", error);
    throw new Error(`Storageへのアップロードに失敗: ${error.message}`);
  }

  return data;
}

/**
 * Supabase StorageのパブリックURLを取得
 * @param path Storageパス
 * @returns パブリックURL
 */
export async function getPublicUrl(path: string): Promise<string> {
  const supabase = await createClient();

  const {
    data: { publicUrl },
  } = supabase.storage.from("photos").getPublicUrl(path);

  return publicUrl;
}

/**
 * Supabase Storageからファイルを削除
 * @param path Storageパス
 */
export async function deleteFromStorage(path: string) {
  const supabase = await createClient();

  const { error } = await supabase.storage.from("photos").remove([path]);

  if (error) {
    console.error("Storageからの削除に失敗しました:", error);
    throw new Error(`Storageからの削除に失敗: ${error.message}`);
  }
}
```

---

### ✅ Task 3-3: File Search アップロード処理の実装

**ファイル**: `lib/gemini/file-search-upload.ts`

```typescript
import { GoogleGenAI } from "@google/genai";
import { ExifData } from "@/lib/types/exif";
import { getFileSearchStoreId } from "./file-search";

/**
 * File Search Storeに画像とメタデータをアップロード
 * @param imageBuffer 画像のBuffer
 * @param postId 投稿ID
 * @param exifData Exif情報
 * @param description 説明文
 * @returns アップロード結果
 */
export async function uploadPhotoToFileSearch(
  imageBuffer: Buffer,
  postId: string,
  exifData: ExifData,
  description: string
) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const storeId = getFileSearchStoreId();

  try {
    // カスタムメタデータの準備
    const customMetadata = [
      { key: "post_id", stringValue: postId },
      { key: "description", stringValue: description || "" },
    ];

    // Exif情報をメタデータに追加
    if (exifData.iso) {
      customMetadata.push({ key: "iso", numericValue: exifData.iso });
    }
    if (exifData.f_value) {
      customMetadata.push({ key: "f_value", numericValue: exifData.f_value });
    }
    if (exifData.shutter_speed) {
      customMetadata.push({
        key: "shutter_speed",
        stringValue: exifData.shutter_speed,
      });
    }
    if (exifData.exposure_compensation) {
      customMetadata.push({
        key: "exposure_compensation",
        numericValue: exifData.exposure_compensation,
      });
    }
    if (exifData.focal_length) {
      customMetadata.push({
        key: "focal_length",
        numericValue: exifData.focal_length,
      });
    }
    if (exifData.camera_make) {
      customMetadata.push({
        key: "camera_make",
        stringValue: exifData.camera_make,
      });
    }
    if (exifData.camera_model) {
      customMetadata.push({
        key: "camera_model",
        stringValue: exifData.camera_model,
      });
    }

    console.log(`📤 File Search Storeにアップロード中: photo_${postId}.jpg`);

    // 画像をFile Search Storeにアップロード
    let operation = await ai.fileSearchStores.uploadToFileSearchStore({
      file: imageBuffer,
      fileSearchStoreName: storeId,
      config: {
        displayName: `photo_${postId}.jpg`,
        customMetadata,
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
        console.log(`⏳ アップロード処理中... (${attempts}秒経過)`);
      }
    }

    if (!operation.done) {
      throw new Error("アップロードがタイムアウトしました");
    }

    console.log("✅ File Search Storeへのアップロード完了");

    return {
      success: true,
      fileName: operation.file?.name || null,
    };
  } catch (error) {
    console.error("File Search Storeへのアップロードに失敗:", error);
    throw new Error(
      `File Searchアップロード失敗: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
```

---

### ✅ Task 3-4: 投稿処理Server Actionsの実装

**ファイル**: `app/actions/posts.ts`

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { extractExifData } from "@/lib/image/exif";
import { createThumbnail, resizeForDisplay } from "@/lib/image/resize";
import {
  uploadImageToStorage,
  getPublicUrl,
  generateStoragePath,
  deleteFromStorage,
} from "@/lib/supabase/storage";
import { uploadPhotoToFileSearch } from "@/lib/gemini/file-search-upload";

/**
 * 投稿作成Server Action
 * @param formData フォームデータ
 */
export async function createPost(formData: FormData) {
  const supabase = await createClient();

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("認証が必要です");
  }

  try {
    // 1. フォームデータの取得
    const imageFile = formData.get("image") as File;
    const description = (formData.get("description") as string) || "";

    if (!imageFile) {
      throw new Error("画像ファイルが選択されていません");
    }

    console.log("📸 投稿処理を開始します...");

    // 2. 画像をBufferに変換
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

    // 3. Exif情報を抽出
    console.log("📊 Exif情報を抽出中...");
    const exifData = await extractExifData(imageFile);

    // 4. 投稿IDを生成
    const postId = crypto.randomUUID();

    // 5. サムネイルと表示用画像を生成
    console.log("🖼️ サムネイルと表示用画像を生成中...");
    const [thumbnailBuffer, displayBuffer] = await Promise.all([
      createThumbnail(imageBuffer),
      resizeForDisplay(imageBuffer),
    ]);

    // 6. Supabase Storageにアップロード
    console.log("☁️ Supabase Storageにアップロード中...");
    const imagePath = generateStoragePath(user.id, postId, "original.jpg");
    const thumbnailPath = generateStoragePath(user.id, postId, "thumbnail.jpg");

    try {
      await Promise.all([
        uploadImageToStorage(displayBuffer, imagePath, imageFile.type),
        uploadImageToStorage(thumbnailBuffer, thumbnailPath, "image/jpeg"),
      ]);
    } catch (error) {
      console.error("Storageへのアップロードに失敗しました:", error);
      throw new Error("画像のアップロードに失敗しました");
    }

    // 7. パブリックURLを取得
    const [imageUrl, thumbnailUrl] = await Promise.all([
      getPublicUrl(imagePath),
      getPublicUrl(thumbnailPath),
    ]);

    // 8. File Search Storeに登録
    console.log("🔍 File Search Storeに登録中...");
    let fileSearchSuccess = false;

    try {
      await uploadPhotoToFileSearch(imageBuffer, postId, exifData, description);
      fileSearchSuccess = true;
    } catch (error) {
      console.error("File Search Storeへの登録に失敗しました:", error);
      // File Search失敗時でも投稿は続行（後で再登録可能）
    }

    // 9. DBに投稿情報を保存
    console.log("💾 DBに投稿情報を保存中...");
    const { error: dbError } = await supabase.from("posts").insert({
      id: postId,
      user_id: user.id,
      image_url: imageUrl,
      thumbnail_url: thumbnailUrl,
      description,
      exif_data: exifData,
      visibility: "public",
    });

    if (dbError) {
      console.error("DB保存に失敗しました:", dbError);

      // ロールバック: Storageから画像を削除
      try {
        await Promise.all([
          deleteFromStorage(imagePath),
          deleteFromStorage(thumbnailPath),
        ]);
      } catch (cleanupError) {
        console.error("クリーンアップに失敗しました:", cleanupError);
      }

      throw new Error("投稿の保存に失敗しました");
    }

    console.log("✅ 投稿が完了しました!");

    // キャッシュを再検証
    revalidatePath("/");
    revalidatePath("/me");

    return {
      success: true,
      postId,
      fileSearchSuccess,
    };
  } catch (error) {
    console.error("投稿処理でエラーが発生しました:", error);
    throw error;
  }
}
```

---

### ✅ Task 3-5: 投稿フォームの更新（Server Action連携）

**ファイル**: `components/posts/post-form.tsx`（更新）

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "./image-upload";
import { ExifDisplay } from "./exif-display";
import { extractExifData } from "@/lib/image/exif";
import { createPost } from "@/app/actions/posts"; // 追加
import { ExifData } from "@/lib/types/exif";

export function PostForm() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [exifData, setExifData] = useState<ExifData | null>(null);
  const [description, setDescription] = useState("");
  const [isLoadingExif, setIsLoadingExif] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageSelect = async (file: File) => {
    setSelectedFile(file);
    setIsLoadingExif(true);

    try {
      const exif = await extractExifData(file);
      setExifData(exif);
    } catch (error) {
      console.error("Exif情報の抽出に失敗しました:", error);
    } finally {
      setIsLoadingExif(false);
    }
  };

  const handleImageClear = () => {
    setSelectedFile(null);
    setExifData(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      alert("画像を選択してください");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("description", description);

      const result = await createPost(formData);

      if (result.success) {
        if (!result.fileSearchSuccess) {
          alert(
            "投稿は成功しましたが、検索機能への登録に失敗しました。後で再試行されます。"
          );
        }
        router.push("/");
      }
    } catch (error) {
      console.error("投稿に失敗しました:", error);
      alert(
        error instanceof Error
          ? error.message
          : "投稿に失敗しました。もう一度お試しください。"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (
      selectedFile &&
      !confirm("編集中の内容が破棄されますがよろしいですか?")
    ) {
      return;
    }
    router.push("/");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 画像アップロード */}
      <ImageUpload
        onImageSelect={handleImageSelect}
        onImageClear={handleImageClear}
      />

      {/* Exif情報表示 */}
      {selectedFile && (
        <ExifDisplay exif={exifData} isLoading={isLoadingExif} />
      )}

      {/* 説明文入力 */}
      {selectedFile && (
        <div className="space-y-2">
          <label
            htmlFor="description"
            className="block font-semibold text-gray-900"
          >
            📝 ひとこと（任意）
          </label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="撮影時の状況や工夫を共有..."
            rows={4}
            className="w-full"
          />
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          className="flex-1"
          disabled={isSubmitting}
        >
          キャンセル
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={!selectedFile || isSubmitting}
        >
          {isSubmitting ? "投稿中..." : "公開"}
        </Button>
      </div>
    </form>
  );
}
```

---

## 🧪 動作確認手順

### 1. Supabase Storage バケット確認

```
Supabase Dashboard → Storage → photos バケットが存在することを確認
```

### 2. 環境変数確認

```bash
# .env.local に以下が設定されていることを確認
GEMINI_API_KEY=xxx
GEMINI_FILE_SEARCH_STORE_ID=xxx
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

### 3. 開発サーバー起動

```bash
npm run dev
```

### 4. 投稿テスト

```
1. http://localhost:3000/posts/new にアクセス
2. 画像を選択（Exif情報を含むスマホ撮影写真を推奨）
3. Exif情報が自動表示されることを確認
4. 説明文を入力（任意）
5. 「公開」ボタンをクリック
6. 処理中のログをコンソールで確認
7. 投稿完了後、トップページ（/）にリダイレクトされることを確認
```

### 5. データ確認

**Supabase Storage**:

```
Storage → photos → {userId}/{postId}/ に以下が存在することを確認
- original.jpg
- thumbnail.jpg
```

**Supabase Database**:

```sql
SELECT * FROM posts ORDER BY created_at DESC LIMIT 1;
```

**File Search Store**:

```typescript
import { listFilesInStore } from "@/lib/gemini/file-search";

const files = await listFilesInStore();
console.log(files);
```

---

## ✅ 完了条件

以下がすべて満たされたらPhase 3完了：

- [ ] 画像リサイズ・サムネイル生成が正常に動作する
- [ ] Supabase Storageに画像がアップロードされる
- [ ] File Search Storeに画像とメタデータが登録される
- [ ] Supabase DBに投稿情報が保存される
- [ ] エラー時のロールバック処理が機能する
- [ ] 投稿完了後、トップページにリダイレクトされる
- [ ] 投稿した画像がギャラリーに表示される

---

## 🚨 トラブルシューティング

### エラー: "Storage bucket not found"

**原因**: Storageバケットが作成されていない

**解決方法**:

1. Supabase Dashboard → Storage
2. Create bucket → `photos`（public）

### エラー: "File Search Store IDが設定されていません"

**原因**: `.env.local` にStore IDが設定されていない

**解決方法**:

```bash
# Phase 1のセットアップスクリプトを実行
npm run setup:file-search
```

### エラー: "アップロードがタイムアウトしました"

**原因**: File Searchへのアップロードに時間がかかりすぎている

**解決方法**:

1. 画像サイズを確認（10MB以下推奨）
2. maxAttemptsを増やす（`file-search-upload.ts`）
3. インターネット接続を確認

### エラー: "DB保存に失敗しました"

**原因**: postsテーブルのスキーマ不一致、または権限不足

**解決方法**:

1. テーブルが正しく作成されているか確認
2. RLSポリシーを確認（認証ユーザーがINSERT可能か）

---

## 📚 参考リンク

- [Sharp Documentation](https://sharp.pixelplumbing.com/)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)

---

## 次のステップ

Phase 3が完了したら、`doc/implementation-phase4-search.md` に進んでください。
