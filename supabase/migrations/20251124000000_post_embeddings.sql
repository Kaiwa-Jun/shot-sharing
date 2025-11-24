-- Enable pgvector extension
create extension if not exists vector;

-- Create post_embeddings table
create table if not exists public.post_embeddings (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  embedding vector(768) not null, -- Gemini Embedding API returns 768-dimensional vectors
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  -- Unique constraint to ensure one embedding per post
  constraint unique_post_embedding unique (post_id)
);

-- Create index for vector similarity search
create index if not exists post_embeddings_embedding_idx
  on public.post_embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Create index for post_id lookup
create index if not exists post_embeddings_post_id_idx
  on public.post_embeddings(post_id);

-- Enable RLS
alter table public.post_embeddings enable row level security;

-- RLS policies
create policy "Post embeddings are viewable by everyone"
  on public.post_embeddings
  for select
  using (true);

create policy "Post embeddings are insertable by authenticated users"
  on public.post_embeddings
  for insert
  with check (auth.uid() is not null);

create policy "Post embeddings are updatable by post owner"
  on public.post_embeddings
  for update
  using (
    exists (
      select 1 from public.posts
      where posts.id = post_embeddings.post_id
      and posts.user_id = auth.uid()
    )
  );

create policy "Post embeddings are deletable by post owner"
  on public.post_embeddings
  for delete
  using (
    exists (
      select 1 from public.posts
      where posts.id = post_embeddings.post_id
      and posts.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
create or replace function public.update_post_embeddings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to update updated_at
create trigger update_post_embeddings_updated_at
  before update on public.post_embeddings
  for each row
  execute function public.update_post_embeddings_updated_at();
