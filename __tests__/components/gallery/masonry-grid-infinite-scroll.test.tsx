import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MasonryGrid } from "@/components/gallery/masonry-grid";
import type { PhotoCardProps } from "@/components/gallery/photo-card";

// グローバルfetchをモック化
global.fetch = vi.fn();

describe("MasonryGrid 無限スクロール", () => {
  const initialPhotos: PhotoCardProps[] = [
    {
      id: "1",
      imageUrl: "https://example.com/image1.jpg",
      exifData: { iso: 100 },
    },
    {
      id: "2",
      imageUrl: "https://example.com/image2.jpg",
      exifData: { iso: 200 },
    },
  ];

  const additionalPhotos: PhotoCardProps[] = [
    {
      id: "3",
      imageUrl: "https://example.com/image3.jpg",
      exifData: { iso: 300 },
    },
    {
      id: "4",
      imageUrl: "https://example.com/image4.jpg",
      exifData: { iso: 400 },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // スクロール関連のプロパティをモック化
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 800,
    });
    Object.defineProperty(document.documentElement, "scrollTop", {
      writable: true,
      configurable: true,
      value: 0,
    });
    Object.defineProperty(document.documentElement, "offsetHeight", {
      writable: true,
      configurable: true,
      value: 2000,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("初期表示", () => {
    it("初期データが正しく表示される", () => {
      render(<MasonryGrid initialPhotos={initialPhotos} />);
      const images = screen.getAllByRole("img");
      expect(images).toHaveLength(2);
    });

    it("ローディングインジケーターが表示されない", () => {
      render(<MasonryGrid initialPhotos={initialPhotos} />);
      const loader = screen.queryByText(/loading/i);
      expect(loader).toBeNull();
    });
  });

  describe("スクロールによるデータロード", () => {
    it("スクロール時に追加データを取得する", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: additionalPhotos, error: null }),
      } as Response);

      render(<MasonryGrid initialPhotos={initialPhotos} />);

      // スクロールイベントをシミュレート
      Object.defineProperty(document.documentElement, "scrollTop", {
        writable: true,
        configurable: true,
        value: 1500,
      });
      fireEvent.scroll(window);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith("/api/posts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            limit: 20,
            offset: 2,
          }),
        });
      });
    });

    it("追加データがUIに反映される", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: additionalPhotos, error: null }),
      } as Response);

      render(<MasonryGrid initialPhotos={initialPhotos} />);

      // スクロールイベントをシミュレート
      Object.defineProperty(document.documentElement, "scrollTop", {
        writable: true,
        configurable: true,
        value: 1500,
      });
      fireEvent.scroll(window);

      await waitFor(() => {
        const images = screen.getAllByRole("img");
        expect(images).toHaveLength(4);
      });
    });
  });

  describe("エラーハンドリング", () => {
    it("APIエラー時にエラーメッセージが表示される", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ data: null, error: "API Error" }),
      } as Response);

      render(<MasonryGrid initialPhotos={initialPhotos} />);

      // スクロールイベントをシミュレート
      Object.defineProperty(document.documentElement, "scrollTop", {
        writable: true,
        configurable: true,
        value: 1500,
      });
      fireEvent.scroll(window);

      await waitFor(() => {
        const errorMessage = screen.getByText(/データの取得に失敗しました/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it("ネットワークエラー時にエラーメッセージが表示される", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

      render(<MasonryGrid initialPhotos={initialPhotos} />);

      // スクロールイベントをシミュレート
      Object.defineProperty(document.documentElement, "scrollTop", {
        writable: true,
        configurable: true,
        value: 1500,
      });
      fireEvent.scroll(window);

      await waitFor(() => {
        const errorMessage = screen.getByText(/Network error/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });
  });

  describe("データ終了時の動作", () => {
    it("データがない場合は「すべて表示済み」メッセージが表示される", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], error: null }),
      } as Response);

      render(<MasonryGrid initialPhotos={initialPhotos} />);

      // スクロールイベントをシミュレート
      Object.defineProperty(document.documentElement, "scrollTop", {
        writable: true,
        configurable: true,
        value: 1500,
      });
      fireEvent.scroll(window);

      await waitFor(() => {
        const endMessage = screen.getByText(/すべての画像を表示しました/i);
        expect(endMessage).toBeInTheDocument();
      });
    });

    it("データ終了後は追加リクエストを送信しない", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], error: null }),
      } as Response);

      render(<MasonryGrid initialPhotos={initialPhotos} />);

      // 最初のスクロール
      Object.defineProperty(document.documentElement, "scrollTop", {
        writable: true,
        configurable: true,
        value: 1500,
      });
      fireEvent.scroll(window);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(1);
      });

      // 2回目のスクロール
      fireEvent.scroll(window);

      await waitFor(
        () => {
          expect(fetch).toHaveBeenCalledTimes(1); // 変わらない
        },
        { timeout: 500 }
      );
    });
  });
});
