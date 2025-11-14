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

interface LoginPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginPromptModal({
  open,
  onOpenChange,
}: LoginPromptModalProps) {
  const pathname = usePathname();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ログインが必要です</DialogTitle>
          <DialogDescription>
            作例を保存するには、ログインが必要です。
            <br />
            Googleアカウントでログインしてください。
          </DialogDescription>
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
            onClick={() => onOpenChange(false)}
            className="w-full"
            disabled={isLoading}
          >
            キャンセル
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
