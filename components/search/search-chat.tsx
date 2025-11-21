"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChatMessage } from "@/lib/types/search";
import { Bot, User, ChevronDown, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { parseAIResponse } from "@/lib/utils/parse-ai-response";
import { CameraSettingsCard } from "./camera-settings-card";
import { TipsCard } from "./tips-card";

interface SearchChatProps {
  messages: ChatMessage[];
  isExpanded: boolean;
  onClose?: () => void;
}

export function SearchChat({ messages, isExpanded, onClose }: SearchChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // 新しいメッセージが追加された時、最新のユーザーメッセージにスクロール
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    // 最後のユーザーメッセージを探す
    const lastUserMessageIndex = messages.findLastIndex(
      (m) => m.role === "user"
    );

    if (lastUserMessageIndex >= 0) {
      // その要素にスクロール
      const targetElement = scrollContainer.querySelector(
        `[data-index="${lastUserMessageIndex}"]`
      );
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [messages.length, messages]);

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
          {/* 閉じるボタン */}
          <div className="flex justify-end border-b border-border/50 p-2">
            <button
              onClick={onClose}
              className="rounded-full p-1.5 transition-colors hover:bg-accent"
              aria-label="検索を閉じる"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* チャット履歴 */}
          <div
            ref={scrollContainerRef}
            className="h-64 space-y-4 overflow-y-auto p-4 transition-all duration-300"
          >
            {messages.map((message, index) => (
              <motion.div
                key={index}
                data-index={index}
                data-role={message.role}
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
                  className={`prose prose-sm max-w-[80%] max-w-none rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "prose-invert bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  } [&>*:first-child]:mt-0 [&>*:last-child]:mb-0`}
                >
                  {message.role === "assistant" && !message.content ? (
                    // ローディングドットアニメーション
                    <div className="flex gap-1">
                      <motion.span
                        className="text-lg"
                        animate={{ y: [0, -8, 0] }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        •
                      </motion.span>
                      <motion.span
                        className="text-lg"
                        animate={{ y: [0, -8, 0] }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 0.2,
                        }}
                      >
                        •
                      </motion.span>
                      <motion.span
                        className="text-lg"
                        animate={{ y: [0, -8, 0] }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 0.4,
                        }}
                      >
                        •
                      </motion.span>
                    </div>
                  ) : message.role === "assistant" ? (
                    // AI回答の場合、構造化して表示
                    (() => {
                      const parsed = parseAIResponse(message.content);

                      return (
                        <div className="space-y-0">
                          {/* カメラ設定カード */}
                          {parsed.cameraSettings && (
                            <CameraSettingsCard
                              settings={parsed.cameraSettings}
                            />
                          )}

                          {/* 撮影のポイント & コツ */}
                          <TipsCard
                            shootingPoint={parsed.shootingPoint}
                            tips={parsed.tips}
                          />

                          {/* その他のコンテンツ */}
                          {parsed.otherContent && (
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => (
                                  <p className="text-sm leading-relaxed">
                                    {children}
                                  </p>
                                ),
                                strong: ({ children }) => (
                                  <strong className="font-bold">
                                    {children}
                                  </strong>
                                ),
                                ul: ({ children }) => (
                                  <ul className="my-2 list-inside list-disc space-y-1">
                                    {children}
                                  </ul>
                                ),
                                ol: ({ children }) => (
                                  <ol className="my-2 list-inside list-decimal space-y-1">
                                    {children}
                                  </ol>
                                ),
                                li: ({ children }) => (
                                  <li className="text-sm">{children}</li>
                                ),
                              }}
                            >
                              {parsed.otherContent}
                            </ReactMarkdown>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    // ユーザーメッセージの場合は通常表示
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => (
                          <p className="text-sm leading-relaxed">{children}</p>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-bold">{children}</strong>
                        ),
                        ul: ({ children }) => (
                          <ul className="my-2 list-inside list-disc space-y-1">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="my-2 list-inside list-decimal space-y-1">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className="text-sm">{children}</li>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  )}
                </div>
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
