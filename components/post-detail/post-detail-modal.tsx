"use client";

import { Post } from "@/app/actions/posts";
import { motion } from "framer-motion";
import Image from "next/image";
import { useState, useEffect } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ExifInfo } from "./exif-info";
import { SaveButton } from "./save-button";
import { LoginPromptModal } from "@/components/auth/login-prompt-modal";
import { createClient } from "@/lib/supabase/client";
import { X, MoreHorizontal, Trash2, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deletePost } from "@/app/actions/posts";
import { useRouter } from "next/navigation";

interface PostDetailModalProps {
  post: Post;
  initialIsSaved: boolean;
  initialIsOwner: boolean;
  onClose: () => void;
  onDeleteSuccess?: () => void;
  skipAnimation?: boolean;
}

export function PostDetailModal({
  post,
  initialIsSaved,
  initialIsOwner,
  onClose,
  onDeleteSuccess,
  skipAnimation = false,
}: PostDetailModalProps) {
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  // initialIsSavedの変更を監視
  useEffect(() => {
    setIsSaved(initialIsSaved);
  }, [initialIsSaved]);

  // モバイル判定
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 閉じる処理
  const handleClose = () => {
    onClose();
  };

  // 保存ボタンのクリック処理
  const handleSaveClick = async () => {
    try {
      // 認証状態をチェック
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 未認証の場合はログイン促進モーダルを表示
      if (!user) {
        setShowLoginPrompt(true);
        return;
      }

      // 認証済みの場合は保存処理を実行
      const response = await fetch("/api/saves/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ postId: post.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle save");
      }

      const data = await response.json();
      setIsSaved(data.saved);
    } catch (error) {
      console.error("Error toggling save:", error);
    }
  };

  // 削除処理
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deletePost(post.id);

      if (onDeleteSuccess) {
        onDeleteSuccess();
      } else {
        onClose();
        // 削除後はリフレッシュして一覧を更新
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to delete post:", error);
      alert("投稿の削除に失敗しました");
    } finally {
      setIsDeleting(false);
      setShowDeleteAlert(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={handleClose}
      initial={skipAnimation ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={
        skipAnimation ? { duration: 0 } : { duration: 0.4, ease: "easeOut" }
      }
    >
      {/* モーダルコンテナ */}
      <motion.div
        className="relative h-full w-full max-w-4xl overflow-hidden bg-background"
        onClick={(e) => e.stopPropagation()}
        initial={
          skipAnimation
            ? { opacity: 1, x: 0 }
            : isMobile
              ? { opacity: 1, x: "100%" }
              : { opacity: 0, x: 0 }
        }
        animate={isMobile ? { opacity: 1, x: 0 } : { opacity: 1, x: 0 }}
        exit={isMobile ? { opacity: 1, x: "100%" } : { opacity: 0, x: 0 }}
        transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
      >
        {/* 閉じるボタン */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
        >
          <X className="h-5 w-5" />
        </button>

        {/* スクロール可能なコンテンツエリア */}
        <div className="h-full overflow-y-auto">
          {/* 画像エリア */}
          <div className="relative h-[60vh] min-h-[400px] bg-black">
            {!isMobile ? (
              // デスクトップ: ピンチズーム有効
              <TransformWrapper
                initialScale={1}
                minScale={1}
                maxScale={4}
                centerOnInit
              >
                <TransformComponent
                  wrapperClass="!w-full !h-full"
                  contentClass="!w-full !h-full flex items-center justify-center"
                >
                  <div className="relative flex h-full w-full items-center justify-center">
                    <Image
                      src={post.imageUrl}
                      alt={post.description || "Photo"}
                      width={post.width || 800}
                      height={post.height || 1200}
                      className="max-h-full max-w-full object-contain"
                      priority
                      unoptimized
                    />
                  </div>
                </TransformComponent>
              </TransformWrapper>
            ) : (
              // モバイル: 画像固定（ピンチズーム無効）
              <div className="flex h-full w-full items-center justify-center">
                <div className="relative flex h-full w-full items-center justify-center">
                  <Image
                    src={post.imageUrl}
                    alt={post.description || "Photo"}
                    width={post.width || 800}
                    height={post.height || 1200}
                    className="max-h-full max-w-full object-contain"
                    priority
                    unoptimized
                  />
                </div>
              </div>
            )}
          </div>

          {/* コンテンツエリア */}
          <motion.div
            className="space-y-6 p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            {/* Exif情報と保存ボタン */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                {post.exifData && <ExifInfo exifData={post.exifData} />}
              </div>
              {initialIsOwner ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
                      aria-label="メニュー"
                    >
                      <MoreHorizontal className="h-6 w-6" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem disabled>
                      <Edit className="mr-2 h-4 w-4" />
                      <span>編集（近日公開）</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={() => setShowDeleteAlert(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>削除</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <SaveButton isSaved={isSaved} onClick={handleSaveClick} />
              )}
            </div>

            {/* 説明文 */}
            {post.description && (
              <div className="text-sm text-muted-foreground">
                {post.description}
              </div>
            )}

            {/* 類似作例セクション（仮表示） */}
            <div className="border-t pt-6">
              <h3 className="mb-4 text-lg font-semibold">類似の作例</h3>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {/* プレースホルダー */}
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-32 w-24 flex-shrink-0 rounded bg-muted"
                  />
                ))}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                ※ 類似作例の表示は今後実装予定です
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ログイン促進モーダル */}
      <LoginPromptModal
        open={showLoginPrompt}
        onOpenChange={setShowLoginPrompt}
      />

      {/* 削除確認アラート */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>投稿を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。投稿は完全に削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
