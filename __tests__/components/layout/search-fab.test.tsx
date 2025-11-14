import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { SearchFAB } from "@/components/layout/search-fab";

describe("SearchFAB", () => {
  describe("基本レンダリング", () => {
    it("初期状態でFABボタンが表示される", () => {
      render(<SearchFAB />);
      const searchButton = screen.getByRole("button");
      expect(searchButton).toBeInTheDocument();
    });

    it("初期状態では検索入力欄が表示されない", () => {
      render(<SearchFAB />);
      const searchInput =
        screen.queryByPlaceholderText(/撮影シーンや設定について質問/);
      expect(searchInput).not.toBeInTheDocument();
    });
  });

  describe("FAB展開", () => {
    it("FABクリック後に検索入力欄が表示される", async () => {
      const user = userEvent.setup();
      render(<SearchFAB />);

      const fabButton = screen.getByRole("button");
      await user.click(fabButton);

      await waitFor(() => {
        const searchInput =
          screen.getByPlaceholderText(/撮影シーンや設定について質問/);
        expect(searchInput).toBeInTheDocument();
      });
    });

    it("FABクリック後に質問例バッジが表示される", async () => {
      const user = userEvent.setup();
      render(<SearchFAB />);

      const fabButton = screen.getByRole("button");
      await user.click(fabButton);

      await waitFor(() => {
        expect(screen.getByText(/夕焼けを綺麗に撮るには/)).toBeInTheDocument();
        expect(screen.getByText(/夜景で手ブレしない設定/)).toBeInTheDocument();
        expect(screen.getByText(/室内でポートレート/)).toBeInTheDocument();
      });
    });
  });

  describe("質問例バッジ", () => {
    it("質問例クリック時に入力欄に値が設定される", async () => {
      const user = userEvent.setup();
      render(<SearchFAB />);

      // FABを展開
      const fabButton = screen.getByRole("button");
      await user.click(fabButton);

      await waitFor(() => {
        expect(screen.getByText(/夕焼けを綺麗に撮るには/)).toBeInTheDocument();
      });

      // 質問例をクリック
      const exampleButton = screen.getByText(/夕焼けを綺麗に撮るには/);
      await user.click(exampleButton);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(
          /撮影シーンや設定について質問/
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

      // FABを展開
      const fabButton = screen.getByRole("button");
      await user.click(fabButton);

      await waitFor(() => {
        const searchInput =
          screen.getByPlaceholderText(/撮影シーンや設定について質問/);
        expect(searchInput).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(
        /撮影シーンや設定について質問/
      ) as HTMLInputElement;
      await user.type(searchInput, "星空撮影のコツ");

      expect(searchInput.value).toBe("星空撮影のコツ");
    });

    it("入力欄が空の場合、送信ボタンが無効化される", async () => {
      const user = userEvent.setup();
      render(<SearchFAB />);

      // FABを展開
      const fabButton = screen.getByRole("button");
      await user.click(fabButton);

      await waitFor(() => {
        const searchInput =
          screen.getByPlaceholderText(/撮影シーンや設定について質問/);
        expect(searchInput).toBeInTheDocument();
      });

      // 送信ボタンを取得（最後のボタン）
      const buttons = screen.getAllByRole("button");
      const submitButton = buttons[buttons.length - 1];

      expect(submitButton).toBeDisabled();
    });

    it("入力欄に値がある場合、送信ボタンが有効化される", async () => {
      const user = userEvent.setup();
      render(<SearchFAB />);

      // FABを展開
      const fabButton = screen.getByRole("button");
      await user.click(fabButton);

      await waitFor(() => {
        const searchInput =
          screen.getByPlaceholderText(/撮影シーンや設定について質問/);
        expect(searchInput).toBeInTheDocument();
      });

      const searchInput =
        screen.getByPlaceholderText(/撮影シーンや設定について質問/);
      await user.type(searchInput, "ポートレート撮影");

      // 送信ボタンを取得（最後のボタン）
      const buttons = screen.getAllByRole("button");
      const submitButton = buttons[buttons.length - 1];

      expect(submitButton).not.toBeDisabled();
    });
  });

  describe("フォーム送信", () => {
    it("フォーム送信後に入力欄が閉じられる", async () => {
      const user = userEvent.setup();
      render(<SearchFAB />);

      // FABを展開
      const fabButton = screen.getByRole("button");
      await user.click(fabButton);

      await waitFor(() => {
        const searchInput =
          screen.getByPlaceholderText(/撮影シーンや設定について質問/);
        expect(searchInput).toBeInTheDocument();
      });

      const searchInput =
        screen.getByPlaceholderText(/撮影シーンや設定について質問/);
      await user.type(searchInput, "夜景撮影");

      // 送信ボタンを取得（最後のボタン）
      const buttons = screen.getAllByRole("button");
      const submitButton = buttons[buttons.length - 1];
      await user.click(submitButton);

      // 送信後に入力欄が閉じることを確認
      await waitFor(() => {
        expect(
          screen.queryByPlaceholderText(/撮影シーンや設定について質問/)
        ).not.toBeInTheDocument();
      });
    });

    it("空白のみの入力では送信されない", async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, "log");
      render(<SearchFAB />);

      // FABを展開
      const fabButton = screen.getByRole("button");
      await user.click(fabButton);

      await waitFor(() => {
        const searchInput =
          screen.getByPlaceholderText(/撮影シーンや設定について質問/);
        expect(searchInput).toBeInTheDocument();
      });

      const searchInput =
        screen.getByPlaceholderText(/撮影シーンや設定について質問/);
      await user.type(searchInput, "   ");

      // 送信ボタンは無効化されているはず
      const buttons = screen.getAllByRole("button");
      const submitButton = buttons[buttons.length - 1];
      expect(submitButton).toBeDisabled();

      consoleSpy.mockRestore();
    });
  });

  describe("ボタンの状態", () => {
    it("マイクボタンが無効化されている", async () => {
      const user = userEvent.setup();
      render(<SearchFAB />);

      // FABを展開
      const fabButton = screen.getByRole("button");
      await user.click(fabButton);

      await waitFor(() => {
        const searchInput =
          screen.getByPlaceholderText(/撮影シーンや設定について質問/);
        expect(searchInput).toBeInTheDocument();
      });

      // マイクボタンを取得（後ろから2番目のボタン）
      const buttons = screen.getAllByRole("button");
      const micButton = buttons[buttons.length - 2];

      expect(micButton).toBeDisabled();
    });
  });
});
