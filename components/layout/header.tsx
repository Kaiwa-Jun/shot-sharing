"use client";

import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { User, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { LoginPromptModal } from "@/components/auth/login-prompt-modal";
import { PostModal } from "@/components/posts/post-modal";
import { MenuSidebar } from "@/components/layout/menu-sidebar";
import { ContentView } from "@/app/@modal/(.)me/content-view";
import { signOut } from "@/app/actions/auth";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";

interface HeaderProps {
  initialUser?: SupabaseUser | null;
  onResetSearch?: () => void;
}

export function Header({ initialUser = null, onResetSearch }: HeaderProps) {
  const [isHidden, setIsHidden] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(initialUser);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showMenuSidebar, setShowMenuSidebar] = useState(false);
  const [contentView, setContentView] = useState<"terms" | "privacy" | null>(
    null
  );
  const { scrollY } = useScroll();
  const supabase = createClient();
  const router = useRouter();

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

  // ログアウト処理
  const handleLogout = async () => {
    const result = await signOut();
    if (result.success) {
      router.push("/");
      router.refresh();
    }
  };

  // 利用規約・プライバシーポリシー表示
  const handleShowTerms = () => {
    setContentView("terms");
  };

  const handleShowPrivacy = () => {
    setContentView("privacy");
  };

  const handleCloseContentView = () => {
    setContentView(null);
  };

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
          {/* 左: アバター（ログイン時）or ハンバーガーメニュー（未ログイン時） */}
          {user ? (
            <motion.button
              onClick={() => setShowMenuSidebar(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-muted"
            >
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="User avatar"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <User className="h-6 w-6 text-muted-foreground" />
              )}
            </motion.button>
          ) : (
            <motion.button
              onClick={() => setShowMenuSidebar(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-muted"
            >
              <Menu className="h-6 w-6" />
            </motion.button>
          )}

          {/* 中央: サービス名 */}
          <h1 className="text-lg font-semibold">Shot Sharing</h1>

          {/* 右: 空白（将来的に通知などを追加可能） */}
          <div className="h-10 w-10" />
        </div>
      </motion.header>

      {/* メニューサイドバー */}
      <MenuSidebar
        open={showMenuSidebar}
        onClose={() => setShowMenuSidebar(false)}
        user={user}
        onLoginClick={() => setShowLoginModal(true)}
        onLogoutClick={handleLogout}
        onTermsClick={handleShowTerms}
        onPrivacyClick={handleShowPrivacy}
        onResetSearch={onResetSearch}
      />

      {/* ログインモーダル */}
      <LoginPromptModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
      />

      {/* 投稿モーダル */}
      <PostModal open={showPostModal} onOpenChange={setShowPostModal} />

      {/* 利用規約・プライバシーポリシー表示 */}
      {contentView && (
        <div className="fixed inset-0 z-[70]">
          <AnimatePresence mode="wait">
            <ContentView type={contentView} onBack={handleCloseContentView} />
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
