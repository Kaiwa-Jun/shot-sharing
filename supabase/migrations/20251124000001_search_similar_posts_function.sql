-- RPC function for searching similar posts using pgvector
create or replace function search_similar_posts(
  query_embedding vector(768),
  match_threshold float default 0.7,
  match_count int default 10
)
returns table (
  post_id uuid,
  similarity float
)
language sql stable
as $$
  select
    post_embeddings.post_id,
    1 - (post_embeddings.embedding <=> query_embedding) as similarity
  from post_embeddings
  where 1 - (post_embeddings.embedding <=> query_embedding) > match_threshold
  order by post_embeddings.embedding <=> query_embedding
  limit match_count;
$$;
