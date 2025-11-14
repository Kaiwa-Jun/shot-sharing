# Gemini API セットアップガイド

このドキュメントでは、shot-sharingアプリでGemini APIを使用するためのセットアップ手順を説明します。

## 前提条件

- Googleアカウント
- Google AI Studio へのアクセス

## セットアップ手順

### 1. Google AI Studio でAPIキーを取得

1. [Google AI Studio](https://aistudio.google.com/app/apikey) にアクセス
2. **「Get API key」** または **「APIキーを取得」** をクリック
3. 以下のいずれかを選択:
   - **Create API key in new project** - 新しいプロジェクトを作成
   - **Create API key in existing project** - 既存のGoogle Cloudプロジェクトを選択
4. APIキーが生成されたらコピー

### 2. 環境変数にAPIキーを設定

`.env.local` ファイルにAPIキーを追加:

```bash
GEMINI_API_KEY=your-api-key-here
```

### 3. パッケージのインストール

すでにインストール済みですが、新しい環境では以下を実行:

```bash
npm install @google/generative-ai
```

## 使用方法

### 基本的なテキスト生成

```typescript
import { generateText } from '@/lib/gemini/client'

const response = await generateText('こんにちは！')
console.log(response)
```

### Server Actions経由での使用

```typescript
import { testGeminiAPI, askPhotoQuestion } from '@/app/actions/gemini'

// シンプルなテスト
const result = await testGeminiAPI('質問内容')

// 撮影設定に関する質問
const answer = await askPhotoQuestion('夕焼けの撮影方法')
```

## モデルの選択

現在のデフォルト: **Gemini 2.0 Flash Exp**

利用可能なモデル:
- `gemini-2.0-flash-exp` - 最新・バランス型（デフォルト）
- `gemini-1.5-flash` - コスト重視
- `gemini-1.5-pro` - 精度重視

モデルの変更:

```typescript
import { getGeminiModel } from '@/lib/gemini/client'

const model = getGeminiModel('gemini-1.5-pro')
```

## ファイル構成

```
lib/gemini/
├── client.ts           # Geminiクライアント基本設定
└── file-search.ts      # File Search API関連（将来実装予定）

app/actions/
└── gemini.ts           # Server Actions（API呼び出し）

app/components/
└── gemini-test.tsx     # テストコンポーネント
```

## 動作確認

1. **開発サーバーを起動**
   ```bash
   npm run dev
   ```

2. **ブラウザでアクセス**
   - http://localhost:3000

3. **Gemini API 接続テストセクション**で以下を試す:
   - **シンプルテスト**: 基本的なテキスト生成
   - **撮影設定の質問（デモ）**: 撮影に関する質問応答

## 将来的な実装予定

### File Search API（RAG機能）

現在は基本的なテキスト生成のみですが、将来的に以下を実装予定:

1. **画像のアップロード**
   - 投稿画像とメタデータ（EXIF）をFile Search Storeに登録

2. **マルチモーダル検索**
   - テキスト検索: 「夕焼けの撮影方法」
   - 画像検索: クエリ画像をアップロードして類似画像を検索
   - 併用検索: テキスト + 画像

3. **撮影設定の推奨**
   - 検索結果から類似作例の撮影設定を取得
   - AIが推奨設定を生成（ISO/F値/SS/露出補正等）

詳細は `doc/technical-architecture.md` を参照してください。

## トラブルシューティング

### APIキーのエラー

```
Error: GEMINI_API_KEY is not set in environment variables
```

→ `.env.local` にAPIキーが設定されているか確認
→ 開発サーバーを再起動

### レート制限エラー

Google AI Studioの無料プランには以下の制限があります:
- 1分あたり15リクエスト
- 1日あたり1,500リクエスト

本番環境では、Google Cloud Platformで有料プランを検討してください。

### モデルが見つからないエラー

使用可能なモデル名を確認してください:
- `gemini-2.0-flash-exp`
- `gemini-1.5-flash`
- `gemini-1.5-pro`

## 参考リンク

- [Google AI for Developers](https://ai.google.dev/)
- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
- [Google AI Studio](https://aistudio.google.com/)
