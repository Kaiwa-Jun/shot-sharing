-- Update similarity threshold from 0.7 to 0.85 for better precision
-- This prevents unrelated images (like jellyfish vs hydrangea at 81%) from being shown as similar
CREATE OR REPLACE FUNCTION search_similar_posts(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.85,
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
