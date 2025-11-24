-- Update RPC function to use higher similarity threshold (0.7 instead of 0.5)
CREATE OR REPLACE FUNCTION search_similar_posts(
  query_embedding vector(768),
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
