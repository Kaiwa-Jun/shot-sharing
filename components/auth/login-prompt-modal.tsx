"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePathname } from "next/navigation";
import { AuthTabs } from "./auth-tabs";
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
  const [view, setView] = useState<"login" | "terms" | "privacy">("login");
  const [isExiting, setIsExiting] = useState(false);
  const [currentTab, setCurrentTab] = useState<"login" | "signup">("login");
  const [previousTab, setPreviousTab] = useState<"login" | "signup">("login");

  const handleTermsClick = () => {
    setPreviousTab(currentTab);
    setView("terms");
  };

  const handlePrivacyClick = () => {
    setPreviousTab(currentTab);
    setView("privacy");
  };

  const handleBackToAuth = () => {
    setIsExiting(true);
  };

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    // モーダルが閉じられたらログインビューに戻す
    if (!open) {
      setView("login");
      setCurrentTab("login");
    }
  };

  // 利用規約・プライバシーポリシービューの場合
  if (view === "terms" || view === "privacy") {
    return (
      <div
        className="fixed inset-0 z-[70]"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <AnimatePresence
          mode="wait"
          onExitComplete={() => {
            if (isExiting) {
              setView("login");
              setCurrentTab(previousTab);
              setIsExiting(false);
            }
          }}
        >
          {!isExiting && (
            <ContentView key={view} type={view} onBack={handleBackToAuth} />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // 文言を条件分岐
  const title = context === "save" ? "ログインが必要です" : "Shot Sharing";
  const description =
    context === "save"
      ? "作例を保存するには、ログインが必要です。"
      : "アカウントをお持ちでない方は新規登録してください。";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <AuthTabs
          activeTab={currentTab}
          onTabChange={setCurrentTab}
          onClose={() => handleOpenChange(false)}
          redirectPath={pathname || "/"}
          onTermsClick={handleTermsClick}
          onPrivacyClick={handlePrivacyClick}
        />
      </DialogContent>
    </Dialog>
  );
}
