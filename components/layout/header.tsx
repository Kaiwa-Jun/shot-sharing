"use client";

import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Camera, User, PlusCircle } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { LoginPromptModal } from "@/components/auth/login-prompt-modal";
import { PostModal } from "@/components/posts/post-modal";

interface HeaderProps {
  initialUser?: SupabaseUser | null;
}

export function Header({ initialUser = null }: HeaderProps) {
  const [isHidden, setIsHidden] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(initialUser);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const { scrollY } = useScroll();
  const supabase = createClient();

  // 認証状態の監視
  useEffect(() => {
    // 初回の認証状態を取得
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;

    // 下にスクロール（かつ100px以上スクロールした）
    if (latest > previous && latest > 100) {
      setIsHidden(true);
    } else {
      // 上にスクロール
      setIsHidden(false);
    }
  });

  return (
    <>
      <motion.header
        variants={{
          visible: { y: 0, opacity: 1 },
          hidden: { y: "-100%", opacity: 0 },
        }}
        animate={isHidden ? "hidden" : "visible"}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed left-0 right-0 top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg"
      >
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          {/* 左: ユーザー情報またはログインボタン */}
          {user ? (
            <Link href="/me">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
              >
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="User avatar"
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5 text-muted-foreground" />
                )}
              </motion.div>
            </Link>
          ) : (
            <motion.button
              onClick={() => setShowLoginModal(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              ログイン
            </motion.button>
          )}

          {/* 中央: アプリアイコン */}
          <Link href="/" className="absolute left-1/2 -translate-x-1/2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60">
                <Camera className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="hidden font-bold tracking-tight sm:inline-block">
                Shot Sharing
              </span>
            </motion.div>
          </Link>

          {/* 右: 投稿ボタン */}
          {user ? (
            <motion.button
              onClick={() => setShowPostModal(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <PlusCircle className="h-5 w-5" />
            </motion.button>
          ) : (
            <div className="w-10" />
          )}
        </div>
      </motion.header>

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
