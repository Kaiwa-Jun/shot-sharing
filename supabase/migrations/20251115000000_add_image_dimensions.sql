-- Add width and height columns to posts table
ALTER TABLE posts
ADD COLUMN width INTEGER,
ADD COLUMN height INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN posts.width IS '画像の幅（ピクセル）';
COMMENT ON COLUMN posts.height IS '画像の高さ（ピクセル）';

-- Create index for performance (optional, but useful for queries that filter by dimensions)
CREATE INDEX idx_posts_dimensions ON posts(width, height) WHERE width IS NOT NULL AND height IS NOT NULL;
