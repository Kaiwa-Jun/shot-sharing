# Claude Code PRレビュー自動化 - セットアップ手順

## 概要

このワークフローは、Pull Request作成時に自動的にClaude Codeによるコードレビューを実行します。
また、PRやIssueのコメントで`@claude`とメンションすることで、対話的なレビューも可能です。

## 必要な設定

### 1. Anthropic APIキーの取得と設定

#### Step 1: APIキーの生成

1. Anthropic Console にアクセス:
   - https://console.anthropic.com/

2. ログインまたはアカウント作成

3. 「API Keys」セクションでAPIキーを生成

4. 生成されたAPIキーをコピー（このキーは再表示されないため、安全に保管してください）

#### Step 2: GitHub Secretsに登録

1. GitHubリポジトリの設定ページにアクセス:
   - https://github.com/Kaiwa-Jun/shot-sharing/settings/secrets/actions

2. 「New repository secret」をクリック

3. 以下の情報を入力:
   - **Name**: `ANTHROPIC_API_KEY`
   - **Value**: Step 1でコピーしたAPIキー

4. 「Add secret」をクリックして保存

### 2. 権限の確認

ワークフローが正常に動作するために、以下の権限が必要です（`.github/workflows/claude-pr-review.yml`に既に設定済み）:

- `contents: write` - リポジトリコンテンツの読み書き
- `pull-requests: write` - PRへのコメント投稿
- `issues: write` - Issueへのコメント投稿
- `id-token: write` - OIDC認証用
- `actions: read` - CI結果の分析用

これらの権限はワークフローファイルに記述されているため、追加設定は不要です。

### 3. 動作確認

#### PR自動レビューのテスト

1. 新しいブランチを作成してPRを作成
   ```bash
   git checkout -b test/claude-review
   echo "test" > test.txt
   git add test.txt
   git commit -m "test: Claude Code review test"
   git push -u origin test/claude-review
   gh pr create --title "Test Claude Code Review" --body "自動レビューのテスト"
   ```

2. GitHub Actionsタブでワークフローの実行を確認

3. 数分後、PRにClaude Codeからのレビューコメントが投稿される

#### @claudeメンション応答のテスト

1. PRまたはIssueのコメント欄に以下のようにコメント:
   ```
   @claude このコードについてレビューしてください
   ```

2. 数分後、Claude Codeから応答コメントが投稿される

## 機能説明

### 自動PRレビュー（PR作成・更新時）

- **トリガー**: PR作成、再オープン、同期、レビュー準備完了時
- **スキップ**: ドラフトPRはレビュー対象外
- **レビュー内容**:
  - **セキュリティ**: SQLインジェクション、XSS、CSRF、認証・認可、機密情報漏洩
  - **コード品質**: 可読性、保守性、設計パターン、命名規則、エラーハンドリング
  - **パフォーマンス**: N+1問題、不必要な計算、メモリリーク、キャッシュ
  - **ベストプラクティス**: コーディング規約、テストカバレッジ、ドキュメント、型安全性
  - **ビジネスロジック**: 要件整合性、エッジケース、データ整合性

### @claudeメンション応答

- **トリガー**: コメントに`@claude`または`@Claude`を含む
- **対応内容**:
  - コードレビューの詳細化
  - 技術的な質問への回答
  - 実装提案の提供
  - デバッグ支援

### レビュー出力形式

Claude Codeは以下の形式でレビュー結果をPRにコメントします：

```markdown
# 🤖 Claude Code 自動レビュー結果

## 総合評価
承認可能 / 修正必要 / 要議論

## レビューサマリー
[全体的な所感]

## 重要度別の指摘事項

### 🚨 Critical（必ず修正が必要）
- [具体的な問題点と修正方法]

### ⚠️ Warning（修正を強く推奨）
- [具体的な問題点と修正提案]

### 💡 Suggestion（改善提案）
- [改善できる点と具体例]

### ✅ Good（良い実装）
- [評価できる点]
```

## カスタマイズ

### レビュー基準の変更

`.github/workflows/claude-pr-review.yml`のpromptセクションを編集することで、レビュー基準をカスタマイズできます。

例：特定のフレームワークやライブラリに関するレビューを追加

```yaml
### 6. Next.js/Supabase固有のレビュー
- App Routerのベストプラクティス準拠
- Supabase RLSの適切な使用
- サーバーコンポーネントとクライアントコンポーネントの適切な分離
```

### モデルの変更

`model`パラメータを変更することで、使用するAIモデルを変更できます:

```yaml
model: "claude-3-5-sonnet-20241022"  # 現在の設定（バランス型）
# model: "claude-opus-4-1-20250805"  # より高性能（コストも高い）
```

### 使用ツールの調整

`allowed_tools`パラメータで、Claude Codeが使用できるツールを制限できます：

```yaml
allowed_tools: "Bash(gh pr comment:*),Bash(gh pr diff:*),Bash(gh pr view:*),Read,View,GlobTool,GrepTool"
```

## トラブルシューティング

### レビューが実行されない場合

1. **Secretsの確認**
   ```bash
   gh secret list
   ```
   `ANTHROPIC_API_KEY`が表示されることを確認

2. **ワークフローの権限確認**
   - リポジトリ設定 → Actions → General
   - "Workflow permissions"が"Read and write permissions"になっているか確認

3. **ワークフローログの確認**
   - GitHub Actions タブでワークフローの実行ログを確認
   - エラーメッセージから問題を特定

### エラーが発生する場合

- `notify-failure`ジョブが自動的にPRにエラーコメントを投稿します
- GitHub Actionsのログで詳細なエラー情報を確認してください

### APIキーの更新が必要な場合

APIキーを更新する必要がある場合：

1. Anthropic Console で新しいAPIキーを生成
   - https://console.anthropic.com/

2. GitHub Secretsを更新
   - https://github.com/Kaiwa-Jun/shot-sharing/settings/secrets/actions
   - `ANTHROPIC_API_KEY`を選択して「Update」

## 注意事項

- **コスト**: レビューにはClaude CodeのAPIクォータが消費されます
- **処理時間**: 大規模なPRの場合、レビューに5-10分程度かかる可能性があります
- **ultrathink**: `ultrathink`キーワードにより、より深い分析が行われます（処理時間が増加）
- **ドラフトPR**: ドラフト状態のPRは自動レビューの対象外です（レビュー準備完了時に実行）

## 参考リンク

- [Claude Code 公式ドキュメント](https://docs.anthropic.com/claude/docs)
- [GitHub Actions ドキュメント](https://docs.github.com/actions)
- [shot-sharing プロジェクトドキュメント](../../doc/)

## サポート

問題が発生した場合は、以下のチャネルでサポートを受けられます：

1. GitHub Issues: プロジェクトのIssueとして報告
2. プロジェクトドキュメント: `doc/`ディレクトリ内の関連ドキュメントを参照
