# Supabaseセットアップガイド

このドキュメントでは、shot-sharingアプリのSupabaseバックエンドをセットアップする手順を説明します。

## 前提条件

- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started)がインストール済み
- Supabaseアカウントを作成済み
- Node.js 18以上がインストール済み

## セットアップ手順

### 1. Supabaseプロジェクトの作成

[Supabase Dashboard](https://app.supabase.com/)にアクセスし、新しいプロジェクトを作成します。

1. **New Project**をクリック
2. プロジェクト名を入力（例：`shot-sharing`）
3. Database Passwordを設定（安全な場所に保存してください）
4. Regionを選択（推奨：Tokyo - Northeast Asia (Tokyo)）
5. **Create new project**をクリック

### 2. プロジェクトの接続情報を取得

プロジェクトが作成されたら、**Settings** → **API**から以下の情報を取得します:

- **Project URL**: `https://xxxxx.supabase.co`
- **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3. 環境変数の設定

プロジェクトルートに`.env.local`ファイルを作成します:

```bash
cp .env.local.example .env.local
```

`.env.local`に取得した情報を入力:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Supabase CLIでプロジェクトにリンク

```bash
supabase link --project-ref your-project-ref
```

Project Refは、Supabase DashboardのSettings → Generalから確認できます（例：`abcdefghijklmnop`）。

Database Passwordの入力を求められたら、プロジェクト作成時に設定したパスワードを入力してください。

### 5. マイグレーションの実行

データベーステーブルとStorageバケットを作成します:

```bash
supabase db push
```

これにより、以下が自動的にセットアップされます:

- **profiles**テーブル（ユーザープロフィール）
- **posts**テーブル（投稿）
- **saves**テーブル（保存/お気に入り）
- **posts**ストレージバケット（画像保存用）
- RLS（Row Level Security）ポリシー
- Google認証時の自動プロフィール作成トリガー

### 6. Google OAuth認証の設定

1. Supabase Dashboard → **Authentication** → **Providers**を開く
2. **Google**を選択
3. **Enabled**をオンにする
4. [Google Cloud Console](https://console.cloud.google.com/)でOAuthクライアントIDを作成:
   - プロジェクトを作成（既存のものを使用してもOK）
   - **APIs & Services** → **Credentials**を開く
   - **Create Credentials** → **OAuth client ID**を選択
   - Application typeは**Web application**を選択
   - **Authorized redirect URIs**に以下を追加:
     ```
     https://xxxxx.supabase.co/auth/v1/callback
     ```
5. 作成されたClient IDとClient SecretをSupabase Dashboardに入力
6. **Save**をクリック

### 7. 動作確認

#### ローカル開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開き、Googleログインが機能するか確認します。

#### データベース接続の確認

```bash
supabase db remote status
```

正常に接続されていれば、データベースの状態が表示されます。

## マイグレーションファイルの構成

```
supabase/
├── migrations/
│   ├── 20251114094559_initial_setup.sql    # テーブル作成・RLS設定
│   └── 20251114094723_storage_setup.sql    # Storageバケット設定
└── config.toml                              # Supabase設定ファイル
```

## テーブル構造

### profiles

- ユーザープロフィール情報
- Google認証時に自動作成（トリガー）
- 全員が閲覧可、本人のみ更新可

### posts

- 投稿情報（画像URL、Exif、説明文など）
- File Search Store IDで検索機能と連携
- public投稿は全員が閲覧可、本人のみCRUD可

### saves

- お気に入り機能
- 本人のみ閲覧・作成・削除可
- user_id + post_idの組み合わせで一意性制約

## Storageバケット

### posts バケット

- 画像保存用（オリジナル + サムネイル）
- 公開バケット（全員が閲覧可）
- ファイルサイズ上限: 10MB
- 許可される形式: JPEG, PNG, WebP
- ユーザーは自分の画像のみアップロード・更新・削除可

## トラブルシューティング

### マイグレーションエラー

```bash
# マイグレーション状態の確認
supabase migration list

# 特定のマイグレーションをリセット
supabase db reset
```

### 型定義の生成

TypeScript型定義を生成する場合:

```bash
supabase gen types typescript --linked > lib/supabase/database.types.ts
```

### ローカル開発環境の起動

Supabaseローカル環境で開発する場合:

```bash
# ローカル環境の起動
supabase start

# ローカル環境の停止
supabase stop
```

## 参考リンク

- [Supabase公式ドキュメント](https://supabase.com/docs)
- [Supabase CLI リファレンス](https://supabase.com/docs/reference/cli)
- [Next.js + Supabase統合ガイド](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
