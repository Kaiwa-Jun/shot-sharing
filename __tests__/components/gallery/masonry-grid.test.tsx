import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MasonryGrid } from "@/components/gallery/masonry-grid";
import type { PhotoCardProps } from "@/components/gallery/photo-card";

describe("MasonryGrid", () => {
  const mockPhotos: PhotoCardProps[] = [
    {
      id: "1",
      imageUrl: "https://example.com/image1.jpg",
      exifData: { iso: 100, fValue: 8, shutterSpeed: "1/250s" },
    },
    {
      id: "2",
      imageUrl: "https://example.com/image2.jpg",
      exifData: { iso: 400, fValue: 2.8, shutterSpeed: "1/60s" },
    },
    {
      id: "3",
      imageUrl: "https://example.com/image3.jpg",
      exifData: { iso: 800, fValue: 1.8, shutterSpeed: "1/30s" },
    },
  ];

  describe("基本レンダリング", () => {
    it("渡された写真がすべて表示される", () => {
      render(<MasonryGrid photos={mockPhotos} />);
      const images = screen.getAllByRole("img");
      expect(images).toHaveLength(3);
    });

    it("PhotoCardコンポーネントが正しい数だけレンダリングされる", () => {
      render(<MasonryGrid photos={mockPhotos} />);
      // 各写真のExif情報が表示されていることを確認
      expect(screen.getByText(/ISO 100/)).toBeInTheDocument();
      expect(screen.getByText(/ISO 400/)).toBeInTheDocument();
      expect(screen.getByText(/ISO 800/)).toBeInTheDocument();
    });

    it("各PhotoCardに正しいpropsが渡される", () => {
      render(<MasonryGrid photos={mockPhotos} />);

      // 各画像のExif情報が正しく表示されているか確認
      expect(screen.getByText(/ISO 100 • f\/8 • 1\/250s/)).toBeInTheDocument();
      expect(
        screen.getByText(/ISO 400 • f\/2\.8 • 1\/60s/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/ISO 800 • f\/1\.8 • 1\/30s/)
      ).toBeInTheDocument();
    });
  });

  describe("空データ対応", () => {
    it("写真配列が空の場合、エラーにならない", () => {
      const { container } = render(<MasonryGrid photos={[]} />);
      expect(container).toBeInTheDocument();
    });

    it("写真配列が空の場合、画像が表示されない", () => {
      render(<MasonryGrid photos={[]} />);
      const images = screen.queryAllByRole("img");
      expect(images).toHaveLength(0);
    });
  });

  describe("大量データ", () => {
    it("20件の写真を正しく表示できる", () => {
      const manyPhotos: PhotoCardProps[] = Array.from(
        { length: 20 },
        (_, i) => ({
          id: `${i + 1}`,
          imageUrl: `https://example.com/image${i + 1}.jpg`,
          exifData: { iso: 100 + i * 10 },
        })
      );
      render(<MasonryGrid photos={manyPhotos} />);
      const images = screen.getAllByRole("img");
      expect(images).toHaveLength(20);
    });
  });
});
