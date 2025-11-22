-- 類似作例のサーバーサイドキャッシュテーブル
CREATE TABLE IF NOT EXISTS similar_posts_cache (
  post_id UUID PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  similar_post_ids UUID[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックスを作成（検索を高速化）
CREATE INDEX IF NOT EXISTS idx_similar_posts_cache_created_at
  ON similar_posts_cache(created_at DESC);

-- RLSポリシー（全ユーザーが読み取り可能、システムのみ書き込み可能）
ALTER TABLE similar_posts_cache ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが読み取り可能
CREATE POLICY "Anyone can read similar posts cache"
  ON similar_posts_cache
  FOR SELECT
  USING (true);

-- 認証済みユーザーが書き込み可能（Server Actionから実行）
CREATE POLICY "Authenticated users can insert cache"
  ON similar_posts_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 認証済みユーザーが更新可能（Server Actionから実行）
CREATE POLICY "Authenticated users can update cache"
  ON similar_posts_cache
  FOR UPDATE
  TO authenticated
  USING (true);

-- 古いキャッシュを削除する関数（24時間以上前のキャッシュを削除）
CREATE OR REPLACE FUNCTION delete_old_similar_posts_cache()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM similar_posts_cache
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- コメントを追加
COMMENT ON TABLE similar_posts_cache IS '類似作例のサーバーサイドキャッシュ。24時間有効。';
COMMENT ON COLUMN similar_posts_cache.post_id IS '投稿ID';
COMMENT ON COLUMN similar_posts_cache.similar_post_ids IS '類似する投稿のIDリスト';
COMMENT ON COLUMN similar_posts_cache.created_at IS 'キャッシュ作成日時（24時間で無効化）';
