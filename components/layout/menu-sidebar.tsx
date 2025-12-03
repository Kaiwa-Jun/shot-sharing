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
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface MenuSidebarProps {
  open: boolean;
  onClose: () => void;
  user: SupabaseUser | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onResetSearch?: () => void;
}

export function MenuSidebar({
  open,
  onClose,
  user,
  onLoginClick,
  onLogoutClick,
  onResetSearch,
}: MenuSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);

  // /me画面ではデスクトップサイドバーを非表示
  const shouldHideDesktopSidebar =
    pathname === "/me" || pathname === "/me/edit";

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
    router.push("/terms");
    onClose();
  };

  const handlePrivacy = () => {
    router.push("/privacy");
    onClose();
  };

  return (
    <>
      {/* モバイル用サイドバー（xl未満） */}
      <AnimatePresence>
        {open && (
          <>
            {/* オーバーレイ */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm xl:hidden"
              onClick={onClose}
            />

            {/* サイドバー */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 z-[70] h-full w-72 bg-background shadow-xl xl:hidden"
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

      {/* デスクトップ用サイドバー（xl以上、常時表示） */}
      {!shouldHideDesktopSidebar && (
        <motion.div
          onMouseEnter={() => setIsExpanded(true)}
          onMouseLeave={() => setIsExpanded(false)}
          animate={{ width: isExpanded ? 288 : 64 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="fixed left-0 top-0 z-[60] hidden h-full overflow-hidden border-r border-border bg-background shadow-sm xl:block"
        >
          {/* メニュー項目 */}
          <nav className="flex flex-col gap-1 p-2 pt-16">
            {/* ホーム */}
            <button
              onClick={() => handleNavigation("/")}
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-muted"
            >
              <Home className="h-5 w-5 shrink-0" />
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: isExpanded ? 1 : 0 }}
                transition={{ duration: 0.2 }}
                className="whitespace-nowrap"
              >
                ホーム
              </motion.span>
            </button>

            {user ? (
              <>
                {/* マイページ */}
                <button
                  onClick={() => handleNavigation("/me")}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-muted"
                >
                  <User className="h-5 w-5 shrink-0" />
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isExpanded ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="whitespace-nowrap"
                  >
                    マイページ
                  </motion.span>
                </button>

                {/* プロフィール編集 */}
                <button
                  onClick={() => handleNavigation("/me/edit")}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-muted"
                >
                  <Edit className="h-5 w-5 shrink-0" />
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isExpanded ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="whitespace-nowrap"
                  >
                    プロフィール編集
                  </motion.span>
                </button>

                {/* 利用規約 */}
                <button
                  onClick={handleTerms}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-muted"
                >
                  <FileText className="h-5 w-5 shrink-0" />
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isExpanded ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="whitespace-nowrap"
                  >
                    利用規約
                  </motion.span>
                </button>

                {/* プライバシーポリシー */}
                <button
                  onClick={handlePrivacy}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-muted"
                >
                  <Lock className="h-5 w-5 shrink-0" />
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isExpanded ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="whitespace-nowrap"
                  >
                    プライバシーポリシー
                  </motion.span>
                </button>

                {/* ログアウト */}
                <button
                  onClick={handleLogout}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
                    isExpanded
                      ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                      : "hover:bg-muted"
                  }`}
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isExpanded ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="whitespace-nowrap"
                  >
                    ログアウト
                  </motion.span>
                </button>
              </>
            ) : (
              <>
                {/* 新規登録/ログイン */}
                <button
                  onClick={handleLogin}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-muted"
                >
                  <LogIn className="h-5 w-5 shrink-0" />
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isExpanded ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="whitespace-nowrap"
                  >
                    新規登録/ログイン
                  </motion.span>
                </button>

                {/* 利用規約 */}
                <button
                  onClick={handleTerms}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-muted"
                >
                  <FileText className="h-5 w-5 shrink-0" />
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isExpanded ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="whitespace-nowrap"
                  >
                    利用規約
                  </motion.span>
                </button>

                {/* プライバシーポリシー */}
                <button
                  onClick={handlePrivacy}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-muted"
                >
                  <Lock className="h-5 w-5 shrink-0" />
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isExpanded ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="whitespace-nowrap"
                  >
                    プライバシーポリシー
                  </motion.span>
                </button>
              </>
            )}
          </nav>
        </motion.div>
      )}
    </>
  );
}
