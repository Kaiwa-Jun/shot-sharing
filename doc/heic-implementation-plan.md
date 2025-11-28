# HEIC画像アップロード対応 - 実装計画

## 環境情報

| 項目       | バージョン |
| ---------- | ---------- |
| Next.js    | 16.0.3     |
| Node.js    | 22.16.0    |
| sharp      | 0.34.5     |
| exifr      | 7.1.3      |
| デプロイ先 | Vercel     |

## 調査結果（2024-11-28）

### 1. sharp のHEIC対応状況

**結論: Vercelでは非対応**

sharpの事前ビルドバイナリにはHEIC/HEIFサポートが含まれていない。理由はlibheif/libde265/x265のライセンス問題（特許）。カスタムビルドのlibvipsが必要だが、Vercel Serverlessでは困難。

参考:

- [sharp HEIC Issue #3680](https://github.com/lovell/sharp/issues/3680)
- [Vercel Discussion #4591](https://github.com/vercel/vercel/discussions/4591)

### 2. exifr のHEIC対応状況

**結論: 対応している**

exifrはHEIC/HEIF形式からEXIF抽出に対応:

- EXIF/TIFF, GPS: ✅ 対応
- ICC: ✅ 対応
- XMP: ❌ 非対応
- Thumbnail: ❌ 非対応

参考: [exifr GitHub](https://github.com/MikeKovarik/exifr)

### 3. HEIC変換ライブラリ比較

| ライブラリ       | 環境     | 用途              | メリット            | デメリット                           |
| ---------------- | -------- | ----------------- | ------------------- | ------------------------------------ |
| **heic-convert** | Node.js  | HEIC→JPEG/PNG     | シンプルなAPI、安定 | 同期処理が重い                       |
| heic-decode      | Node.js  | HEIC→RGBA         | 低レベルAPI         | 自分でエンコード必要                 |
| heic2any         | ブラウザ | HEIC→JPEG/PNG/GIF | クライアント完結    | バンドル+600KB、HEVC非対応の場合あり |
| libheif-js       | 両方     | デコーダー        | 低レベル制御可能    | 複雑                                 |

参考:

- [heic-convert npm](https://www.npmjs.com/package/heic-convert)
- [heic2any npm](https://www.npmjs.com/package/heic2any)

### 4. 推奨アプローチ

**サーバーサイドで`heic-convert`を使用してJPEGに変換後、`sharp`でリサイズ**

理由:

1. クライアントに変換を任せるのはセキュリティ上推奨されない
2. heic-convertはVercel Serverlessで動作可能（ネイティブ依存なし）
3. exifrは元のHEICから直接EXIF抽出可能

## 実装計画

### フロー図

```text
[クライアント]
    │
    ├─ HEIC/JPEG/PNG選択
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
    ├─ 2. EXIF抽出（exifr）
    │       ※元のHEICまたは変換後のJPEGから抽出
    │
    ├─ 3. リサイズ（sharp）
    │       ※変換後のJPEG/PNGを処理
    │
    └─ 4. アップロード（Supabase Storage）
```

### 実装ステップ

#### Step 1: HEIC判定ユーティリティ作成

**ファイル**: `lib/image/detect-format.ts`

マジックナンバーでHEIC/HEIFを判定する。ftypボックス（オフセット4-7）が"ftyp"で、ブランド（オフセット8-11）がheic/heix/mif1等かどうかをチェック。

#### Step 2: HEIC変換ユーティリティ作成

**ファイル**: `lib/image/heic-converter.ts`

```typescript
import convert from "heic-convert";

export async function convertHeicToJpeg(buffer: Buffer): Promise<Buffer> {
  return await convert({
    buffer,
    format: "JPEG",
    quality: 0.92,
  });
}
```

#### Step 3: posts.ts の createPost を修正

```typescript
// 1. ArrayBufferを取得
const arrayBuffer = await imageFile.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);

// 2. HEIC判定
const isHeicImage = isHeic(arrayBuffer);

// 3. HEICの場合は変換
let processableBuffer = buffer;
if (isHeicImage) {
  processableBuffer = await convertHeicToJpeg(buffer);
}

// 4. EXIF抽出（元のバッファから - exifrはHEIC対応）
const exifData = await extractExifData(buffer);

// 5. リサイズ（変換後のバッファを使用）
const [thumbnail, display] = await Promise.all([
  createThumbnail(processableBuffer),
  resizeForDisplay(processableBuffer),
]);
```

#### Step 4: クライアントプレビュー対応（オプション）

HEICプレビューは以下の優先順位で対応:

1. Safari: ネイティブ対応しているのでそのまま表示
2. Chrome/Firefox: プレースホルダー表示（「サーバーで変換されます」）
3. 将来的: heic2anyでクライアント変換（バンドルサイズ注意）

## 参考リンク

- [heic-convert npm](https://www.npmjs.com/package/heic-convert)
- [exifr GitHub](https://github.com/MikeKovarik/exifr)
- [sharp HEIC Issue](https://github.com/lovell/sharp/issues/3680)
- [Vercel HEIF Discussion](https://github.com/vercel/vercel/discussions/4591)
- [Handling HEIC on the web](https://upsidelab.io/blog/handling-heic-on-the-web)
