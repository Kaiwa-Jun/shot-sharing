-- Create storage bucket for post images
INSERT INTO storage.buckets (id, name, public)
VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for posts bucket
CREATE POLICY "Public posts images are viewable by everyone"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'posts');

CREATE POLICY "Users can upload images to posts bucket"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'posts' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update own images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'posts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'posts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
