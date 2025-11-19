"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Profile page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4">
          <button
            onClick={() => router.push("/")}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold">プロフィール</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* エラー表示 */}
      <div className="flex flex-col items-center justify-center px-4 py-16">
        <h2 className="mb-2 text-lg font-semibold">
          プロフィールの読み込みに失敗しました
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          一時的な問題が発生しています。しばらく経ってから再度お試しください。
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/")}>
            ホームに戻る
          </Button>
          <Button onClick={reset}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            再読み込み
          </Button>
        </div>
      </div>
    </div>
  );
}
