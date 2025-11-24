-- gemini-embedding-001モデル用に次元数を768から1536に変更
-- outputDimensionality=1536を使用（IVFFlatの2000次元制限に対応）

-- 1. 既存のインデックスを削除
DROP INDEX IF EXISTS post_embeddings_embedding_idx;

-- 2. 既存のEmbeddingデータを削除（次元数が異なるため）
TRUNCATE TABLE post_embeddings;

-- 3. embeddingカラムの型を変更
ALTER TABLE post_embeddings
  ALTER COLUMN embedding TYPE vector(1536);

-- 4. インデックスを再作成（IVFFlat、リスト数は投稿数の平方根を想定）
CREATE INDEX post_embeddings_embedding_idx
  ON post_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

-- 5. RPC関数も更新
CREATE OR REPLACE FUNCTION search_similar_posts(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  post_id uuid,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    post_embeddings.post_id,
    1 - (post_embeddings.embedding <=> query_embedding) AS similarity
  FROM post_embeddings
  WHERE 1 - (post_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY post_embeddings.embedding <=> query_embedding
  LIMIT match_count;
$$;
