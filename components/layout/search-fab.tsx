"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon, Search, Send } from "lucide-react";
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
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
  // 検索モード中は自動開閉を無効化
  useEffect(() => {
    // 検索モード中はスクロール検出による自動開閉を無効化
    if (isSearchMode) return;

    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;

          // 下スクロール（scrollY が増加）→ 展開
          if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
            setIsExpanded(true);
          }
          // 上スクロール（scrollY が減少）→ 閉じる
          else if (currentScrollY < lastScrollY.current) {
            setIsExpanded(false);
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
  }, [isSearchMode]);

  // 検索モードの状態に応じてFABの展開状態を制御
  useEffect(() => {
    if (isSearchMode) {
      // 検索モード中は常に展開状態を維持
      setIsExpanded(true);
    } else {
      // 検索モードが解除されたらFABを閉じる
      setIsExpanded(false);
      setQuery("");
    }
  }, [isSearchMode]);

  return (
    <div className="fixed bottom-4 left-0 right-0 z-[60] flex flex-col items-center px-4">
      {/* 質問例バッジ（展開時のみ表示、チャットがない場合のみ） */}
      <AnimatePresence>
        {isExpanded && showExamples && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.2 }}
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
        layout
        className="relative overflow-hidden rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-2xl"
        initial={false}
        animate={{
          width: isExpanded ? "100%" : 56,
          maxWidth: isExpanded ? 672 : 56, // max-w-2xl = 672px
          height: isExpanded ? 56 : 56,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
      >
        <AnimatePresence mode="wait">
          {!isExpanded ? (
            // FAB (初期状態)
            <motion.button
              key="fab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={handleExpand}
              className="flex h-14 w-14 items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Search className="h-5 w-5 text-primary-foreground" />
            </motion.button>
          ) : (
            // 展開状態（入力欄）
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onSubmit={handleSubmit}
              className="flex h-14 items-center gap-2 bg-card px-4"
              style={{ borderRadius: "9999px" }}
            >
              {/* 検索アイコン */}
              <Search className="h-5 w-5 shrink-0 text-muted-foreground" />

              {/* テキスト入力 */}
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="撮りたいシーンや設定で探す"
                className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
              />

              {/* 画像添付ボタン */}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-10 w-10 shrink-0"
                onMouseDown={(e) => e.preventDefault()}
              >
                <ImageIcon className="h-5 w-5" />
              </Button>

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
