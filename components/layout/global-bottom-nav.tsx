"use client";

import { motion } from "framer-motion";
import { Plus, User } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { LoginPromptModal } from "@/components/auth/login-prompt-modal";
import { PostModal } from "@/components/posts/post-modal";

// カスタムホームアイコン（塗りつぶしが右下から左上に同心円状に変化）
function HomeIcon({
  filled,
  className,
}: {
  filled: boolean;
  className?: string;
}) {
  // ページロード時にアニメーションするための状態
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    if (filled) {
      // 少し遅延させてからアニメーション開始（マウント後にトランジションが効くように）
      const timer = setTimeout(() => {
        setIsAnimated(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setIsAnimated(false);
    }
  }, [filled]);

  // 線画アイコン
  const OutlineIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );

  // 塗りつぶしアイコン（ドア部分は白）
  const FilledIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      className={className}
    >
      <defs>
        <mask id="home-door-mask">
          <rect x="0" y="0" width="24" height="24" fill="white" />
          <rect x="9" y="14" width="6" height="8" fill="black" />
        </mask>
      </defs>
      <path
        d="M3 10.182V22h18V10.182L12 2L3 10.182Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="2"
        mask="url(#home-door-mask)"
      />
      <path
        d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  // アニメーション状態に基づいてclip-pathを設定
  const clipPathValue = isAnimated
    ? "circle(150% at 100% 100%)"
    : "circle(0% at 100% 100%)";

  return (
    <div className="relative h-6 w-6">
      {/* 線画（常に表示） */}
      <div className="absolute inset-0">
        <OutlineIcon />
      </div>
      {/* 塗りつぶし（clip-pathでアニメーション） */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: clipPathValue,
          WebkitClipPath: clipPathValue,
          transition:
            "clip-path 0.5s ease-out, -webkit-clip-path 0.5s ease-out",
        }}
      >
        <FilledIcon />
      </div>
    </div>
  );
}

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

  const isHome = pathname === "/";
  const isMe = pathname === "/me" || pathname === "/me/edit";

  const handleHomeClick = () => {
    // 既にホームにいる場合は何もしない
    if (isHome) return;
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
      // 既にマイページにいる場合は何もしない
      if (isMe) return;
      window.location.href = "/me";
    } else {
      setShowLoginModal(true);
    }
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-[80] border-t border-border/40 bg-background/95 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-around px-4">
          {/* ホーム */}
          <motion.button
            onClick={handleHomeClick}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              isHome
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <motion.div
              key={isHome ? "home-active" : "home-inactive"}
              initial={{ scale: 1 }}
              animate={isHome ? { scale: [1, 1.3, 1] } : { scale: 1 }}
              transition={{
                duration: 0.3,
                ease: "easeOut",
              }}
            >
              <HomeIcon filled={isHome} className="h-6 w-6" />
            </motion.div>
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
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              isMe
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <motion.div
              key={isMe ? "user-active" : "user-inactive"}
              initial={{ scale: 1 }}
              animate={isMe ? { scale: [1, 1.3, 1] } : { scale: 1 }}
              transition={{
                duration: 0.3,
                ease: "easeOut",
              }}
            >
              <User
                className="h-6 w-6"
                fill={isMe ? "currentColor" : "none"}
                strokeWidth={isMe ? 2 : 2}
              />
            </motion.div>
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
