import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { SearchFAB } from "@/components/layout/search-fab";

describe("SearchFAB", () => {
  describe("基本レンダリング", () => {
    it("初期状態で検索入力欄が表示される", () => {
      render(<SearchFAB />);
      const searchInput =
        screen.getByPlaceholderText(/撮りたいシーンや設定で探す/);
      expect(searchInput).toBeInTheDocument();
    });

    it("初期状態で質問例バッジが表示される", () => {
      render(<SearchFAB />);
      expect(screen.getByText(/夕焼けを綺麗に撮るには/)).toBeInTheDocument();
      expect(screen.getByText(/夜景で手ブレしない設定/)).toBeInTheDocument();
      expect(screen.getByText(/室内でポートレート/)).toBeInTheDocument();
    });
  });

  describe("質問例バッジ", () => {
    it("質問例クリック時に入力欄に値が設定される", async () => {
      const user = userEvent.setup();
      render(<SearchFAB />);

      await waitFor(() => {
        expect(screen.getByText(/夕焼けを綺麗に撮るには/)).toBeInTheDocument();
      });

      // 質問例をクリック
      const exampleButton = screen.getByText(/夕焼けを綺麗に撮るには/);
      await user.click(exampleButton);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(
          /撮りたいシーンや設定で探す/
        ) as HTMLInputElement;
        // 絵文字が除去されることを確認
        expect(searchInput.value).toBe("夕焼けを綺麗に撮るには？");
      });
    });
  });

  describe("検索入力", () => {
    it("入力欄に値を入力できる", async () => {
      const user = userEvent.setup();
      render(<SearchFAB />);

      const searchInput = screen.getByPlaceholderText(
        /撮りたいシーンや設定で探す/
      ) as HTMLInputElement;
      await user.type(searchInput, "星空撮影のコツ");

      expect(searchInput.value).toBe("星空撮影のコツ");
    });

    it("入力欄が空の場合、送信ボタンが無効化される", () => {
      render(<SearchFAB />);

      // 送信ボタンを取得（最後のボタン）
      const buttons = screen.getAllByRole("button");
      const submitButton = buttons[buttons.length - 1];

      expect(submitButton).toBeDisabled();
    });

    it("入力欄に値がある場合、送信ボタンが有効化される", async () => {
      const user = userEvent.setup();
      render(<SearchFAB />);

      const searchInput =
        screen.getByPlaceholderText(/撮りたいシーンや設定で探す/);
      await user.type(searchInput, "ポートレート撮影");

      // 送信ボタンを取得（最後のボタン）
      const buttons = screen.getAllByRole("button");
      const submitButton = buttons[buttons.length - 1];

      expect(submitButton).not.toBeDisabled();
    });
  });

  describe("フォーム送信", () => {
    it("フォーム送信後に入力内容がクリアされるが展開状態は維持される", async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      render(<SearchFAB onSearch={onSearch} />);

      const searchInput = screen.getByPlaceholderText(
        /撮りたいシーンや設定で探す/
      ) as HTMLInputElement;
      await user.type(searchInput, "夜景撮影");

      // 送信ボタンを取得（最後のボタン）
      const buttons = screen.getAllByRole("button");
      const submitButton = buttons[buttons.length - 1];
      await user.click(submitButton);

      // onSearchコールバックが呼ばれることを確認
      expect(onSearch).toHaveBeenCalledWith("夜景撮影");

      // 送信後も入力欄は表示されたまま（検索結果を表示するため）
      await waitFor(() => {
        const searchInputAfter = screen.getByPlaceholderText(
          /撮りたいシーンや設定で探す/
        ) as HTMLInputElement;
        expect(searchInputAfter).toBeInTheDocument();
        // 入力内容はクリアされている
        expect(searchInputAfter.value).toBe("");
      });
    });

    it("空白のみの入力では送信されない", async () => {
      const user = userEvent.setup();
      render(<SearchFAB />);

      const searchInput =
        screen.getByPlaceholderText(/撮りたいシーンや設定で探す/);
      await user.type(searchInput, "   ");

      // 送信ボタンは無効化されているはず
      const buttons = screen.getAllByRole("button");
      const submitButton = buttons[buttons.length - 1];
      expect(submitButton).toBeDisabled();
    });
  });
});
