# 類似作例表示のパフォーマンス最適化案

## 📊 現状分析

### パフォーマンス測定結果

- **現在のレイテンシ**: 約11秒（10,941ms）
- **内訳**:
  - `searchSimilarPostsWithFileSearch`: 10,941ms（95%）
  - `getPosts(100)`: 57ms（5%）
- **ボトルネック**: Gemini File Search API呼び出し

### ベンチマーク比較

- **公式の想定レイテンシ**: 2秒以内
- **現状との差**: **約5.5倍遅い**
- **実例**: 他のユースケースでは9分 → 45秒への短縮を実現

### 結論

**大幅な改善の余地あり**。公式推奨のベストプラクティスを適用することで、3〜5倍のパフォーマンス向上が期待できる。

---

## 🚀 改善案（効果が高い順）

### 改善案1: クライアントサイドキャッシング ⭐⭐⭐

**推奨度**: 最高（即効性が最も高い）

#### 期待効果

- **初回アクセス**: 変化なし（11秒）
- **2回目以降のアクセス**: **11秒 → 0秒**（即座に表示）
- **ユーザー体験**: 大幅改善

#### 実装の根拠

- 投稿のEXIF情報は不変
- 同じ投稿の類似作例を何度もAPI検索する必要がない
- ブラウザキャッシュを活用すれば即座に表示可能

#### 実装方法

**選択肢1: SWR（推奨）**

```typescript
// components/post-detail/post-detail-modal.tsx
import useSWR from "swr";

const { data: similarPosts, isLoading } = useSWR(
  `/api/posts/${postId}/similar`,
  fetcher,
  {
    revalidateOnFocus: false, // フォーカス時に再検証しない
    revalidateOnReconnect: false, // 再接続時に再検証しない
    dedupingInterval: 60000, // 60秒間は重複リクエストを防ぐ
    revalidateIfStale: false, // staleでも再検証しない
  }
);
```

**選択肢2: React Query**

```typescript
import { useQuery } from "@tanstack/react-query";

const { data: similarPosts, isLoading } = useQuery({
  queryKey: ["similarPosts", postId],
  queryFn: () => fetchSimilarPosts(postId),
  staleTime: Infinity, // データを常にfreshとして扱う
  cacheTime: 1000 * 60 * 60, // 1時間キャッシュ
});
```

#### 必要な作業

1. `package.json`にSWRまたはReact Queryを追加
2. キャッシュプロバイダーの設定
3. 投稿詳細モーダルでキャッシュフックを使用
4. 投稿削除時のキャッシュ無効化処理を実装

#### 注意事項

- **キャッシュ無効化**: 投稿が削除された場合、関連する類似作例のキャッシュをクリアする必要がある
- **メモリ管理**: 長時間の使用でキャッシュが肥大化しないよう、適切な`cacheTime`を設定

#### 効果測定方法

- DevToolsのNetworkタブで、2回目以降のアクセス時にAPIリクエストが発生しないことを確認
- パフォーマンスログで処理時間を測定（0ms〜数ms程度になるはず）

---

### 改善案2: チャンキング設定の最適化 ⭐⭐⭐

**推奨度**: 高（API側の根本的な改善）

#### 期待効果

- **APIレイテンシ**: **11秒 → 3〜5秒**（推測）
- **初回アクセス**: 60〜70%の短縮
- **全体的な高速化**: すべてのユーザーが恩恵を受ける

#### 実装の根拠

- 公式ドキュメントでチャンキング設定による最適化が推奨されている
- 現在、JSONメタデータが大きなチャンクとして保存されている可能性
- 小さなチャンクに分割することで検索速度が向上

#### 実装方法

**ファイル**: `lib/gemini/file-search-upload.ts`

```typescript
// 4. File Search Storeにアップロード
let operation = await ai.fileSearchStores.uploadToFileSearchStore({
  file: blob,
  fileSearchStoreName: storeId,
  config: {
    displayName: `photo_${postId}.json`,
    customMetadata: [
      { key: "post_id", stringValue: postId },
      { key: "content_type", stringValue: "photo_metadata" },
    ],
    // ✨ チャンキング設定を追加
    chunkingConfig: {
      whiteSpaceConfig: {
        maxTokensPerChunk: 100, // 小さなチャンクに分割（推奨: 100-200）
        maxOverlapTokens: 10, // 重複を最小限に（推奨: 10-20）
      },
    },
  },
});
```

#### パラメータの推奨値

- **`maxTokensPerChunk`**: 100〜200トークン
  - 小さすぎる（<50）: オーバーヘッドが増加
  - 大きすぎる（>500）: 検索精度が低下
  - JSONメタデータの場合、100〜200が最適

- **`maxOverlapTokens`**: 10〜20トークン
  - 文脈を保持しつつ、重複を最小化

#### 必要な作業

1. `lib/gemini/file-search-upload.ts`にチャンキング設定を追加
2. **既存のドキュメントを再アップロード**（重要！）
   - 既存の投稿すべてをFile Search Storeから削除
   - 新しいチャンキング設定で再アップロード
3. パフォーマンス測定（実装前後の比較）

#### 注意事項

- **既存データの再処理が必須**: チャンキング設定は新規アップロード時のみ適用されるため、既存のドキュメントは再アップロードが必要
- **ダウンタイム**: 再アップロード中は類似作例が表示されない可能性がある
- **コスト**: 再アップロード時にGemini APIの料金が発生（初回インデックス料金: $0.15/百万トークン）

#### 効果測定方法

- 実装前後でログの`searchSimilarPostsWithFileSearch`の処理時間を比較
- 目標: 10,941ms → 3,000〜5,000ms程度

---

### 改善案3: 検索クエリの簡素化 ⭐⭐

**推奨度**: 中（微調整レベル）

#### 期待効果

- **APIレイテンシ**: **10〜20%短縮**（1〜2秒程度）
- **副次効果**: 検索精度の向上（ノイズ削減）

#### 実装の根拠

- 現状のクエリに日本語の説明文が含まれている（「撮影設定:」「カメラ:」など）
- ベクトル検索には不要なノイズとなる可能性
- よりシンプルなクエリの方が検索効率が良い

#### 現状のクエリ例

```
撮影設定: ISO100 f/2.8 1/500s 50mm カメラ: Canon EOS R5 レンズ: RF50mm F1.8 STM
```

#### 改善後のクエリ例

```
ISO100 f2.8 1/500 50mm Canon EOS R5 RF50mm
```

#### 実装方法

**ファイル**: `app/actions/posts.ts`

```typescript
/**
 * 投稿から類似検索用のクエリを構築（簡素化版）
 */
function buildSimilarityQuery(post: Post): string {
  const parts: string[] = [];

  // 説明文（キャプション）を追加
  if (post.description) {
    parts.push(post.description);
  }

  // Exif情報から撮影設定を追加（シンプルな値のみ）
  if (post.exifData) {
    const exif = post.exifData;

    // 数値のみ、説明文なし
    if (exif.iso) parts.push(`ISO${exif.iso}`);
    if (exif.fValue) parts.push(`f${exif.fValue}`);
    if (exif.shutterSpeed) parts.push(exif.shutterSpeed);
    if (exif.focalLength) parts.push(`${exif.focalLength}mm`);

    // カメラとレンズ（モデル名のみ）
    if (exif.cameraModel) parts.push(exif.cameraModel);
    if (exif.lens) parts.push(exif.lens);
  }

  // クエリが空の場合はデフォルトのクエリを使用
  if (parts.length === 0) {
    return "類似した写真を探してください";
  }

  return parts.join(" ");
}
```

#### 必要な作業

1. `buildSimilarityQuery`関数を修正
2. パフォーマンス測定（実装前後の比較）
3. 検索精度の確認（想定通りの類似作例が表示されるか）

#### 注意事項

- **検索精度への影響**: 説明文を削除することで、検索精度が変わる可能性がある
- **A/Bテスト推奨**: 実装前後で検索結果の品質を比較することを推奨

#### 効果測定方法

- ログの`searchSimilarPostsWithFileSearch`の処理時間を比較
- 目標: 10,941ms → 9,000〜10,000ms程度（微減）
- 検索結果の品質も同時に評価

---

### 改善案4: メタデータフィルタリングの活用 ⭐

**推奨度**: 低〜中（条件次第で効果あり）

#### 期待効果

- **APIレイテンシ**: **5〜10%短縮**（500ms〜1秒程度）
- **条件**: File Search Store内に複数のコンテンツタイプが混在している場合のみ有効

#### 実装の根拠

- 公式ドキュメントでメタデータフィルタによる検索範囲の絞り込みが推奨されている
- 検索対象を絞ることでベクトル検索の処理が高速化
- 現状、`content_type=photo_metadata`のみを検索すれば良い

#### 実装方法

**ファイル**: `lib/gemini/file-search-query.ts`

```typescript
/**
 * 類似作例検索専用の軽量関数
 */
export async function searchSimilarPostsWithFileSearch(
  query: string
): Promise<SimilarPostsResult> {
  // ... 省略 ...

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user" as const,
        parts: [{ text: query }],
      },
    ],
    config: {
      tools: [
        {
          fileSearch: {
            fileSearchStoreNames: [storeId],
            // ✨ メタデータフィルタを追加
            metadataFilter: "content_type=photo_metadata",
          },
        },
      ],
    } as any,
  });

  // ... 省略 ...
}
```

#### 必要な作業

1. `lib/gemini/file-search-query.ts`に`metadataFilter`を追加
2. パフォーマンス測定（実装前後の比較）

#### 注意事項

- **現状の効果は限定的**: 現在、File Search Storeには`photo_metadata`のみが保存されているため、フィルタの効果は小さい
- **将来性**: 将来的に他のコンテンツタイプ（例: ユーザープロフィール、コメントなど）を追加する場合に有効

#### 効果測定方法

- ログの`searchSimilarPostsWithFileSearch`の処理時間を比較
- 目標: 10,941ms → 10,000〜10,500ms程度（微減）

---

## 📈 推奨実装順序

### フェーズ1: 即効性重視（クイックウィン）

1. **改善案1: クライアントサイドキャッシング**
   - 期間: 1〜2時間
   - 効果: 2回目以降が即座に表示
   - リスク: 低

### フェーズ2: 根本的改善（API側の最適化）

2. **改善案2: チャンキング設定の最適化**
   - 期間: 2〜3時間（既存データ再アップロード含む）
   - 効果: 初回アクセスが3〜5秒に短縮
   - リスク: 中（既存データの再処理が必要）

### フェーズ3: 微調整（さらなる最適化）

3. **改善案3: 検索クエリの簡素化**
   - 期間: 30分〜1時間
   - 効果: 1〜2秒の短縮
   - リスク: 低（検索精度への影響を確認）

4. **改善案4: メタデータフィルタリングの活用**
   - 期間: 15分〜30分
   - 効果: 0.5〜1秒の短縮
   - リスク: 低

---

## 🎯 最終的な期待効果

### 実装前

- **初回アクセス**: 11秒
- **2回目以降**: 11秒

### 改善案1のみ実装後

- **初回アクセス**: 11秒
- **2回目以降**: **即座に表示（0秒）**

### すべて実装後

- **初回アクセス**: **3〜5秒**（60〜70%短縮）
- **2回目以降**: **即座に表示（0秒）**

---

## ⚠️ 全体的な注意事項

### チャンキング設定変更時の対応

- 既存のドキュメントは新しい設定で再アップロードが必要
- 再アップロード中は類似作例が表示されない可能性がある
- スクリプトを作成して一括再アップロードを推奨

### File Search Storeのサイズ監視

- 公式推奨: **20GB以下**を維持
- 定期的にストレージサイズを確認
- 必要に応じて古いドキュメントを削除

### キャッシュ戦略

- 投稿削除時のキャッシュ無効化処理を忘れずに実装
- メモリ使用量を監視
- 適切な`cacheTime`/`staleTime`を設定

### パフォーマンス測定

- 各改善案の実装前後で必ず測定
- ログに処理時間を出力
- 複数回測定して平均値を取る

---

## 📝 参考リンク

- [Gemini API File Search公式ドキュメント](https://ai.google.dev/gemini-api/docs/file-search)
- [File Search Tool発表ブログ](https://blog.google/technology/developers/file-search-gemini-api/)
- [SWR公式ドキュメント](https://swr.vercel.app/)
- [React Query公式ドキュメント](https://tanstack.com/query/latest)
