"use client";

import { motion } from "framer-motion";
import { Home, Plus, User } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { LoginPromptModal } from "@/components/auth/login-prompt-modal";
import { PostModal } from "@/components/posts/post-modal";

export function GlobalBottomNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const supabase = createClient();

  // 認証状態の監視
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const handleHomeClick = () => {
    // 常にフルリロードでホームに遷移（モーダル等をクリアするため）
    window.location.href = "/";
  };

  const handlePostClick = () => {
    if (user) {
      setShowPostModal(true);
    } else {
      setShowLoginModal(true);
    }
  };

  const handleRightClick = () => {
    if (user) {
      // 常にフルリロードで遷移（モーダル等をクリアするため）
      window.location.href = "/me";
    } else {
      setShowLoginModal(true);
    }
  };

  const isHome = pathname === "/";
  const isMe = pathname === "/me" || pathname === "/me/edit";

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-[80] border-t border-border/40 bg-background/95 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-around px-4">
          {/* ホーム */}
          <motion.button
            onClick={handleHomeClick}
            whileTap={{ scale: 0.9 }}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              isHome
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Home className="h-6 w-6" />
          </motion.button>

          {/* 投稿ボタン（中央・目立つデザイン） */}
          <motion.button
            onClick={handlePostClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-lg transition-colors hover:bg-primary/90"
          >
            <Plus className="h-6 w-6 text-primary-foreground" />
          </motion.button>

          {/* マイページ / ログイン */}
          <motion.button
            onClick={handleRightClick}
            whileTap={{ scale: 0.9 }}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              isMe
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="h-6 w-6" />
          </motion.button>
        </div>
      </nav>

      {/* ログインモーダル */}
      <LoginPromptModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
      />

      {/* 投稿モーダル */}
      <PostModal open={showPostModal} onOpenChange={setShowPostModal} />
    </>
  );
}
