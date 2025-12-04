"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, Send } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

const EXAMPLE_QUERIES = [
  "🌅 夕焼けを綺麗に撮るには？",
  "🌙 夜景で手ブレしない設定",
  "👥 室内でポートレート",
  "🏃 動く子供を撮影する設定",
  "🌸 花のマクロ撮影",
  "⛅ 曇りの日の風景",
];

interface SearchFABProps {
  onSearch?: (query: string) => void;
  isLoading?: boolean;
  showExamples?: boolean;
  isSearchMode?: boolean;
}

export function SearchFAB({
  onSearch,
  isLoading = false,
  showExamples = true,
  isSearchMode = false,
}: SearchFABProps) {
  const [isExpandedInternal, setIsExpandedInternal] = useState(true);
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 検索モード中は常に展開状態を維持（ちらつき防止のため直接計算）
  const isExpanded = isSearchMode || isExpandedInternal;

  const handleExpand = () => {
    setIsExpandedInternal(true);
  };

  const handleCollapse = () => {
    setIsExpandedInternal(false);
    setQuery("");
  };

  const handleExampleClick = (example: string) => {
    setQuery(example.replace(/^[^\s]+\s/, "")); // 絵文字を除去
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading && onSearch) {
      onSearch(query.trim());
      setQuery(""); // 送信後に入力内容をクリア
      // 送信後も展開状態を維持（検索結果を表示するため）
    }
  };

  // スクロール方向を検知
  // 検索モード中またはフォーカス中は自動開閉を無効化
  useEffect(() => {
    // 検索モード中またはフォーカス中はスクロール検出による自動開閉を無効化
    if (isSearchMode || isFocused) return;

    // フォーカスが解除された直後、lastScrollYを現在値にリセット
    // （キーボード表示/非表示でビューポートが変わるため）
    lastScrollY.current = window.scrollY;

    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;

          // 上スクロール（scrollY が減少）→ 展開
          if (currentScrollY < lastScrollY.current) {
            setIsExpandedInternal(true);
          }
          // 下スクロール（scrollY が増加）→ 閉じる
          else if (
            currentScrollY > lastScrollY.current &&
            currentScrollY > 50
          ) {
            setIsExpandedInternal(false);
          }

          lastScrollY.current = currentScrollY;
          ticking.current = false;
        });

        ticking.current = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isSearchMode, isFocused]);

  // 検索モードが解除されたらFABの内部状態をリセット
  const prevIsSearchMode = useRef(isSearchMode);
  useEffect(() => {
    // 検索モードがtrueからfalseに変わった時のみリセット
    if (prevIsSearchMode.current && !isSearchMode) {
      setIsExpandedInternal(true); // 展開状態に戻す
      setQuery("");
    }
    prevIsSearchMode.current = isSearchMode;
  }, [isSearchMode]);

  // 展開時に入力欄に自動フォーカス（初期マウント時はスキップ）
  const isInitialMount = useRef(true);
  const [mountTimestamp, setMountTimestamp] = useState(Date.now());

  // マウント時にタイムスタンプを記録
  useEffect(() => {
    setMountTimestamp(Date.now());
  }, []);

  useEffect(() => {
    // 初期マウント時はスキップ（ページロード時の自動フォーカスを防ぐ）
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // マウント後500ms以内は自動フォーカスをスキップ（再マウント直後の誤動作を防ぐ）
    const timeSinceMount = Date.now() - mountTimestamp;
    if (timeSinceMount < 500) {
      return;
    }

    if (isExpanded && inputRef.current) {
      // requestAnimationFrameを使って次のフレームでフォーカス
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
      });
    }
  }, [isExpanded, mountTimestamp]);

  // 画面サイズを検出（xl = 1280px 未満かどうか）
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 1280);
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // iOS対策: visualViewportでキーボードの表示/非表示を監視
  // スクロールでキーボードが閉じた場合、blurイベントが発火しないことがあるため
  useEffect(() => {
    if (!isFocused || !isSmallScreen) return;

    const viewport = window.visualViewport;
    if (!viewport) return;

    const initialHeight = viewport.height;

    const handleResize = () => {
      // キーボードが閉じた（ビューポートが元のサイズに戻った）場合
      // 少し余裕を持たせて判定（50px以内の差なら閉じたとみなす）
      if (viewport.height >= initialHeight - 50 && isFocused) {
        // 入力欄からフォーカスを外す
        inputRef.current?.blur();
      }
    };

    viewport.addEventListener("resize", handleResize);
    return () => viewport.removeEventListener("resize", handleResize);
  }, [isFocused, isSmallScreen]);

  // フォーカス状態をグローバルに通知（フッター非表示用）
  useEffect(() => {
    if (isSmallScreen) {
      window.dispatchEvent(
        new CustomEvent("searchFabFocus", { detail: { focused: isFocused } })
      );
    }
  }, [isFocused, isSmallScreen]);

  // スマホ/タブレットでフォーカス中かどうか
  const isSmallScreenFocused = isSmallScreen && isFocused;

  return (
    <div
      className={`fixed left-0 right-0 z-[60] flex flex-col items-center px-4 transition-all duration-200 ${
        isSmallScreenFocused
          ? "bottom-0 pb-2"
          : "bottom-20 xl:bottom-4 xl:left-16"
      }`}
    >
      {/* 質問例バッジ（展開時のみ表示、チャットがない場合のみ） */}
      <AnimatePresence>
        {isExpanded && showExamples && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="mb-3 flex w-full max-w-2xl gap-2 overflow-x-auto pb-2"
          >
            {EXAMPLE_QUERIES.map((example, index) => (
              <motion.button
                key={index}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleExampleClick(example)}
                onMouseDown={(e) => e.preventDefault()}
                className="whitespace-nowrap rounded-full bg-card px-4 py-2 text-sm shadow-md transition-colors hover:bg-accent"
              >
                {example}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB / 検索入力欄 */}
      <motion.div
        className="relative overflow-hidden rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-2xl"
        initial={false}
        animate={{
          width: isExpanded ? "100%" : 120,
          maxWidth: isExpanded ? 672 : 120, // max-w-2xl = 672px
          height: isExpanded ? 56 : 48,
        }}
        transition={{
          type: "spring",
          stiffness: 180,
          damping: 25,
          mass: 1,
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {!isExpanded ? (
            // FAB (初期状態)
            <motion.button
              key="fab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={handleExpand}
              className="flex h-12 w-full items-center justify-center gap-2 px-4"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="whitespace-nowrap text-sm font-medium text-primary-foreground">
                AIで検索
              </span>
              <Search className="h-4 w-4 shrink-0 text-primary-foreground" />
            </motion.button>
          ) : (
            // 展開状態（入力欄）
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onSubmit={handleSubmit}
              className="flex h-14 items-center gap-2 bg-card px-4"
              style={{ borderRadius: "9999px" }}
            >
              {/* 検索アイコン */}
              <Search className="h-5 w-5 shrink-0 text-muted-foreground" />

              {/* テキスト入力 */}
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="撮りたいシーンや設定で探す"
                className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />

              {/* 送信ボタン */}
              <Button
                type="submit"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full bg-primary"
                disabled={!query.trim() || isLoading}
                onMouseDown={(e) => e.preventDefault()}
              >
                <Send className="h-5 w-5" />
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
