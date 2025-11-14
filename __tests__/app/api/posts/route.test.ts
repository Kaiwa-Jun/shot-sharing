import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/posts/route";
import { getPosts } from "@/app/actions/posts";
import { NextRequest } from "next/server";

// getPosts関数をモック化
vi.mock("@/app/actions/posts", () => ({
  getPosts: vi.fn(),
}));

describe("POST /api/posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("正常系", () => {
    it("正しいリクエストで投稿データを返す", async () => {
      const mockPosts = [
        {
          id: "1",
          userId: "user1",
          imageUrl: "https://example.com/image1.jpg",
          thumbnailUrl: "https://example.com/thumb1.jpg",
          description: "Test post 1",
          exifData: null,
          fileSearchStoreId: null,
          visibility: "public",
          width: null,
          height: null,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      vi.mocked(getPosts).mockResolvedValueOnce({
        data: mockPosts,
        error: null,
      });

      const request = new NextRequest("http://localhost:3000/api/posts", {
        method: "POST",
        body: JSON.stringify({ limit: 20, offset: 0 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ data: mockPosts, error: null });
      expect(getPosts).toHaveBeenCalledWith(20, 0);
    });

    it("デフォルト値（limit=20, offset=0）で動作する", async () => {
      vi.mocked(getPosts).mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const request = new NextRequest("http://localhost:3000/api/posts", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(getPosts).toHaveBeenCalledWith(20, 0);
    });

    it("カスタムのlimitとoffsetが正しく渡される", async () => {
      vi.mocked(getPosts).mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const request = new NextRequest("http://localhost:3000/api/posts", {
        method: "POST",
        body: JSON.stringify({ limit: 50, offset: 100 }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(getPosts).toHaveBeenCalledWith(50, 100);
    });
  });

  describe("バリデーション", () => {
    it("limitが0以下の場合、400エラーを返す", async () => {
      const request = new NextRequest("http://localhost:3000/api/posts", {
        method: "POST",
        body: JSON.stringify({ limit: 0, offset: 0 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("limit は 1 から 100 の間");
    });

    it("limitが100を超える場合、400エラーを返す", async () => {
      const request = new NextRequest("http://localhost:3000/api/posts", {
        method: "POST",
        body: JSON.stringify({ limit: 101, offset: 0 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("limit は 1 から 100 の間");
    });

    it("offsetが負の値の場合、400エラーを返す", async () => {
      const request = new NextRequest("http://localhost:3000/api/posts", {
        method: "POST",
        body: JSON.stringify({ limit: 20, offset: -1 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("offset は 0 以上");
    });

    it("limitが数値でない場合、400エラーを返す", async () => {
      const request = new NextRequest("http://localhost:3000/api/posts", {
        method: "POST",
        body: JSON.stringify({ limit: "invalid", offset: 0 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("limit は 1 から 100 の間");
    });

    it("offsetが数値でない場合、400エラーを返す", async () => {
      const request = new NextRequest("http://localhost:3000/api/posts", {
        method: "POST",
        body: JSON.stringify({ limit: 20, offset: "invalid" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("offset は 0 以上");
    });
  });

  describe("エラーハンドリング", () => {
    it("getPostsがエラーを返す場合、500エラーを返す", async () => {
      vi.mocked(getPosts).mockResolvedValueOnce({
        data: null,
        error: "Database error",
      });

      const request = new NextRequest("http://localhost:3000/api/posts", {
        method: "POST",
        body: JSON.stringify({ limit: 20, offset: 0 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Database error");
    });

    it("予期しないエラーが発生した場合、500エラーを返す", async () => {
      vi.mocked(getPosts).mockRejectedValueOnce(new Error("Unexpected error"));

      const request = new NextRequest("http://localhost:3000/api/posts", {
        method: "POST",
        body: JSON.stringify({ limit: 20, offset: 0 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("予期しないエラーが発生しました");
    });
  });
});
