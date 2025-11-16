"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChatMessage } from "@/lib/types/search";
import { Bot, User } from "lucide-react";
import { useEffect, useRef } from "react";

interface SearchChatProps {
  messages: ChatMessage[];
  isExpanded: boolean;
}

export function SearchChat({ messages, isExpanded }: SearchChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // メッセージが更新されたら最下部にスクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        className="fixed bottom-24 left-0 right-0 z-50 mx-auto max-w-2xl px-4"
      >
        <div className="rounded-2xl bg-card/95 shadow-2xl backdrop-blur-sm">
          {/* チャット履歴 */}
          <div
            className={`space-y-4 overflow-y-auto p-4 ${
              isExpanded ? "max-h-96" : "max-h-32"
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
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
