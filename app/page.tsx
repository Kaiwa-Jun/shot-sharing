import { unstable_cache } from "next/cache";
import { PhotoCardProps } from "@/components/gallery/photo-card";
import { PageClient } from "./page-client";
import { createClient, createCacheableClient } from "@/lib/supabase/server";
import { WebSiteJsonLd } from "@/components/seo/json-ld";
import { ExifData } from "@/lib/types/exif";
import { Post } from "@/app/actions/posts";

// キャッシュされた投稿一覧取得関数（30秒間キャッシュ）
// cookies()を使わないクライアントでキャッシュ可能
const getCachedPosts = unstable_cache(
  async (): Promise<{ data: Post[] | null; error: string | null }> => {
    console.log(
      "📡 [CACHE] getPosts実行（キャッシュミス）:",
      new Date().toISOString()
    );
    try {
      const supabase = createCacheableClient();

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .range(0, 19);

      if (error) {
        console.error("Error fetching posts:", error);
        return { data: null, error: error.message };
      }

      // データベースの型からフロントエンド用の型に変換
      const posts: Post[] = (data || []).map((post) => {
        let exifData: ExifData | null = null;
        if (post.exif_data) {
          const dbExif = post.exif_data as Record<string, unknown>;
          exifData = {
            iso: (dbExif.iso as number) ?? null,
            fValue:
              (dbExif.f_value as number) ?? (dbExif.fValue as number) ?? null,
            shutterSpeed:
              (dbExif.shutter_speed as string) ??
              (dbExif.shutterSpeed as string) ??
              null,
            exposureCompensation:
              (dbExif.exposure_compensation as number) ??
              (dbExif.exposureCompensation as number) ??
              null,
            focalLength:
              (dbExif.focal_length as number) ??
              (dbExif.focalLength as number) ??
              null,
            whiteBalance:
              (dbExif.white_balance as string) ??
              (dbExif.whiteBalance as string) ??
              null,
            cameraMake:
              (dbExif.camera_make as string) ??
              (dbExif.cameraMake as string) ??
              null,
            cameraModel:
              (dbExif.camera_model as string) ??
              (dbExif.cameraModel as string) ??
              null,
            lens: (dbExif.lens as string) ?? null,
            dateTime:
              (dbExif.date_time as string) ??
              (dbExif.dateTime as string) ??
              null,
            width: (dbExif.width as number) ?? null,
            height: (dbExif.height as number) ?? null,
          };
        }

        return {
          id: post.id,
          userId: post.user_id,
          imageUrl: post.image_url,
          thumbnailUrl: post.thumbnail_url,
          description: post.description,
          exifData: exifData,
          fileSearchStoreId: post.file_search_store_id,
          visibility: post.visibility,
          width: post.width,
          height: post.height,
          createdAt: post.created_at,
          updatedAt: post.updated_at,
        };
      });

      return { data: posts, error: null };
    } catch (err) {
      console.error("Unexpected error fetching posts:", err);
      return { data: null, error: "予期しないエラーが発生しました" };
    }
  },
  ["posts-list-home"],
  { revalidate: 30, tags: ["posts"] }
);

export default async function Home() {
  // サーバー側で認証状態を取得（キャッシュしない）
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // キャッシュから投稿データを取得（30秒間キャッシュ）
  const { data: posts, error } = await getCachedPosts();

  // エラーハンドリング
  if (error) {
    console.error("Failed to fetch posts:", error);
  }

  // Postデータ型をPhotoCardProps型に変換
  const photos: PhotoCardProps[] =
    posts?.map((post) => ({
      id: post.id,
      imageUrl: post.imageUrl,
      userId: post.userId,
      exifData: post.exifData || undefined,
    })) || [];

  return (
    <>
      <WebSiteJsonLd />
      <PageClient key="home" initialPhotos={photos} initialUser={user} />
    </>
  );
}
