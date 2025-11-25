"use server";

import { searchWithFileSearch } from "@/lib/gemini/file-search-query";
import { getPosts } from "./posts";
import { SearchResponse, ConversationMessage } from "@/lib/types/search";

/**
 * 検索を実行するServer Action
 * @param query 検索クエリ
 * @param conversationHistory 会話履歴（オプション）
 * @returns 検索結果とAI回答
 */
export async function searchPosts(
  query: string,
  conversationHistory?: ConversationMessage[]
): Promise<SearchResponse> {
  try {
    console.log("🔍 [DEBUG] searchPosts開始:", query);

    // File Search APIで検索実行
    const searchResult = await searchWithFileSearch(query, conversationHistory);

    let posts;

    if (searchResult.postIds && searchResult.postIds.length > 0) {
      // File Searchで取得したpost_idでフィルタリング
      console.log(
        "🔍 [DEBUG] File Searchで取得したPost ID:",
        searchResult.postIds
      );

      // 全投稿を取得してからフィルタリング
      const { data: allPosts } = await getPosts(100, 0); // より多くの投稿を取得

      if (!allPosts) {
        throw new Error("投稿の取得に失敗しました");
      }

      // post_idでフィルタリング
      posts = allPosts.filter((post) => searchResult.postIds.includes(post.id));

      console.log("✅ [DEBUG] フィルタリング結果:", {
        totalPosts: allPosts.length,
        filteredPosts: posts.length,
      });
    } else {
      // post_idが取得できなかった場合は全投稿を返す（フォールバック）
      console.log("⚠️ [DEBUG] Post IDが取得できなかったため、全投稿を返します");
      const { data: allPosts } = await getPosts(20, 0);

      if (!allPosts) {
        throw new Error("投稿の取得に失敗しました");
      }

      posts = allPosts;
    }

    console.log("✅ [DEBUG] searchPosts完了:", {
      postsCount: posts.length,
      aiResponse: searchResult.aiResponse.substring(0, 100) + "...",
    });

    return {
      posts,
      aiResponse: searchResult.aiResponse,
      conversationId: searchResult.conversationId,
    };
  } catch (error) {
    console.error("❌ searchPostsでエラーが発生しました:", error);
    throw error;
  }
}
