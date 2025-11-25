import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { PhotoCard } from "@/components/gallery/photo-card";

describe("PhotoCard", () => {
  const mockProps = {
    id: "1",
    imageUrl: "https://example.com/image.jpg",
    exifData: {
      iso: 200,
      fValue: 2.8,
      shutterSpeed: "1/250s",
      exposureCompensation: 0.7,
    },
  };

  describe("基本レンダリング", () => {
    it("画像が正しく表示される", () => {
      render(<PhotoCard {...mockProps} />);
      const image = screen.getByRole("img");
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute("src");
    });

    it("Exif情報が表示される（ISO、F値、シャッタースピード）", () => {
      render(<PhotoCard {...mockProps} />);
      expect(screen.getByText(/ISO 200/)).toBeInTheDocument();
      expect(screen.getByText(/f\/2\.8/)).toBeInTheDocument();
      expect(screen.getByText(/1\/250s/)).toBeInTheDocument();
    });

    it("Exif情報のフォーマットが正しい", () => {
      render(<PhotoCard {...mockProps} />);
      const exifText = screen.getByText(/ISO 200 • f\/2\.8 • 1\/250s/);
      expect(exifText).toBeInTheDocument();
    });
  });

  describe("Exif情報のバリエーション", () => {
    it("ISO値のみの場合に正しく表示される", () => {
      const props = {
        ...mockProps,
        exifData: { iso: 400 },
      };
      render(<PhotoCard {...props} />);
      expect(screen.getByText("ISO 400")).toBeInTheDocument();
    });

    it("F値のみの場合に正しく表示される", () => {
      const props = {
        ...mockProps,
        exifData: { fValue: 1.8 },
      };
      render(<PhotoCard {...props} />);
      expect(screen.getByText("f/1.8")).toBeInTheDocument();
    });

    it("シャッタースピードのみの場合に正しく表示される", () => {
      const props = {
        ...mockProps,
        exifData: { shutterSpeed: "1/60s" },
      };
      render(<PhotoCard {...props} />);
      expect(screen.getByText("1/60s")).toBeInTheDocument();
    });

    it("露出補正がプラスの場合に'+'付きで表示される", () => {
      const props = {
        ...mockProps,
        exifData: { exposureCompensation: 1.0 },
      };
      render(<PhotoCard {...props} />);
      expect(screen.getByText("+1EV")).toBeInTheDocument();
    });

    it("露出補正がマイナスの場合に正しく表示される", () => {
      const props = {
        ...mockProps,
        exifData: { exposureCompensation: -0.3 },
      };
      render(<PhotoCard {...props} />);
      expect(screen.getByText("-0.3EV")).toBeInTheDocument();
    });

    it("露出補正が0の場合は表示されない", () => {
      const props = {
        ...mockProps,
        exifData: { exposureCompensation: 0 },
      };
      render(<PhotoCard {...props} />);
      expect(screen.queryByText(/EV/)).not.toBeInTheDocument();
    });

    it("Exif情報がない場合、オーバーレイが表示されない", () => {
      const props = {
        ...mockProps,
        exifData: undefined,
      };
      const { container } = render(<PhotoCard {...props} />);
      // Exif情報オーバーレイのクラスが存在しないことを確認
      const overlay = container.querySelector(".bg-gradient-to-t");
      expect(overlay).not.toBeInTheDocument();
    });
  });

  describe("インタラクション", () => {
    it("カードクリック時にonClickハンドラーが呼ばれる", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      const props = {
        ...mockProps,
        onClick: handleClick,
      };
      render(<PhotoCard {...props} />);

      const card = screen.getByRole("img").closest("div");
      if (card) {
        await user.click(card);
        expect(handleClick).toHaveBeenCalledTimes(1);
      }
    });

    it("onClickが渡されていない場合でもエラーにならない", async () => {
      const user = userEvent.setup();
      render(<PhotoCard {...mockProps} />);

      const card = screen.getByRole("img").closest("div");
      if (card) {
        await user.click(card);
        // エラーが発生しないことを確認
      }
      expect(true).toBe(true);
    });
  });
});
