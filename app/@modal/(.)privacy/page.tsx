"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, PanInfo } from "framer-motion";
import { useRouter } from "next/navigation";

export default function InterceptedPrivacyPage() {
  const router = useRouter();
  const [content, setContent] = useState<string>("");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [dragX, setDragX] = useState(0);

  useEffect(() => {
    async function fetchContent() {
      try {
        setIsLoading(true);
        const response = await fetch("/content/privacy.md");
        if (response.ok) {
          const markdownText = await response.text();
          setContent(markdownText);

          const lines = markdownText.split("\n");
          const lastUpdatedLine = lines.find((line) =>
            line.startsWith("最終更新日:")
          );
          if (lastUpdatedLine) {
            setLastUpdated(lastUpdatedLine.replace("最終更新日:", "").trim());
          }
        }
      } catch (error) {
        console.error("Failed to load content:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchContent();
  }, []);

  // フッターからのナビゲーションイベントをリッスン
  useEffect(() => {
    const handleModalNavigate = (event: CustomEvent<{ targetUrl: string }>) => {
      const url = event.detail.targetUrl;
      if (url === "/") {
        // ホームへはスライドアウト後にrouter.back()（背景がホーム画面なので）
        setIsExiting(true);
        setTimeout(() => {
          router.back();
        }, 300);
      } else {
        // /me へは直接フルページナビゲーション（背景を経由しない）
        window.location.href = url;
      }
    };

    window.addEventListener(
      "modalNavigate",
      handleModalNavigate as EventListener
    );
    return () => {
      window.removeEventListener(
        "modalNavigate",
        handleModalNavigate as EventListener
      );
    };
  }, [router]);

  const handleBack = () => {
    setIsExiting(true);
    setTimeout(() => {
      router.back();
    }, 300);
  };

  const handleDrag = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 0) {
      setDragX(info.offset.x);
    }
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 100 || info.velocity.x > 500) {
      handleBack();
    } else {
      setDragX(0);
    }
  };

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={isExiting ? { x: "100%", opacity: 0 } : { x: dragX, opacity: 1 }}
      transition={{ type: "tween", duration: 0.3 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0, right: 0.5 }}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      className="fixed inset-0 z-[70] bg-background"
    >
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4">
          <button
            onClick={handleBack}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold">
            プライバシーポリシー
          </h1>
          <div className="w-10" />
        </div>
      </header>

      {/* コンテンツ */}
      <div className="h-full overflow-y-auto pb-20">
        {isLoading ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="container mx-auto px-4 py-8">
            <article className="prose prose-slate mx-auto max-w-4xl dark:prose-invert lg:prose-lg">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </article>

            {lastUpdated && (
              <div className="mx-auto mt-12 max-w-4xl border-t pt-6 text-center text-sm text-muted-foreground">
                最終更新日: {lastUpdated}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
