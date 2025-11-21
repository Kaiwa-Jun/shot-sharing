"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChatMessage } from "@/lib/types/search";
import { Bot, User, ChevronDown, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { parseAIResponse } from "@/lib/utils/parse-ai-response";
import { CameraSettingsCard } from "./camera-settings-card";
import { TipsCard } from "./tips-card";
import { PhotoCardProps } from "@/components/gallery/photo-card";

interface SearchChatProps {
  messages: ChatMessage[];
  isExpanded: boolean;
  onClose?: () => void;
  searchResults?: PhotoCardProps[];
  onPhotoClick?: (photoId: string, photoData: PhotoCardProps) => void;
}

export function SearchChat({
  messages,
  isExpanded,
  onClose,
  searchResults,
  onPhotoClick,
}: SearchChatProps) {
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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: 0.2,
        }}
        className="fixed inset-0 z-50 bg-black/30 p-6 pb-24 backdrop-blur-sm xl:left-16"
        onClick={onClose}
      >
        <div
          className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-end border-b border-border/50 px-4 py-3">
            <button
              onClick={onClose}
              className="rounded-full p-1.5 transition-colors hover:bg-accent"
              aria-label="検索を閉じる"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* チャット履歴 */}
          <div
            ref={scrollContainerRef}
            className="flex-1 space-y-4 overflow-y-auto p-4"
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

            {/* 検索結果の画像グリッド */}
            {searchResults && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-8"
              >
                <h3 className="mb-4 text-base font-semibold">
                  検索結果 ({searchResults.length}件)
                </h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {searchResults.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => onPhotoClick?.(photo.id, photo)}
                      className="group relative cursor-pointer overflow-hidden rounded-lg bg-muted transition-transform hover:scale-[1.02]"
                    >
                      <img
                        src={photo.imageUrl}
                        alt=""
                        className="aspect-square w-full object-cover"
                      />
                      {photo.exifData && (
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                          <div className="flex gap-2">
                            {photo.exifData.iso && (
                              <span>ISO {photo.exifData.iso}</span>
                            )}
                            {photo.exifData.fValue && (
                              <span>f/{photo.exifData.fValue}</span>
                            )}
                            {photo.exifData.shutterSpeed && (
                              <span>{photo.exifData.shutterSpeed}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

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
                className="absolute bottom-4 right-4 rounded-full bg-primary p-2 shadow-lg transition-colors hover:bg-primary/90"
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
