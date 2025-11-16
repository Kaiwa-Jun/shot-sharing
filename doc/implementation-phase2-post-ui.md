# Phase 2: 投稿機能UI実装

## 📋 概要

投稿画面（`/posts/new`）のUI実装と、画像選択・プレビュー、Exif情報の表示機能を構築します。

**所要時間**: 3-4時間

## 🎯 目的

- ユーザーが画像を選択・プレビューできる投稿画面を実装
- 画像のExif情報を自動抽出して表示
- シンプルで直感的なUIを提供

## 前提条件

- Phase 1 が完了していること
- Supabase認証が実装されていること

---

## 📦 必要なパッケージ

### インストール

```bash
# Exif情報抽出ライブラリ
npm install exifr

# 画像処理ライブラリ（サムネイル生成はPhase 3で使用）
npm install sharp

# 型定義
npm install -D @types/sharp
```

---

## 📁 ファイル構成

```
app/posts/new/
└── page.tsx                    # 投稿画面（新規作成）

components/posts/
├── image-upload.tsx            # 画像アップロードコンポーネント（新規作成）
├── exif-display.tsx            # Exif情報表示コンポーネント（新規作成）
└── post-form.tsx               # 投稿フォーム（新規作成）

lib/image/
└── exif.ts                     # Exif情報抽出（新規作成）

types/
└── exif.ts                     # Exif型定義（新規作成）
```

---

## 🔧 実装タスク

### ✅ Task 2-1: Exif型定義の作成

**ファイル**: `lib/types/exif.ts`

```typescript
/**
 * カメラのExif情報の型定義
 */
export interface ExifData {
  // 撮影設定
  iso: number | null;
  f_value: number | null; // F値（絞り）
  shutter_speed: string | null; // シャッタースピード（例: "1/250"）
  exposure_compensation: number | null; // 露出補正
  focal_length: number | null; // 焦点距離（mm）
  white_balance: string | null; // ホワイトバランス

  // カメラ情報
  camera_make: string | null; // メーカー（例: "Canon"）
  camera_model: string | null; // モデル名（例: "EOS R5"）
  lens: string | null; // レンズ情報

  // メタ情報
  date_time: string | null; // 撮影日時
  width: number | null; // 画像幅
  height: number | null; // 画像高さ
}

/**
 * Exif情報の初期値
 */
export const DEFAULT_EXIF_DATA: ExifData = {
  iso: null,
  f_value: null,
  shutter_speed: null,
  exposure_compensation: null,
  focal_length: null,
  white_balance: null,
  camera_make: null,
  camera_model: null,
  lens: null,
  date_time: null,
  width: null,
  height: null,
};
```

---

### ✅ Task 2-2: Exif情報抽出ライブラリの実装

**ファイル**: `lib/image/exif.ts`

```typescript
import { parse } from "exifr";
import { ExifData, DEFAULT_EXIF_DATA } from "@/lib/types/exif";

/**
 * シャッタースピードを文字列形式に変換
 * @param exposureTime Exifのシャッタースピード値
 * @returns 文字列形式のシャッタースピード（例: "1/250"）
 */
function formatShutterSpeed(exposureTime: number | undefined): string | null {
  if (!exposureTime) return null;

  if (exposureTime >= 1) {
    return `${exposureTime}s`;
  }

  const denominator = Math.round(1 / exposureTime);
  return `1/${denominator}`;
}

/**
 * 画像ファイルからExif情報を抽出
 * @param file 画像ファイル
 * @returns Exif情報
 */
export async function extractExifData(file: File): Promise<ExifData> {
  try {
    const exif = await parse(file, {
      // 必要な情報のみ抽出してパフォーマンス向上
      pick: [
        "ISO",
        "FNumber",
        "ExposureTime",
        "ExposureCompensation",
        "FocalLength",
        "WhiteBalance",
        "Make",
        "Model",
        "LensModel",
        "DateTimeOriginal",
        "ImageWidth",
        "ImageHeight",
      ],
    });

    if (!exif) {
      console.warn("Exif情報が見つかりませんでした");
      return DEFAULT_EXIF_DATA;
    }

    return {
      iso: exif.ISO ?? null,
      f_value: exif.FNumber ?? null,
      shutter_speed: formatShutterSpeed(exif.ExposureTime),
      exposure_compensation: exif.ExposureCompensation ?? null,
      focal_length: exif.FocalLength ?? null,
      white_balance: exif.WhiteBalance ?? null,
      camera_make: exif.Make ?? null,
      camera_model: exif.Model ?? null,
      lens: exif.LensModel ?? null,
      date_time: exif.DateTimeOriginal?.toISOString() ?? null,
      width: exif.ImageWidth ?? null,
      height: exif.ImageHeight ?? null,
    };
  } catch (error) {
    console.error("Exif情報の抽出に失敗しました:", error);
    return DEFAULT_EXIF_DATA;
  }
}

/**
 * Exif情報を表示用にフォーマット
 * @param exif Exif情報
 * @returns フォーマット済み文字列（例: "ISO200 • f/2.8 • 1/250s"）
 */
export function formatExifForDisplay(exif: ExifData): string {
  const parts: string[] = [];

  if (exif.iso) parts.push(`ISO${exif.iso}`);
  if (exif.f_value) parts.push(`f/${exif.f_value}`);
  if (exif.shutter_speed) parts.push(exif.shutter_speed);
  if (exif.exposure_compensation && exif.exposure_compensation !== 0) {
    const sign = exif.exposure_compensation > 0 ? "+" : "";
    parts.push(`${sign}${exif.exposure_compensation}EV`);
  }

  return parts.length > 0 ? parts.join(" • ") : "撮影設定情報なし";
}
```

---

### ✅ Task 2-3: 画像アップロードコンポーネントの実装

**ファイル**: `components/posts/image-upload.tsx`

```typescript
"use client";

import { useState, useRef, ChangeEvent } from "react";
import Image from "next/image";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  onImageClear: () => void;
}

export function ImageUpload({ onImageSelect, onImageClear }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 画像形式のバリデーション
    if (!file.type.startsWith("image/")) {
      alert("画像ファイルを選択してください");
      return;
    }

    // ファイルサイズのバリデーション（10MB以下）
    if (file.size > 10 * 1024 * 1024) {
      alert("ファイルサイズは10MB以下にしてください");
      return;
    }

    // プレビュー表示
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // 親コンポーネントに通知
    onImageSelect(file);
  };

  const handleClear = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onImageClear();
  };

  return (
    <div className="w-full">
      {!preview ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors bg-gray-50"
        >
          <Camera className="w-12 h-12 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">画像を選択</p>
          <p className="text-xs text-gray-400 mt-1">
            またはドラッグ&ドロップ
          </p>
        </div>
      ) : (
        <div className="relative w-full">
          <div className="relative w-full h-96">
            <Image
              src={preview}
              alt="選択した画像"
              fill
              className="object-contain rounded-lg"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
```

---

### ✅ Task 2-4: Exif情報表示コンポーネントの実装

**ファイル**: `components/posts/exif-display.tsx`

```typescript
"use client";

import { Camera } from "lucide-react";
import { ExifData } from "@/lib/types/exif";
import { formatExifForDisplay } from "@/lib/image/exif";

interface ExifDisplayProps {
  exif: ExifData | null;
  isLoading?: boolean;
}

export function ExifDisplay({ exif, isLoading }: ExifDisplayProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg">
        <Camera className="w-5 h-5 text-gray-400" />
        <p className="text-sm text-gray-600">撮影設定を読み込み中...</p>
      </div>
    );
  }

  if (!exif) {
    return null;
  }

  const hasExifData =
    exif.iso || exif.f_value || exif.shutter_speed || exif.exposure_compensation;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Camera className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold text-gray-900">撮影設定</h3>
      </div>

      {hasExifData ? (
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-900">
            {formatExifForDisplay(exif)}
          </p>

          {/* 詳細情報（オプション） */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
            {exif.camera_make && exif.camera_model && (
              <div>
                <span className="text-gray-500">カメラ:</span>{" "}
                {exif.camera_make} {exif.camera_model}
              </div>
            )}
            {exif.lens && (
              <div>
                <span className="text-gray-500">レンズ:</span> {exif.lens}
              </div>
            )}
            {exif.focal_length && (
              <div>
                <span className="text-gray-500">焦点距離:</span>{" "}
                {exif.focal_length}mm
              </div>
            )}
            {exif.white_balance && (
              <div>
                <span className="text-gray-500">WB:</span> {exif.white_balance}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            撮影設定情報が見つかりませんでした
          </p>
        </div>
      )}
    </div>
  );
}
```

---

### ✅ Task 2-5: 投稿フォームコンポーネントの実装

**ファイル**: `components/posts/post-form.tsx`

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "./image-upload";
import { ExifDisplay } from "./exif-display";
import { extractExifData } from "@/lib/image/exif";
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
      // Phase 3 で実装するServer Actionを呼び出し
      // const result = await createPost(formData);

      // 仮の処理
      console.log("投稿データ:", {
        file: selectedFile,
        exif: exifData,
        description,
      });

      alert("投稿機能はPhase 3で実装します");
      // router.push("/");
    } catch (error) {
      console.error("投稿に失敗しました:", error);
      alert("投稿に失敗しました");
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
          <label htmlFor="description" className="block font-semibold text-gray-900">
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

### ✅ Task 2-6: 投稿画面ページの実装

**ファイル**: `app/posts/new/page.tsx`

```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PostForm } from "@/components/posts/post-form";

export default async function NewPostPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未認証の場合はログインページにリダイレクト
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-center">新規投稿</h1>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <PostForm />
      </main>
    </div>
  );
}
```

---

## 🧪 動作確認手順

### 1. パッケージのインストール確認

```bash
npm list exifr sharp
```

### 2. 開発サーバー起動

```bash
npm run dev
```

### 3. 投稿画面へのアクセス

```
http://localhost:3000/posts/new
```

### 4. 機能テスト

**画像選択テスト**:

- [ ] 画像ファイルを選択できる
- [ ] 選択した画像がプレビュー表示される
- [ ] ×ボタンで画像をクリアできる

**Exif情報表示テスト**:

- [ ] Exif情報が自動抽出される
- [ ] ISO、F値、シャッタースピードが正しく表示される
- [ ] Exif情報がない画像でもエラーにならない

**フォーム動作テスト**:

- [ ] 説明文を入力できる
- [ ] キャンセルボタンで確認ダイアログが表示される
- [ ] 公開ボタンが適切に有効/無効になる

---

## ✅ 完了条件

以下がすべて満たされたらPhase 2完了：

- [ ] 必要なパッケージがインストールされている
- [ ] 画像アップロードコンポーネントが正常に動作する
- [ ] Exif情報が自動抽出され、表示される
- [ ] 投稿フォームのUIが完成している
- [ ] 認証ガードが機能している（未ログイン時にリダイレクト）
- [ ] レスポンシブデザインが適切に動作する

---

## 🚨 トラブルシューティング

### エラー: "Cannot find module 'exifr'"

**原因**: パッケージがインストールされていない

**解決方法**:

```bash
npm install exifr
```

### エラー: Exif情報が取得できない

**原因**: 画像にExif情報が含まれていない、またはブラウザのセキュリティ制限

**解決方法**:

1. スマートフォンで撮影した画像を使用（Exif情報が含まれている）
2. デフォルト値を表示するように実装済み

### エラー: 画像プレビューが表示されない

**原因**: FileReaderのエラー、または画像形式の問題

**解決方法**:

1. ブラウザのコンソールでエラーを確認
2. サポートされている画像形式（JPEG、PNG、WEBP）を使用

---

## 📚 参考リンク

- [exifr Documentation](https://github.com/MikeKovarik/exifr)
- [Next.js Image Component](https://nextjs.org/docs/app/api-reference/components/image)
- [shadcn/ui Components](https://ui.shadcn.com/)

---

## 次のステップ

Phase 2が完了したら、`doc/implementation-phase3-post-backend.md` に進んでください。
