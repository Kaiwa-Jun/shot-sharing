"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ImageIcon, Mic, Search, Send, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const EXAMPLE_QUERIES = [
  "🌅 夕焼けを綺麗に撮るには？",
  "🌙 夜景で手ブレしない設定",
  "👥 室内でポートレート",
  "🏃 動く子供を撮影する設定",
  "🌸 花のマクロ撮影",
  "⛅ 曇りの日の風景",
];

export function SearchFAB() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState("");

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
    if (query.trim()) {
      // TODO: 検索処理を実装
      console.log("Search query:", query);
    }
  };

  return (
    <>
      {/* 背景オーバーレイ */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm"
            onClick={handleCollapse}
          />
        )}
      </AnimatePresence>

      {/* FAB / 検索入力欄 */}
      <motion.div
        className="fixed z-[60]"
        initial={false}
        animate={
          isExpanded
            ? {
                bottom: "50%",
                right: "5%",
                width: "90%",
                translateY: "50%",
              }
            : {
                bottom: 16,
                right: 16,
                width: 64,
                translateY: 0,
              }
        }
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
      >
        {!isExpanded ? (
          // FAB (初期状態)
          <motion.button
            onClick={handleExpand}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-2xl"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Search className="h-6 w-6 text-primary-foreground" />
          </motion.button>
        ) : (
          // 展開状態
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full space-y-4"
          >
            {/* 質問例バッジ */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex gap-2 overflow-x-auto pb-2"
            >
              {EXAMPLE_QUERIES.map((example, index) => (
                <motion.button
                  key={index}
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  onClick={() => handleExampleClick(example)}
                  className="whitespace-nowrap rounded-full bg-card px-4 py-2 text-sm shadow-md transition-colors hover:bg-accent"
                >
                  {example}
                </motion.button>
              ))}
            </motion.div>

            {/* 検索入力欄 */}
            <motion.form
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              onSubmit={handleSubmit}
              className="flex items-center gap-2 rounded-2xl bg-card p-3 shadow-2xl"
            >
              {/* 閉じるボタン */}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={handleCollapse}
                className="h-10 w-10 shrink-0"
              >
                <X className="h-5 w-5" />
              </Button>

              {/* テキスト入力 */}
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="撮影シーンや設定について質問..."
                className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                autoFocus
              />

              {/* 画像添付ボタン */}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-10 w-10 shrink-0"
              >
                <ImageIcon className="h-5 w-5" />
              </Button>

              {/* マイクボタン (グレーアウト - MVP以降) */}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled
                className="h-10 w-10 shrink-0 opacity-40"
              >
                <Mic className="h-5 w-5" />
              </Button>

              {/* 送信ボタン */}
              <Button
                type="submit"
                size="icon"
                className="h-10 w-10 shrink-0 bg-primary"
                disabled={!query.trim()}
              >
                <Send className="h-5 w-5" />
              </Button>
            </motion.form>
          </motion.div>
        )}
      </motion.div>
    </>
  );
}
