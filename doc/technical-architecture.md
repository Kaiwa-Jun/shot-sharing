# 技術アーキテクチャ

## 1. 使用技術スタック

### フロントエンド

- **Next.js 16**（App Router）
  - React Server Components
  - Client Components
  - Server Actions
- **TypeScript**
- **Tailwind CSS**（スタイリング）
- **shadcn/ui**（UIコンポーネント）
- **Framer Motion**（アニメーション）

### バックエンド・インフラ

- **Vercel**（ホスティング）
- **Supabase**
  - PostgreSQL（データベース）
  - Auth（Googleログイン認証）
  - Storage（画像保存）
- **Gemini API**
  - File Search API（RAG検索）
  - モデル: Gemini 1.5 Flash/Pro or 2.0 Flash

### ライブラリ（想定）

- **UI関連**
  - Masonry レイアウト用ライブラリ
  - 画像処理（Sharp等）
- **データ取得**
  - SWR or TanStack Query
- **その他**
  - exif-js（Exif情報読み取り）

## 2. システム構成

### アーキテクチャ概要

```
[クライアント（ブラウザ）]
        ↓
[Next.js App（Vercel）]
    ├── Supabase Auth（認証）
    ├── Supabase DB（データ管理）
    ├── Supabase Storage（表示用画像）
    └── Gemini API（RAG検索）
        └── File Search Store（検索用）
```

### 各コンポーネントの役割

**Next.js App Router（フロントエンド + バックエンド）**

- UI/UX全般（RSC + Client Components）
- Server Actions で各サービスとの通信
- 画像アップロード・リサイズ処理

**実装方針（画面ごとの使い分け）**

- ギャラリー画面（/）：RSC で初期表示 + Client Components で無限スクロール
- 検索結果画面（/search）：Client Components（チャットUI・リアルタイム更新）
- 作例詳細（/posts/[id]）：RSC でデータ取得 + Client Components でインタラクション
- 投稿画面（/posts/new）：Client Components（画像プレビュー）+ Server Actions（投稿処理）
- プロフィール（/me）：RSC で初期表示 + Client Components でタブ切替
- 設定画面（/settings）：RSC（静的コンテンツ）+ Server Actions（ログアウト処理）

**Supabase**

- Auth：ユーザー登録・ログイン管理
- Database（PostgreSQL）：
  - ユーザープロフィール
  - 投稿メタデータ（File Search Store IDとの紐付け）
  - 保存機能の管理
- Storage：表示用画像（オリジナル・サムネイル）の保存

**Gemini API / File Search**

- RAGストア：検索用画像とメタデータの保存
- ベクトル検索：類似画像の検索
- チャット応答：自然言語での回答生成

### データフロー（投稿時）

1. ユーザーが画像をアップロード
2. Next.js でサムネイル生成
3. Supabase Storage に表示用画像を保存（オリジナル + サムネイル）
4. File Search Store に検索用データを送信（画像 + Exif JSON）
5. Store ID を受け取る
6. Supabase DB に投稿情報、画像URL、Store ID を保存

### 画像の二重管理

- **File Search Store**：検索・解析専用（ベクトル化）
- **Supabase Storage**：表示専用（高速配信）

## 3. データ設計

### File Search

- `photo_xxx.jpg|png`（見た目を内部ベクトル化）
- `photo_xxx.json`（Exif・ジャンル・撮影意図などテキスト）

### テーブル設計（Supabase PostgreSQL）

**profiles**（ユーザープロフィール）

```sql
profiles {
  id: uuid (PK, FK → auth.users.id)
  email: string (not null, from Google)
  display_name: string (from Google initially)
  avatar_url: string (from Google initially)
  bio: text
  created_at: timestamp
  updated_at: timestamp
}
```

※Supabase AuthのGoogleログイン後、自動的にprofilesレコードを作成（トリガー使用）

**posts**（投稿）

```sql
posts {
  id: uuid (PK)
  user_id: uuid (FK → profiles.id, not null)
  file_search_store_id: string (File Search Store ID)
  image_url: string (Supabase Storage URL)
  thumbnail_url: string (サムネイル URL)
  description: text
  exif_data: jsonb {
    iso: number
    f_value: number
    shutter_speed: string
    exposure_compensation: number
    white_balance: string
    focal_length: number
    camera_make: string
    camera_model: string
    lens: string
  }
  visibility: enum ('public', 'private') default 'public'
  created_at: timestamp
  updated_at: timestamp
}
```

**saves**（保存/お気に入り）

```sql
saves {
  id: uuid (PK)
  user_id: uuid (FK → profiles.id, not null)
  post_id: uuid (FK → posts.id, not null)
  created_at: timestamp
  
  UNIQUE(user_id, post_id)
}
```

**search_histories**（検索履歴 - MVP以降）

```sql
search_histories {
  id: uuid (PK)
  user_id: uuid (FK → profiles.id, not null)
  query: text (not null)
  query_type: enum ('text', 'image')
  created_at: timestamp
}
```

### 認証フロー

1. Googleログインボタンクリック
2. Supabase Auth がGoogle OAuth処理
3. 初回ログイン時、profilesテーブルに自動登録（Googleの名前・アバター使用）
4. 2回目以降は既存profileを使用

### インデックス

- profiles.email
- posts.user_id
- posts.created_at
- saves.user_id
- saves.post_id
- saves.created_at

## 4. API設計

### エンドポイント一覧（MVPフェーズ）

**認証関連**

```typescript
// Supabase Auth SDK使用
supabase.auth.signInWithOAuth({ provider: 'google' })
supabase.auth.signOut()
```

**投稿関連（Server Actions）**

```typescript
POST   /api/posts/create        // 投稿作成
GET    /api/posts               // 投稿一覧（ギャラリー）
GET    /api/posts/[id]          // 投稿詳細
```

**検索関連（Server Actions）**

```typescript
POST   /api/search              // RAG検索（テキスト/画像）
POST   /api/search/chat         // チャット継続
```

**保存関連（Server Actions）**

```typescript
POST   /api/saves/toggle        // 保存/解除の切り替え
GET    /api/saves               // 保存一覧
```

**プロフィール関連**

```typescript
GET    /api/users/me            // 自分のプロフィール
GET    /api/users/me/posts      // 自分の投稿
GET    /api/users/me/saves      // 自分の保存
```

### 主要APIの詳細

**POST /api/posts/create**

```typescript
// Request
{
  image: File,
  description?: string
}

// Response
{
  id: string,
  image_url: string,
  thumbnail_url: string,
  exif_data: {...}
}

// 処理フロー
1. 画像リサイズ・サムネイル生成
2. Supabase Storageに保存
3. Exif情報抽出
4. Gemini File Searchに登録
5. DBに投稿情報保存
```

**POST /api/search**

```typescript
// Request
{
  query?: string,        // テキスト検索
  image?: File,         // 画像検索
  conversation_id?: string  // 会話継続用
}

// Response
{
  results: [{
    id: string,
    image_url: string,
    exif_data: {...},
    relevance_score: number
  }],
  ai_response: string,
  conversation_id: string
}

// 処理フロー
1. Gemini File Search APIに問い合わせ
2. Store IDから投稿情報取得
3. AIレスポンス生成
4. 結果を整形して返却
```

## 5. SEO対策

### 実装内容（MVPフェーズ）

- **メタタグ最適化**
  - ページごとのtitle、description設定
  - 作例詳細ページの動的メタタグ生成

- **OGP（Open Graph Protocol）**
  - SNSシェア時のプレビュー最適化
  - 画像、タイトル、説明文の設定

- **技術的SEO**
  - sitemap.xml自動生成
  - robots.txt設定
  - 構造化データ（Schema.org）対応

- **パフォーマンス最適化**
  - Next.js Image Optimizationによる画像最適化
  - Core Web Vitals対応
