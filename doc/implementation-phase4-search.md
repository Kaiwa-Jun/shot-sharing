# Phase 4: 検索機能実装

## 📋 概要

Gemini File Search APIを使用したマルチモーダル検索機能（テキスト検索・画像検索）と検索結果画面を実装します。

**所要時間**: 4-5時間

## 🎯 目的

- テキストベースの自然言語検索機能の実装
- 画像ベースの類似画像検索機能の実装
- チャット形式の検索結果UI実装
- 検索結果のギャラリー表示

## 前提条件

- Phase 1, 2, 3 が完了していること
- File Search Storeに投稿データが登録されていること

---

## 📁 ファイル構成

```
lib/gemini/
├── file-search.ts              # File Search基盤（Phase 1で作成済み）
├── file-search-upload.ts       # アップロード（Phase 3で作成済み）
└── file-search-query.ts        # 検索機能（新規作成）

app/search/
└── page.tsx                    # 検索結果画面（新規作成）

components/search/
├── search-input.tsx            # 検索入力コンポーネント（新規作成）
├── search-results.tsx          # 検索結果ギャラリー（新規作成）
├── chat-panel.tsx              # チャットパネル（新規作成）
└── query-suggestions.tsx       # 質問例バッジ（新規作成）

app/actions/
└── search.ts                   # 検索Server Actions（新規作成）

types/
└── search.ts                   # 検索関連型定義（新規作成）
```

---

## 🔧 実装タスク

### ✅ Task 4-1: 検索関連の型定義

**ファイル**: `lib/types/search.ts`

```typescript
/**
 * 検索クエリの種類
 */
export type SearchMode = "text" | "image" | "hybrid";

/**
 * 検索クエリ
 */
export interface SearchQuery {
  mode: SearchMode;
  text?: string; // テキスト検索用
  imageFile?: File; // 画像検索用
  conversationId?: string; // チャット継続用
}

/**
 * 検索結果（投稿情報）
 */
export interface SearchResultPost {
  id: string;
  image_url: string;
  thumbnail_url: string;
  description: string;
  exif_data: {
    iso?: number;
    f_value?: number;
    shutter_speed?: string;
    exposure_compensation?: number;
  };
  user_id: string;
  created_at: string;
}

/**
 * AI応答
 */
export interface AIResponse {
  text: string;
  conversationId?: string;
}

/**
 * 検索結果
 */
export interface SearchResult {
  posts: SearchResultPost[];
  aiResponse: AIResponse;
  query: string;
  mode: SearchMode;
}
```

---

### ✅ Task 4-2: File Search クエリ処理の実装

**ファイル**: `lib/gemini/file-search-query.ts`

```typescript
import { GoogleGenAI } from "@google/genai";
import { getFileSearchStoreId } from "./file-search";

/**
 * テキスト検索を実行
 * @param query 検索クエリ
 * @param conversationId 会話ID（継続時）
 * @returns AI応答
 */
export async function searchByText(
  query: string,
  conversationId?: string
): Promise<{ text: string; conversationId?: string }> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const storeId = getFileSearchStoreId();

  try {
    const systemInstruction = `あなたは一眼レフカメラの撮影設定に詳しい専門家です。
ユーザーの質問に対して、File Search Storeに保存されている作例を参考にしながら、
具体的な撮影設定（ISO、F値、シャッタースピード、露出補正など）を提案してください。

回答は以下の形式で提供してください：
1. 推奨設定（具体的な数値）
2. 設定の理由
3. 撮影のコツ

参考にした作例の撮影設定も含めて説明してください。`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: query,
      config: {
        systemInstruction,
        tools: [
          {
            fileSearch: {
              fileSearchStoreNames: [storeId],
            },
          },
        ],
      },
    });

    return {
      text: response.text,
      conversationId: conversationId || crypto.randomUUID(),
    };
  } catch (error) {
    console.error("テキスト検索に失敗しました:", error);
    throw new Error(
      `検索に失敗しました: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * 画像検索を実行
 * @param imageBuffer 画像のBuffer
 * @param query 追加のテキストクエリ（任意）
 * @returns AI応答
 */
export async function searchByImage(
  imageBuffer: Buffer,
  query?: string
): Promise<{ text: string }> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const storeId = getFileSearchStoreId();

  try {
    const systemInstruction = `あなたは一眼レフカメラの撮影設定に詳しい専門家です。
ユーザーが提供した画像と類似した撮影設定の作例を、File Search Storeから検索してください。

回答には以下を含めてください：
1. 類似した作例の撮影設定
2. この撮影シーンに適した設定の説明
3. 撮影のコツ`;

    // 画像をBase64エンコード
    const base64Image = imageBuffer.toString("base64");

    const promptText =
      query || "この画像と類似した撮影設定の作例を探してください";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image,
              },
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        tools: [
          {
            fileSearch: {
              fileSearchStoreNames: [storeId],
            },
          },
        ],
      },
    });

    return {
      text: response.text,
    };
  } catch (error) {
    console.error("画像検索に失敗しました:", error);
    throw new Error(
      `画像検索に失敗しました: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * メタデータフィルターを使用した検索
 * @param query 検索クエリ
 * @param filters メタデータフィルター（例: 'iso>=800'）
 * @returns AI応答
 */
export async function searchWithFilters(
  query: string,
  filters: string
): Promise<{ text: string }> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const storeId = getFileSearchStoreId();

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: query,
      config: {
        tools: [
          {
            fileSearch: {
              fileSearchStoreNames: [storeId],
              metadataFilter: filters,
            },
          },
        ],
      },
    });

    return {
      text: response.text,
    };
  } catch (error) {
    console.error("フィルター検索に失敗しました:", error);
    throw new Error(
      `検索に失敗しました: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
```

---

### ✅ Task 4-3: 検索Server Actionsの実装

**ファイル**: `app/actions/search.ts`

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { searchByText, searchByImage } from "@/lib/gemini/file-search-query";
import type { SearchResult, SearchMode } from "@/lib/types/search";

/**
 * テキスト検索Server Action
 * @param query 検索クエリ
 * @param conversationId 会話ID（任意）
 * @returns 検索結果
 */
export async function performTextSearch(
  query: string,
  conversationId?: string
): Promise<SearchResult> {
  try {
    console.log("🔍 テキスト検索を実行中:", query);

    // Gemini File Searchで検索
    const aiResponse = await searchByText(query, conversationId);

    // 最新の投稿を取得（AIの回答に加えてギャラリー表示用）
    const supabase = await createClient();
    const { data: posts, error } = await supabase
      .from("posts")
      .select("*")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("投稿取得エラー:", error);
    }

    return {
      posts: posts || [],
      aiResponse: {
        text: aiResponse.text,
        conversationId: aiResponse.conversationId,
      },
      query,
      mode: "text",
    };
  } catch (error) {
    console.error("テキスト検索エラー:", error);
    throw error;
  }
}

/**
 * 画像検索Server Action
 * @param formData フォームデータ（画像ファイル含む）
 * @returns 検索結果
 */
export async function performImageSearch(
  formData: FormData
): Promise<SearchResult> {
  try {
    const imageFile = formData.get("image") as File;
    const queryText = (formData.get("query") as string) || "";

    if (!imageFile) {
      throw new Error("画像ファイルが選択されていません");
    }

    console.log("🔍 画像検索を実行中...");

    // 画像をBufferに変換
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

    // Gemini File Searchで検索
    const aiResponse = await searchByImage(imageBuffer, queryText);

    // 最新の投稿を取得
    const supabase = await createClient();
    const { data: posts, error } = await supabase
      .from("posts")
      .select("*")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("投稿取得エラー:", error);
    }

    return {
      posts: posts || [],
      aiResponse: {
        text: aiResponse.text,
      },
      query: queryText || "画像検索",
      mode: "image",
    };
  } catch (error) {
    console.error("画像検索エラー:", error);
    throw error;
  }
}
```

---

### ✅ Task 4-4: 質問例バッジコンポーネントの実装

**ファイル**: `components/search/query-suggestions.tsx`

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const QUERY_SUGGESTIONS = [
  { icon: "🌅", text: "夕焼けを綺麗に撮るには?" },
  { icon: "🌙", text: "夜景で手ブレしない設定" },
  { icon: "👥", text: "室内でポートレート" },
  { icon: "🏃", text: "動く子供を撮影する設定" },
  { icon: "🌸", text: "花のマクロ撮影" },
  { icon: "⛅", text: "曇りの日の風景" },
] as const;

interface QuerySuggestionsProps {
  onSelect: (query: string) => void;
}

export function QuerySuggestions({ onSelect }: QuerySuggestionsProps) {
  return (
    <ScrollArea className="w-full">
      <div className="flex gap-2 pb-2">
        {QUERY_SUGGESTIONS.map((suggestion, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onSelect(suggestion.text)}
            className="whitespace-nowrap"
          >
            <span className="mr-1">{suggestion.icon}</span>
            {suggestion.text}
          </Button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
```

---

### ✅ Task 4-5: チャットパネルコンポーネントの実装

**ファイル**: `components/search/chat-panel.tsx`

```typescript
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
}

export function ChatPanel({ isOpen, onClose, messages }: ChatPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50"
          style={{ height: "70vh" }}
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">チャット履歴</h3>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* メッセージ一覧 */}
          <ScrollArea className="h-full p-4">
            <div className="space-y-4 pb-20">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

### ✅ Task 4-6: 検索入力コンポーネントの実装

**ファイル**: `components/search/search-input.tsx`

```typescript
"use client";

import { useState, useRef } from "react";
import { Search, Image as ImageIcon, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchInputProps {
  onTextSearch: (query: string) => void;
  onImageSearch: (file: File) => void;
  isLoading?: boolean;
}

export function SearchInput({
  onTextSearch,
  onImageSearch,
  isLoading,
}: SearchInputProps) {
  const [query, setQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onTextSearch(query);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && !isLoading) {
      onImageSearch(file);
      // リセット
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="撮影設定を質問..."
          className="pl-10 pr-12"
          disabled={isLoading}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 transform -translate-y-1/2"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          <ImageIcon className="h-5 w-5" />
        </Button>
      </div>

      <Button type="submit" disabled={!query.trim() || isLoading}>
        <Send className="h-5 w-5" />
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />
    </form>
  );
}
```

---

### ✅ Task 4-7: 検索結果画面の実装

**ファイル**: `app/search/page.tsx`

```typescript
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchInput } from "@/components/search/search-input";
import { QuerySuggestions } from "@/components/search/query-suggestions";
import { ChatPanel } from "@/components/search/chat-panel";
import { performTextSearch, performImageSearch } from "@/app/actions/search";
import type { SearchResult } from "@/lib/types/search";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);

  const handleTextSearch = async (query: string) => {
    setIsLoading(true);
    try {
      const result = await performTextSearch(query);
      setSearchResult(result);
      setMessages([
        ...messages,
        { role: "user", content: query },
        { role: "assistant", content: result.aiResponse.text },
      ]);
    } catch (error) {
      console.error("検索エラー:", error);
      alert("検索に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSearch = async (file: File) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const result = await performImageSearch(formData);
      setSearchResult(result);
      setMessages([
        ...messages,
        { role: "user", content: "画像検索" },
        { role: "assistant", content: result.aiResponse.text },
      ]);
    } catch (error) {
      console.error("画像検索エラー:", error);
      alert("画像検索に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <SearchInput
            onTextSearch={handleTextSearch}
            onImageSearch={handleImageSearch}
            isLoading={isLoading}
          />
          <div className="mt-2">
            <QuerySuggestions onSelect={handleTextSearch} />
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-600">検索中...</p>
          </div>
        )}

        {searchResult && !isLoading && (
          <div>
            {/* AI応答 */}
            <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
              <h3 className="font-semibold mb-2">回答</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {searchResult.aiResponse.text}
              </p>
              <button
                onClick={() => setIsChatOpen(true)}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                チャット履歴を表示
              </button>
            </div>

            {/* 検索結果ギャラリー */}
            <h3 className="font-semibold mb-4">参考作例</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {searchResult.posts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white rounded-lg overflow-hidden shadow-sm"
                >
                  <img
                    src={post.thumbnail_url}
                    alt={post.description}
                    className="w-full aspect-square object-cover"
                  />
                  <div className="p-2">
                    <p className="text-xs text-gray-600">
                      {post.exif_data.iso && `ISO${post.exif_data.iso}`}
                      {post.exif_data.f_value && ` • f/${post.exif_data.f_value}`}
                      {post.exif_data.shutter_speed &&
                        ` • ${post.exif_data.shutter_speed}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* チャットパネル */}
      <ChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={messages}
      />
    </div>
  );
}
```

---

## 🧪 動作確認手順

### 1. 投稿データの準備

```
Phase 3で投稿機能を使って、少なくとも5-10件の投稿を作成
```

### 2. 検索画面へのアクセス

```
http://localhost:3000/search
```

### 3. テキスト検索テスト

```
1. 質問例バッジをクリック、または検索欄に質問を入力
   例: "夕焼けを綺麗に撮るには?"
2. 送信ボタンをクリック
3. AI応答が表示されることを確認
4. 参考作例ギャラリーが表示されることを確認
```

### 4. 画像検索テスト

```
1. 検索欄の画像アイコンをクリック
2. 画像ファイルを選択
3. AI応答と類似作例が表示されることを確認
```

### 5. チャット履歴テスト

```
1. 複数回検索を実行
2. 「チャット履歴を表示」をクリック
3. チャットパネルがスライドアップすることを確認
4. 過去の質問と回答が表示されることを確認
```

---

## ✅ 完了条件

以下がすべて満たされたらPhase 4完了：

- [ ] テキスト検索が正常に動作する
- [ ] 画像検索が正常に動作する
- [ ] AI応答が適切に表示される
- [ ] 検索結果ギャラリーが表示される
- [ ] チャット履歴機能が動作する
- [ ] 質問例バッジから検索できる
- [ ] レスポンシブデザインが適切に動作する

---

## 🚨 トラブルシューティング

### エラー: "File Search Store が見つかりません"

**原因**: Store IDが正しく設定されていない

**解決方法**:

```bash
# .env.local の GEMINI_FILE_SEARCH_STORE_ID を確認
```

### エラー: 検索結果が空

**原因**: File Search Storeに投稿データが登録されていない

**解決方法**:

1. Phase 3で投稿を作成
2. File Search Storeにデータが登録されていることを確認

### エラー: AI応答が表示されない

**原因**: Gemini APIのレート制限、またはネットワークエラー

**解決方法**:

1. APIキーの使用状況を確認
2. 少し待ってから再試行

---

## 📚 参考リンク

- [Gemini File Search API](https://ai.google.dev/gemini-api/docs/file-search)
- [Framer Motion](https://www.framer.com/motion/)

---

## 🎉 全フェーズ完了！

Phase 4が完了したら、投稿機能の実装は完了です！

次のステップ:

1. 各機能の統合テスト
2. UI/UXの改善
3. パフォーマンス最適化
4. エラーハンドリングの強化
