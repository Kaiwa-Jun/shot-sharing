"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Home,
  User,
  Edit,
  FileText,
  Lock,
  LogOut,
  LogIn,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface MenuSidebarProps {
  open: boolean;
  onClose: () => void;
  user: SupabaseUser | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onTermsClick: () => void;
  onPrivacyClick: () => void;
  onResetSearch?: () => void;
}

export function MenuSidebar({
  open,
  onClose,
  user,
  onLoginClick,
  onLogoutClick,
  onTermsClick,
  onPrivacyClick,
  onResetSearch,
}: MenuSidebarProps) {
  const router = useRouter();

  const handleNavigation = (path: string) => {
    // ホームボタンを押した時は検索状態をリセット
    if (path === "/" && onResetSearch) {
      onResetSearch();
    }
    router.push(path);
    onClose();
  };

  const handleLogin = () => {
    onLoginClick();
    onClose();
  };

  const handleLogout = () => {
    onLogoutClick();
    onClose();
  };

  const handleTerms = () => {
    onTermsClick();
    onClose();
  };

  const handlePrivacy = () => {
    onPrivacyClick();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* オーバーレイ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* サイドバー */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 z-[70] h-full w-72 bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex h-14 items-center justify-between border-b px-4">
              <h2 className="text-lg font-semibold">メニュー</h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* メニュー項目 */}
            <nav className="flex flex-col p-2">
              {/* ホーム */}
              <button
                onClick={() => handleNavigation("/")}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-muted"
              >
                <Home className="h-5 w-5" />
                <span>ホーム</span>
              </button>

              {user ? (
                <>
                  {/* マイページ */}
                  <button
                    onClick={() => handleNavigation("/me")}
                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-muted"
                  >
                    <User className="h-5 w-5" />
                    <span>マイページ</span>
                  </button>

                  {/* プロフィール編集 */}
                  <button
                    onClick={() => handleNavigation("/me/edit")}
                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-muted"
                  >
                    <Edit className="h-5 w-5" />
                    <span>プロフィール編集</span>
                  </button>

                  {/* 区切り線 */}
                  <div className="my-2 border-t" />

                  {/* 利用規約 */}
                  <button
                    onClick={handleTerms}
                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-muted"
                  >
                    <FileText className="h-5 w-5" />
                    <span>利用規約</span>
                  </button>

                  {/* プライバシーポリシー */}
                  <button
                    onClick={handlePrivacy}
                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-muted"
                  >
                    <Lock className="h-5 w-5" />
                    <span>プライバシーポリシー</span>
                  </button>

                  {/* 区切り線 */}
                  <div className="my-2 border-t" />

                  {/* ログアウト */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-left text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>ログアウト</span>
                  </button>
                </>
              ) : (
                <>
                  {/* 新規登録/ログイン */}
                  <button
                    onClick={handleLogin}
                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-muted"
                  >
                    <LogIn className="h-5 w-5" />
                    <span>新規登録/ログイン</span>
                  </button>

                  {/* 区切り線 */}
                  <div className="my-2 border-t" />

                  {/* 利用規約 */}
                  <button
                    onClick={handleTerms}
                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-muted"
                  >
                    <FileText className="h-5 w-5" />
                    <span>利用規約</span>
                  </button>

                  {/* プライバシーポリシー */}
                  <button
                    onClick={handlePrivacy}
                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-muted"
                  >
                    <Lock className="h-5 w-5" />
                    <span>プライバシーポリシー</span>
                  </button>
                </>
              )}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
