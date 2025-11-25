import { Post } from "@/app/actions/posts";
import { PhotoCardProps } from "@/components/gallery/photo-card";

/**
 * チャットメッセージの型
 */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  /** アシスタントメッセージに紐付く検索結果 */
  searchResults?: PhotoCardProps[];
  /** ストリーミング中かどうか */
  isStreaming?: boolean;
}

/**
 * 検索レスポンスの型
 */
export interface SearchResponse {
  posts: Post[];
  aiResponse: string;
  conversationId: string;
}

/**
 * 会話履歴の型（Gemini API用）
 */
export interface ConversationMessage {
  role: "user" | "model";
  parts: string;
}
