import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { siteConfig } from "@/lib/constants/site";

// sitemap用のanonymous client（cookiesを使用しない）
function createAnonClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "Supabase環境変数が設定されていません。動的なsitemapは生成されません。"
    );
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url;

  // 静的ページ
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // 動的ページ（投稿詳細）
  try {
    const supabase = createAnonClient();

    // Supabaseクライアントが作成できない場合は静的ページのみ返す
    if (!supabase) {
      return staticPages;
    }

    const { data: posts } = await supabase
      .from("posts")
      .select("id, updated_at")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(1000);

    const postPages: MetadataRoute.Sitemap =
      posts?.map((post) => ({
        url: `${baseUrl}/posts/${post.id}`,
        lastModified: post.updated_at ? new Date(post.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })) || [];

    return [...staticPages, ...postPages];
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return staticPages;
  }
}
