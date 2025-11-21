"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ContentView } from "@/app/@modal/(.)me/content-view";

interface LoginPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: "default" | "save";
}

export function LoginPromptModal({
  open,
  onOpenChange,
  context = "default",
}: LoginPromptModalProps) {
  const pathname = usePathname();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<"login" | "terms" | "privacy">("login");

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      const redirectPath = pathname || "/";

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectPath)}`,
        },
      });

      if (error) {
        console.error("ログインエラー:", error);
        alert("ログインに失敗しました。もう一度お試しください。");
        setIsLoading(false);
      }
      // OAuth遷移が成功した場合、setIsLoadingは不要（ページ遷移するため）
    } catch (error) {
      console.error("ログインエラー:", error);
      alert("ログインに失敗しました。もう一度お試しください。");
      setIsLoading(false);
    }
  };

  const handleTermsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setView("terms");
  };

  const handlePrivacyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setView("privacy");
  };

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    // モーダルが閉じられたらログインビューに戻す
    if (!open) {
      setView("login");
    }
  };

  // 利用規約・プライバシーポリシービューの場合
  if (view === "terms" || view === "privacy") {
    return (
      <div
        className="fixed inset-0 z-50 bg-background"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <AnimatePresence mode="wait">
          <ContentView key={view} type={view} onBack={() => setView("login")} />
        </AnimatePresence>
      </div>
    );
  }

  // 文言を条件分岐
  const title = context === "save" ? "ログインが必要です" : "Shot Sharing";
  const description =
    context === "save" ? "作例を保存するには、ログインが必要です。" : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>
              {description}
              <br />
              Googleアカウントでログインしてください。
            </DialogDescription>
          )}
          {!description && (
            <DialogDescription>
              Googleアカウントでログインしてください。
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-4">
          <Button onClick={handleLogin} disabled={isLoading} className="w-full">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ログイン中...
              </span>
            ) : (
              "Googleでログイン"
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="w-full"
            disabled={isLoading}
          >
            キャンセル
          </Button>
        </div>

        {/* 利用規約・プライバシーポリシーへのリンク */}
        <div className="border-t pt-4">
          <p className="text-center text-xs text-muted-foreground">
            ログインすることで、
            <button
              onClick={handleTermsClick}
              className="underline hover:text-foreground"
            >
              利用規約
            </button>
            と
            <button
              onClick={handlePrivacyClick}
              className="underline hover:text-foreground"
            >
              プライバシーポリシー
            </button>
            に同意したものとみなされます。
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
