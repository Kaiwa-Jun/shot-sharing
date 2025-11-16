"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChatMessage } from "@/lib/types/search";
import { Bot, User, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface SearchChatProps {
  messages: ChatMessage[];
  isExpanded: boolean;
}

export function SearchChat({ messages, isExpanded }: SearchChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // 新しいメッセージが追加された時のみ最上部にスクロール
  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [messages.length]);

  // スクロール位置を監視
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      // 最下部から50px以上離れたらボタンを表示
      const isNearBottom = distanceFromBottom < 50;
      setShowScrollButton(!isNearBottom);
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    // 初期状態を確認
    handleScroll();

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
    };
  }, [messages]);

  // 最下部にスクロールする関数
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (messages.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: isExpanded ? 0 : 100, opacity: isExpanded ? 1 : 0.8 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
        className="fixed bottom-20 left-0 right-0 z-50 mx-auto max-w-2xl px-4"
      >
        <div className="relative rounded-2xl bg-card/95 shadow-2xl backdrop-blur-sm">
          {/* チャット履歴 */}
          <div
            ref={scrollContainerRef}
            className={`space-y-4 overflow-y-auto p-4 ${
              isExpanded ? "max-h-[768px]" : "h-64"
            } transition-all duration-300`}
          >
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                    <Bot className="h-5 w-5 text-primary-foreground" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">
                    {message.content}
                  </p>
                </div>
                {message.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </motion.div>
            ))}
            {/* 自動スクロール用のダミー要素 */}
            <div ref={messagesEndRef} />
          </div>

          {/* 最下部へスクロールするボタン */}
          <AnimatePresence>
            {showScrollButton && (
              <motion.button
                initial={{ y: 20, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.8 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                }}
                onClick={scrollToBottom}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-primary p-2 shadow-lg transition-colors hover:bg-primary/90"
                aria-label="最下部へスクロール"
              >
                <ChevronDown className="h-5 w-5 text-primary-foreground" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
