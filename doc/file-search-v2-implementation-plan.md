# File Search v2実装計画（段階的実装）

## 📋 対象機能の整理

本アプリには**3つのGemini File Search API利用機能**があります：

### 1. 投稿作成機能

- **場所**: 投稿作成画面
- **処理**: 画像アップロード → File Search Storeへ保存
- **現状の問題**: Vision APIでキャプション生成 → JSONで保存（非効率）
- **影響範囲**: `app/actions/posts.ts`, `lib/gemini/file-search-upload.ts`, `lib/gemini/caption.ts`

### 2. 類似作例表示機能

- **場所**: 投稿詳細モーダル下部
- **処理**: 投稿のEXIF情報から類似写真を検索
- **現状の問題**: レスポンス時間が7.7秒（目標: 2-3秒）
- **影響範囲**: `app/actions/posts.ts`, `lib/gemini/file-search-query.ts`

### 3. AIチャット検索機能

- **場所**: FAB（画面右下のボタン）からの検索
- **処理**: ユーザーの検索クエリ → AI回答 + 検索結果の画像表示
- **現状の問題**: レスポンス時間、会話履歴の管理
- **影響範囲**: `app/actions/search.ts`, `lib/gemini/file-search-query.ts`, `components/search/search-chat.tsx`

---

## 🎯 実装戦略

### 基本方針

1. **新規実装として並行開発**（v2ファイルを作成）
2. **機能ごとに段階的に実装・検証**
3. **各フェーズで動作確認 → OK後に次へ進む**
4. **最後に旧実装を削除してv2をv1にリネーム**

### 依存関係

```
フェーズ1: 共通基盤の実装
  ↓
フェーズ2: 投稿作成機能（v2）
  ↓ （投稿がないと検証できない）
フェーズ3: 類似作例表示機能（v2）
  ↓ （File Search Storeのデータ構造が確定）
フェーズ4: AIチャット検索機能（v2）
  ↓
フェーズ5: 既存投稿の移行
  ↓
フェーズ6: クリーンアップ
```

---

## 📅 詳細実装計画

### フェーズ1: 共通基盤の実装と検証【所要時間: 1時間】

#### 1-1. 新規ファイル作成

**作成するファイル**:

- `lib/gemini/file-search-upload-v2.ts`
- `lib/gemini/file-search-query-v2.ts`
- `scripts/test-upload-v2.ts`（検証用）

#### 1-2. 実装内容

**file-search-upload-v2.ts**:

- 画像を直接File Search Storeにアップロード
- customMetadataでEXIF情報を添付
- チャンキング設定: 500トークン/50オーバーラップ

**file-search-query-v2.ts**:

- 検索関数の基本構造（類似作例用・AIチャット用の共通部分）
- 自然言語クエリ構築関数

**test-upload-v2.ts**:

- ローカル画像ファイルを1枚アップロード
- customMetadataの確認
- アップロード時間を測定

#### 1-3. 検証方法

```bash
# テストスクリプト実行
npm run tsx scripts/test-upload-v2.ts

# 確認項目:
# ✅ アップロードが成功する
# ✅ documentNameが取得できる
# ✅ customMetadataが正しく設定される
# ✅ アップロード時間が許容範囲内（<30秒）
```

#### 1-4. 成功基準

- ✅ 画像がFile Search Storeにアップロードされる
- ✅ customMetadataにpost_id、EXIF情報が含まれる
- ✅ エラーなく完了する

#### 1-5. ログ出力例

```
📤 [V2] 画像を直接File Search Storeにアップロード中: test_image.jpg
⏳ [V2] アップロード処理中... (5秒経過)
✅ [V2] File Search Storeへのアップロード完了
📁 [V2] ドキュメント名: fileSearchStores/xxx/documents/yyy
⏱️ アップロード時間: 8,234ms
✅ customMetadata: { post_id: "test", iso: 100, fValue: 5.6, ... }
```

**✋ ここで確認して次に進む**

---

### フェーズ2: 投稿作成機能（v2）の実装【所要時間: 2-3時間】

#### 2-1. 新規ファイル作成

**作成するファイル**:

- `app/actions/posts-v2.ts`（投稿作成・取得アクション）
- `components/gallery/upload-button-v2.tsx`（v2投稿作成UI）

#### 2-2. 実装内容

**posts-v2.ts**:

- `createPostV2(formData)`: 画像を直接File Searchにアップロード
- Supabase Storageへのアップロード（表示・サムネイル用）
- データベースへの投稿保存

**upload-button-v2.tsx**:

- 既存のUploadButtonをコピーしてv2に対応
- `createPostV2`アクションを呼び出す

#### 2-3. 検証方法

```bash
# 開発サーバー起動
npm run dev

# ブラウザで動作確認:
# 1. ログイン
# 2. アップロードボタン（v2）をクリック
# 3. 画像を選択してアップロード
# 4. ブラウザコンソール・サーバーログでアップロード処理を確認
```

#### 2-4. 成功基準

- ✅ 投稿作成UIから画像をアップロードできる
- ✅ Supabase Storageに画像が保存される
- ✅ File Search Storeに画像が保存される
- ✅ postsテーブルにレコードが作成される
- ✅ ギャラリーに新しい投稿が表示される

#### 2-5. ログ出力例

```
📤 [V2] 投稿作成開始
⬆️ Supabase Storageにアップロード中...
✅ Supabase Storage: https://xxx.supabase.co/storage/v1/object/public/photos/...
🔍 [V2] File Search Storeにアップロード中...
📤 [V2] 画像を直接File Search Storeにアップロード中: photo_abc123.jpg
⏳ [V2] アップロード処理中... (5秒経過)
✅ [V2] File Search Storeへのアップロード完了
📁 [V2] ドキュメント名: fileSearchStores/xxx/documents/yyy
💾 postsテーブルに保存中...
✅ [V2] 投稿作成完了: abc123
⏱️ 合計処理時間: 12,456ms
```

#### 2-6. 画面での確認

- ギャラリーに新規投稿が表示される
- 投稿の画像、説明文、EXIF情報が正しく表示される
- 投稿詳細モーダルが開ける

**✋ ここで確認して次に進む**

---

### フェーズ3: 類似作例表示機能（v2）の実装【所要時間: 2-3時間】

#### 3-1. 新規ファイル作成

**作成するファイル**:

- `app/actions/similar-posts-v2.ts`（類似作例取得アクション）
- `scripts/test-similar-search-v2.ts`（検証用）

#### 3-2. 実装内容

**file-search-query-v2.ts**（追加実装）:

- `searchSimilarPostsV2(query)`: 類似作例検索
- `buildNaturalLanguageQuery()`: 自然言語クエリ構築

**similar-posts-v2.ts**:

- `getSimilarPostsV2(postId)`: 投稿IDから類似作例を取得
- サーバーサイドキャッシュ対応

#### 3-3. 検証方法（スクリプト）

```bash
# 検証スクリプト実行
npm run tsx scripts/test-similar-search-v2.ts

# 確認項目:
# ✅ フェーズ2で作成した投稿のIDを指定
# ✅ 類似作例が検索される
# ✅ レスポンス時間が測定される
# ✅ 検出されたpost_idsが正しい
```

#### 3-4. 検証方法（ブラウザ）

```bash
npm run dev

# ブラウザで動作確認:
# 1. フェーズ2で作成した投稿をクリック
# 2. 投稿詳細モーダルが開く
# 3. 類似作例セクションを確認
# 4. ブラウザコンソールでレスポンス時間を確認
```

#### 3-5. 成功基準

- ✅ 類似作例が検索される（0件でも可）
- ✅ レスポンス時間が **5秒以内**（目標: 2-3秒）
- ✅ 検索精度が現状と同等以上
- ✅ サーバーサイドキャッシュが動作する（2回目は高速）

#### 3-6. ログ出力例

```
🔍 [V2] 類似作例を検索中: abc123
🔍 [V2 SERVER CACHE] キャッシュミス、Gemini APIで検索
⏱️ [PERF] getPostById: 45ms
📝 [V2] 検索クエリ: 「桜」のような写真を探してください。撮影設定はISO200、F値f/8、シャッタースピード1/125、焦点距離105mmです。カメラはSONY ILCE-7M3を使用しています。
🔍 [V2 SIMILAR] 類似作例検索開始: ...
✅ [V2 SIMILAR] API呼び出し完了 (2,345ms)
🔍 [V2 SIMILAR] Grounding metadata検出
✅ [V2 SIMILAR] 抽出されたPost ID数: 4
📋 Post IDs: ['def456', 'ghi789', ...]
⏱️ [PERF] searchSimilarPostsV2: 2,345ms
✅ [V2] 3件の類似作例を取得
⏱️ [PERF] 合計処理時間: 2,487ms
```

#### 3-7. パフォーマンス比較

| 項目         | 現状（v1） | v2実装          | 改善率   |
| ------------ | ---------- | --------------- | -------- |
| **検索時間** | 7,700ms    | 2,300ms（目標） | **-70%** |

**✋ ここで確認して次に進む**

---

### フェーズ4: AIチャット検索機能（v2）の実装【所要時間: 2-3時間】

#### 4-1. 新規ファイル作成

**作成するファイル**:

- `app/actions/search-v2.ts`（検索アクション）
- `scripts/test-ai-search-v2.ts`（検証用）

#### 4-2. 実装内容

**file-search-query-v2.ts**（追加実装）:

- `searchWithFileSearchV2(query, conversationHistory)`: AIチャット検索
- システムプロンプト対応
- 会話履歴対応

**search-v2.ts**:

- `searchPostsV2(query, conversationHistory)`: 検索実行
- AI回答生成 + 検索結果の投稿を返す

#### 4-3. 検証方法（スクリプト）

```bash
# 検証スクリプト実行
npm run tsx scripts/test-ai-search-v2.ts

# 確認項目:
# ✅ クエリ: "桜の写真を探してください"
# ✅ AI回答が生成される
# ✅ 検索結果のpost_idsが取得される
# ✅ レスポンス時間が測定される
```

#### 4-4. 検証方法（ブラウザ）

```bash
npm run dev

# ブラウザで動作確認:
# 1. FAB（右下のボタン）をクリック
# 2. 検索フォームに「桜の写真を探してください」と入力
# 3. 送信
# 4. AI回答が表示される
# 5. 検索結果の画像が表示される
# 6. ブラウザコンソールでレスポンス時間を確認
```

#### 4-5. 成功基準

- ✅ 検索クエリに対してAI回答が生成される
- ✅ 検索結果の画像が表示される
- ✅ レスポンス時間が **5秒以内**（目標: 2-3秒）
- ✅ 会話履歴が正しく機能する（2回目以降の質問）
- ✅ カメラ設定・撮影のコツが構造化されて表示される

#### 4-6. ログ出力例

```
🔍 [V2 DEBUG] searchPostsV2開始: 桜の写真を探してください
🔍 [V2] File Search検索開始: 桜の写真を探してください
📝 [V2] システムプロンプト適用
✅ [V2] AI回答生成完了: ## 📸 カメラ設定 ISO: 200 | F値: f/8...
🔍 [V2] Grounding metadata検出
✅ [V2] 抽出されたPost ID数: 5
📋 [V2 DEBUG] File Searchで取得したPost ID: ['abc123', 'def456', ...]
⏱️ [PERF] searchWithFileSearchV2: 2,567ms
✅ [V2 DEBUG] フィルタリング結果: { totalPosts: 21, filteredPosts: 5 }
✅ [V2 DEBUG] searchPostsV2完了: { postsCount: 5, aiResponse: "..." }
⏱️ [PERF] 合計処理時間: 2,789ms
```

#### 4-7. 画面での確認

- AI回答がMarkdown形式で表示される
- カメラ設定カードが表示される
- 撮影のコツが箇条書きで表示される
- 検索結果の画像グリッドが表示される
- 画像をクリックすると投稿詳細モーダルが開く

**✋ ここで確認して次に進む**

---

### フェーズ5: 既存投稿の移行【所要時間: 2-3時間】

#### 5-1. 新規ファイル作成

**作成するファイル**:

- `scripts/migrate-to-v2.ts`（移行スクリプト）

#### 5-2. 実装内容

**migrate-to-v2.ts**:

- 既存の21投稿を取得
- 各投稿について:
  1. 旧JSONドキュメントを削除
  2. 画像をダウンロード
  3. v2方式で再アップロード
  4. データベースのfile_search_store_idを更新
  5. キャッシュをクリア

#### 5-3. 実行前の準備

```bash
# .env.localの確認
# GEMINI_API_KEY
# SUPABASE_SERVICE_ROLE_KEY
# NEXT_PUBLIC_SUPABASE_URL

# バックアップ（念のため）
# Supabaseダッシュボードでpostsテーブルをエクスポート
```

#### 5-4. 実行方法

```bash
# 移行スクリプト実行
npm run tsx scripts/migrate-to-v2.ts

# 確認項目:
# ✅ 21投稿すべてが処理される
# ✅ エラーがない（またはリトライで成功）
# ✅ file_search_store_idが更新される
```

#### 5-5. 成功基準

- ✅ 21投稿すべてが新方式で再アップロードされる
- ✅ データベースのfile_search_store_idが更新される
- ✅ エラーが0件（または許容範囲内）
- ✅ 類似作例検索が全投稿で動作する
- ✅ AIチャット検索が全投稿を検索できる

#### 5-6. ログ出力例

```
================================================================================
既存投稿のv2移行開始
================================================================================

📊 合計 21 件の投稿を移行します

--------------------------------------------------------------------------------
[1/21] 投稿ID: abc123
🗑️ 旧ドキュメントを削除: fileSearchStores/xxx/documents/old_doc
⬇️ 画像をダウンロード: https://xxx.supabase.co/storage/v1/object/public/photos/...
📤 [V2] 新方式でアップロード中...
✅ [V2] File Search Storeへのアップロード完了
💾 データベース更新中...
✅ 移行完了
--------------------------------------------------------------------------------
[2/21] 投稿ID: def456
...

================================================================================
移行完了
================================================================================
✅ 成功: 21 件
❌ エラー: 0 件
================================================================================
```

#### 5-7. 移行後の確認

```bash
npm run dev

# ブラウザで動作確認:
# 1. ギャラリーで全投稿が表示される
# 2. 各投稿の詳細モーダルを開く
# 3. 類似作例が表示される
# 4. FABから検索して全投稿が検索できる
```

**✋ ここで確認して次に進む**

---

### フェーズ6: クリーンアップ【所要時間: 1時間】

#### 6-1. 旧実装ファイルを削除

```bash
# 削除するファイル:
rm lib/gemini/caption.ts
rm lib/gemini/file-search-upload.ts
rm lib/gemini/file-search-query.ts
rm scripts/reupload-to-file-search.ts
```

#### 6-2. v2ファイルをv1にリネーム

```bash
# リネーム:
mv lib/gemini/file-search-upload-v2.ts lib/gemini/file-search-upload.ts
mv lib/gemini/file-search-query-v2.ts lib/gemini/file-search-query.ts
mv app/actions/posts-v2.ts app/actions/posts.ts
mv app/actions/search-v2.ts app/actions/search.ts
mv app/actions/similar-posts-v2.ts app/actions/similar-posts.ts
```

#### 6-3. フロントエンドの修正

- `components/gallery/upload-button-v2.tsx` → `upload-button.tsx`
- インポートパスを修正

#### 6-4. 最終確認

```bash
npm run dev

# すべての機能が動作することを確認:
# ✅ 投稿作成
# ✅ 類似作例表示
# ✅ AIチャット検索
# ✅ エラーがない
```

#### 6-5. ドキュメント更新

- `doc/file-search-implementation-analysis.md` に「v2移行完了」を追記
- `doc/performance-optimization-similar-posts.md` に最終結果を記載

#### 6-6. コミット・PR作成

```bash
# /deployコマンドでコミット・プッシュ・PR作成
/deploy File Search v2移行完了
```

---

## 📊 最終的な期待効果

| 機能               | 現状（v1）           | v2実装後                   | 改善率       |
| ------------------ | -------------------- | -------------------------- | ------------ |
| **投稿作成時間**   | 不明                 | Vision API削減で30-50%短縮 | **-30~50%**  |
| **類似作例検索**   | 7.7秒                | 2-3秒                      | **-60~70%**  |
| **AIチャット検索** | 不明                 | 2-3秒                      | **大幅改善** |
| **月間APIコスト**  | Vision + File Search | File Searchのみ            | **-30~40%**  |

---

## ⚠️ 各フェーズの注意事項

### フェーズ1

- ローカル画像ファイルを用意する
- APIキーが正しく設定されているか確認

### フェーズ2

- Supabase Storageの容量を確認
- 投稿作成UIのテストは複数の画像で実施

### フェーズ3

- フェーズ2で作成した投稿が必要
- キャッシュの動作確認も忘れずに

### フェーズ4

- 会話履歴のテストも実施（2回目以降の質問）
- AI回答の構造化が正しいか確認

### フェーズ5

- **必ずバックアップを取る**
- レート制限に注意（2秒間隔でアップロード）
- エラーが発生した投稿は手動で確認

### フェーズ6

- 削除前にGitコミットしておく
- ロールバックできる状態を維持

---

## 🎯 各フェーズの判断基準

### 次のフェーズに進む条件

- ✅ すべての成功基準をクリア
- ✅ ログ出力が期待通り
- ✅ エラーが発生していない
- ✅ 画面での動作確認が完了

### 前のフェーズに戻る条件

- ❌ 成功基準を満たせない
- ❌ 重大なエラーが発生
- ❌ パフォーマンスが期待値を大きく下回る

---

## 📝 次のステップ

1. この実装計画をレビュー
2. 承認後、**フェーズ1から順番に実装開始**
3. 各フェーズ完了ごとに報告・確認
4. すべてのフェーズ完了後、最終レビュー

---

## 💬 実装中の確認フロー

```
【フェーズ開始】
  ↓
実装
  ↓
ログ出力確認
  ↓
画面/スクリプトで動作確認
  ↓
✅ OK → 次のフェーズへ
❌ NG → 修正 or 前のフェーズに戻る
```

各フェーズで**必ず確認のための一時停止**を入れます。
