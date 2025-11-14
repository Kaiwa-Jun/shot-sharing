"use client";

import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const next = searchParams.get("next") || "/";

      if (code) {
        const supabase = createClient();
        await supabase.auth.exchangeCodeForSession(code);
      }

      // window.location.replace()を使用してブラウザレベルで履歴を置き換える
      // これにより、OAuthフローの履歴が完全に消え、ブラウザバックで
      // Google認証画面に戻る問題が解消される
      window.location.replace(next);
    };

    handleCallback();
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">ログイン中...</p>
      </div>
    </div>
  );
}
