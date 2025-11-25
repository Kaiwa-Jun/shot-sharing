"use client";

import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function AuthCallbackClient() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");

      if (code) {
        const supabase = createClient();
        await supabase.auth.exchangeCodeForSession(code);
      }

      // 認証後は常にホーム画面（一覧画面）にリダイレクト
      // 理由: モバイルブラウザでのOAuth認証フロー後、ブラウザバックで
      //       Google認証画面に戻ってしまう問題を回避するため。
      //       詳細画面から認証した場合でも、一覧画面に戻すことで
      //       ユーザーは左スワイプで期待通りの遷移（一覧→詳細）を実現できる。
      // セキュリティ: nextパラメータを無視することで、オープンリダイレクト
      //               脆弱性も防止できる。
      window.location.replace("/");
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
