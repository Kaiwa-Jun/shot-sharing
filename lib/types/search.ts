import { Post } from "@/app/actions/posts";

/**
 * チャットメッセージの型
 */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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
