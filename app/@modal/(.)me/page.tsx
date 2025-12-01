import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PhotoCardProps } from "@/components/gallery/photo-card";
import { ProfileModal } from "./profile-modal";

// プロフィール取得（キャッシュ付き）
const getCachedProfile = unstable_cache(
  async (userId: string) => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return data;
  },
  ["user-profile"],
  { revalidate: 60, tags: ["profile"] } // 60秒キャッシュ
);

// ユーザー投稿取得（キャッシュ付き）
const getCachedUserPosts = unstable_cache(
  async (userId: string, limit: number, offset: number) => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("posts")
      .select("id, user_id, image_url, thumbnail_url, exif_data")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching user posts:", error);
      return [];
    }

    return (
      data?.map((post) => ({
        id: post.id,
        imageUrl: post.image_url,
        userId: post.user_id,
        exifData: post.exif_data || undefined,
      })) || []
    );
  },
  ["user-posts"],
  { revalidate: 30, tags: ["posts"] } // 30秒キャッシュ
);

// ユーザー投稿数取得（キャッシュ付き）
const getCachedUserPostsCount = unstable_cache(
  async (userId: string) => {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) {
      console.error("Error counting user posts:", error);
      return 0;
    }
    return count || 0;
  },
  ["user-posts-count"],
  { revalidate: 30, tags: ["posts"] } // 30秒キャッシュ
);

// ユーザー保存数取得（キャッシュ付き）
const getCachedUserSavedCount = unstable_cache(
  async (userId: string) => {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("saves")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) {
      console.error("Error counting user saves:", error);
      return 0;
    }
    return count || 0;
  },
  ["user-saves-count"],
  { revalidate: 30, tags: ["saves"] } // 30秒キャッシュ
);

export default async function InterceptedProfilePage() {
  // サーバー側で認証状態を確認
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未認証の場合はログイン画面へリダイレクト
  if (!user) {
    redirect("/login");
  }

  // キャッシュを使用して並行取得（大幅に高速化）
  const [profile, userPhotos, postsCount, savedCount] = await Promise.all([
    getCachedProfile(user.id),
    getCachedUserPosts(user.id, 10, 0),
    getCachedUserPostsCount(user.id),
    getCachedUserSavedCount(user.id),
  ]);

  // 保存データは空配列（タブ切り替え時に遅延読み込み）
  const savedPhotos: PhotoCardProps[] = [];

  return (
    <ProfileModal
      profile={profile}
      initialUserPhotos={userPhotos}
      initialSavedPhotos={savedPhotos}
      postsCount={postsCount}
      savedCount={savedCount}
      userId={user.id}
    />
  );
}
