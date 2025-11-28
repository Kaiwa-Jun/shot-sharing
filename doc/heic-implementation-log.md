# HEIC画像アップロード対応 - 試行ログ

## 概要

このファイルはHEIC対応の実装試行を記録するログです。
実装計画は `heic-implementation-plan.md` を参照してください。

## 試行記録

### 試行 #1

**日時**: 2024-11-28

**方針**:

- heic-convertでサーバーサイド変換
- マジックナンバーでHEIC判定 → 変換 → sharp でリサイズ
- exifrで元のHEICからEXIF抽出（exifrはHEIC対応）
- クライアント側はHEICの場合プレースホルダー表示

**実装内容**:

1. `lib/image/detect-format.ts` - HEIC判定ユーティリティ（マジックナンバー方式）
2. `lib/image/heic-converter.ts` - heic-convertを使用したJPEG変換
3. `lib/types/heic-convert.d.ts` - heic-convertの型定義
4. `app/actions/posts.ts` - createPost修正（HEIC判定→変換フロー追加）
5. `components/posts/image-upload.tsx` - HEICプレースホルダー表示

**結果**: 成功

**エラー内容**:

```text
初期: Buffer<ArrayBufferLike> と Buffer<ArrayBuffer> の型不一致
→ heic-converter.ts の戻り値型を明示的に修正して解決
```

**分析**:

- heic-convert v2.1.0 はVercel Serverlessで動作（ネイティブ依存なし）
- exifr v7.1.3 はHEICから直接EXIF抽出可能（変換前のバッファを使用）
- sharp v0.34.5 はHEIC非対応だが、変換後のJPEGを処理可能
- クライアント側プレビューは簡略化してプレースホルダー表示

**次のアクション**:

- 実際のHEIC画像でのE2Eテスト
- Vercel本番環境でのデプロイテスト

---

### 試行 #1.1（修正）

**日時**: 2024-11-28

**問題**:

クライアントサイドでHEICファイルのEXIF抽出時に「Unknown file format」エラーが発生

```text
exif.ts:81 Exif情報の抽出に失敗しました: Error: Unknown file format
```

**原因**:

- `post-form.tsx`の`handleImageSelect`でクライアントサイドの`extractExifData`を呼び出し
- クライアントサイドのexifrはHEICを正しく処理できない場合がある

**修正内容**:

1. `post-form.tsx`にHEIC判定関数を追加
2. HEICファイルの場合はクライアントサイドでのEXIF抽出をスキップ
3. 「HEIC形式の画像です - EXIF情報は投稿時にサーバーで自動抽出されます」メッセージを表示

**結果**: エラーは解消、ただしEXIF抽出とプレビュー表示に問題あり

---

### 試行 #2（EXIF抽出修正）

**日時**: 2025-11-28

**問題**:

1. EXIF情報が投稿詳細画面に表示されない
2. HEICファイル選択時にプレビューがプレースホルダーのまま

**調査結果**:

- exifrライブラリはHEICからEXIF抽出できない（"Unknown file format"エラー）
- heic-convertで変換するとEXIF情報が失われる
- exif-heic-jsはブラウザ専用でNode.jsでは動作しない
- **ExifReaderライブラリはHEICから直接EXIF抽出可能**（テストで確認）

**修正内容**:

1. `lib/image/exif.ts` - exifrからExifReaderに完全切り替え
2. `lib/types/heic2any.d.ts` - heic2anyの型定義を追加
3. `components/posts/image-upload.tsx` - heic2anyでブラウザ側HEIC→JPEG変換してプレビュー表示
4. `app/actions/posts.ts` - デバッグログ削除
5. `components/posts/post-form.tsx` - デバッグログ削除

**インストールしたパッケージ**:

```bash
npm install exifreader heic2any
```

**結果**: 成功

---

## 成功した実装（最終版）

### インストールしたパッケージ

```bash
npm install heic-convert exifreader heic2any
```

### 作成・修正したファイル

| ファイル                            | 説明                                     |
| ----------------------------------- | ---------------------------------------- |
| `lib/image/detect-format.ts`        | マジックナンバーによるHEIC/HEIF判定      |
| `lib/image/heic-converter.ts`       | heic-convert(サーバーサイド)でJPEGに変換 |
| `lib/image/exif.ts`                 | ExifReaderでEXIF抽出（HEIC対応）         |
| `lib/types/heic-convert.d.ts`       | heic-convertの型定義                     |
| `lib/types/heic2any.d.ts`           | heic2anyの型定義                         |
| `app/actions/posts.ts`              | createPostにHEIC変換フロー追加           |
| `components/posts/image-upload.tsx` | heic2any(ブラウザ側)でHEICプレビュー表示 |
| `components/posts/post-form.tsx`    | HEICファイル選択時のUI調整               |

### 処理フロー

```text
[クライアント]
    │
    ├─ HEIC/JPEG/PNG選択
    │   └─ HEICの場合はheic2anyでJPEGに変換してプレビュー表示
    │
    ▼
[サーバー (Server Action)]
    │
    ├─ 1. ファイル形式判定（マジックナンバー）
    │       │
    │       ├─ HEIC → heic-convertでJPEGに変換
    │       │
    │       └─ JPEG/PNG → そのまま
    │
    ├─ 2. EXIF抽出（ExifReader）
    │       ※元のHEICから直接抽出（ExifReaderはHEIC対応）
    │
    ├─ 3. リサイズ（sharp）
    │       ※変換後のJPEGを処理
    │
    └─ 4. アップロード（Supabase Storage）
```

### ライブラリ選定の経緯

| ライブラリ     | 用途                 | 結果                                 |
| -------------- | -------------------- | ------------------------------------ |
| exifr          | EXIF抽出             | ❌ HEICで"Unknown file format"エラー |
| exif-heic-js   | EXIF抽出             | ❌ ブラウザ専用、Node.jsで動作せず   |
| **ExifReader** | EXIF抽出             | ✅ HEICから直接抽出可能              |
| heic-convert   | JPEG変換（サーバー） | ✅ Vercel Serverlessで動作           |
| heic2any       | JPEG変換（ブラウザ） | ✅ プレビュー表示に使用              |

### ビルド結果

- TypeScript型チェック: 通過
- ビルド: 成功
