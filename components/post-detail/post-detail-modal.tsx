"use client";

import { Post } from "@/app/actions/posts";
import { motion, PanInfo } from "framer-motion";
import Image from "next/image";
import { useState, useEffect } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ExifInfo } from "./exif-info";
import { SaveButton } from "./save-button";
import { PostActionsMenu } from "./post-actions-menu";
import { SimilarPostsCarousel } from "./similar-posts-carousel";
import { SimilarPostsSkeleton } from "./similar-posts-skeleton";
import { LoginPromptModal } from "@/components/auth/login-prompt-modal";
import { createClient } from "@/lib/supabase/client";
import { siteConfig } from "@/lib/constants/site";
import { X } from "lucide-react";
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
import { toast } from "sonner";
import { ExifData } from "@/lib/types/exif";

interface PostDetailModalProps {
  post: Post;
  initialIsSaved: boolean;
  initialIsOwner: boolean;
  onClose: () => void;
  onDeleteSuccess?: () => void;
  skipInitialAnimation?: boolean;
  similarPosts?: Post[];
  onSimilarPostClick?: (postId: string) => void;
  isSimilarPostsLoading?: boolean;
}

/**
 * SONYカメラのモデル名を読みやすい形式に変換
 */
function formatCameraModel(model: string): string {
  // ILCE-7M3 → α7III
  // ILCE-7M4 → α7IV
  // ILCE-7RM3 → α7RIII
  // ILCE-6400 → α6400
  const cameraMap: Record<string, string> = {
    "ILCE-7M3": "α7III",
    "ILCE-7M4": "α7IV",
    "ILCE-7M5": "α7V",
    "ILCE-7RM3": "α7RIII",
    "ILCE-7RM4": "α7RIV",
    "ILCE-7RM5": "α7RV",
    "ILCE-7SM3": "α7SIII",
    "ILCE-7SM4": "α7SIV",
    "ILCE-6400": "α6400",
    "ILCE-6600": "α6600",
    "ILCE-6700": "α6700",
    "ILCE-1": "α1",
    "ILCE-9": "α9",
    "ILCE-9M2": "α9II",
  };

  return cameraMap[model] || model;
}

/**
 * ExifデータからX投稿用テキストを生成（フォーマルな形式）
 */
function generateExifTextForX(
  exifData: ExifData | null,
  description?: string
): string {
  const lines: string[] = [];

  // Exifデータがある場合
  if (exifData) {
    // カメラ・レンズ行
    const equipmentParts: string[] = [];
    if (exifData.cameraModel) {
      equipmentParts.push(formatCameraModel(exifData.cameraModel));
    } else if (exifData.cameraMake) {
      equipmentParts.push(exifData.cameraMake);
    }
    if (exifData.lens) {
      equipmentParts.push(exifData.lens);
    }
    if (equipmentParts.length > 0) {
      lines.push(equipmentParts.join(" / "));
    }

    // 撮影設定行
    const settingsParts: string[] = [];
    if (exifData.iso) {
      settingsParts.push(`ISO${exifData.iso}`);
    }
    if (exifData.fValue) {
      settingsParts.push(`F${exifData.fValue}`);
    }
    if (exifData.shutterSpeed) {
      settingsParts.push(exifData.shutterSpeed);
    }
    if (settingsParts.length > 0) {
      lines.push(settingsParts.join(" / "));
    }
  }

  // 説明文がある場合は追加
  if (description) {
    if (lines.length > 0) lines.push("");
    lines.push(description);
  }

  // ハッシュタグを追加（1行にまとめる）
  if (lines.length > 0) lines.push("");
  lines.push("#カメラ初心者 #写真初心者 #カメラ好きと繋がりたい #ShotSharing");

  return lines.join("\n");
}

export function PostDetailModal({
  post,
  initialIsSaved,
  initialIsOwner,
  onClose,
  onDeleteSuccess,
  skipInitialAnimation = false,
  similarPosts = [],
  onSimilarPostClick,
  isSimilarPostsLoading = false,
}: PostDetailModalProps) {
  console.log(`🖼️ [DEBUG] PostDetailModal: レンダリング`, {
    postId: post.id,
    similarPostsCount: similarPosts.length,
    hasSimilarPostClick: !!onSimilarPostClick,
  });

  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });
  const [isMounted, setIsMounted] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  // initialIsSavedの変更を監視
  useEffect(() => {
    setIsSaved(initialIsSaved);
  }, [initialIsSaved]);

  // モバイル判定とマウント検出
  useEffect(() => {
    setIsMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 閉じる処理
  const handleClose = () => {
    console.log("🔍 [PostDetailModal] handleClose called", {
      showLoginPrompt,
      stackTrace: new Error().stack,
    });

    // ログインプロンプトが表示されている場合は閉じない
    if (showLoginPrompt) {
      console.log("⚠️ [PostDetailModal] LoginPrompt is open, ignoring close");
      return;
    }

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

  // Xで共有する処理（OGP付きリンク共有方式）
  const handleShareToX = () => {
    // Exifテキスト生成
    const exifText = generateExifTextForX(
      post.exifData,
      post.description || undefined
    );

    // 投稿詳細ページのURL
    const postUrl = `${siteConfig.url}/posts/${post.id}`;

    // X Web Intent URL
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(exifText)}&url=${encodeURIComponent(postUrl)}`;

    // 新しいウィンドウでX投稿フォームを開く
    window.open(shareUrl, "_blank", "noopener,noreferrer");
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

  // スワイプ終了時のハンドラー（スマホサイズのみ）
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    // 左から右へのスワイプで閉じる（100px以上）
    if (info.offset.x > 100) {
      onClose();
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={handleClose}
      initial={skipInitialAnimation ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* モーダルコンテナ */}
      <motion.div
        className="relative h-full w-full max-w-4xl overflow-hidden bg-background md:my-8 md:h-[calc(100vh-4rem)] md:rounded-lg"
        onClick={(e) => e.stopPropagation()}
        suppressHydrationWarning
        initial={
          skipInitialAnimation
            ? { opacity: 1, x: 0 }
            : isMobile
              ? { opacity: 1, x: "100%" }
              : { opacity: 0, x: 0 }
        }
        animate={isMobile ? { opacity: 1, x: 0 } : { opacity: 1, x: 0 }}
        exit={isMobile ? { opacity: 1, x: "100%" } : { opacity: 0, x: 0 }}
        transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
        drag={isMobile ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={isMobile ? handleDragEnd : undefined}
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
          {/* 画像エリア - スマホでは小さめ、デスクトップでは中程度 */}
          <div className="relative h-[45vh] min-h-[300px] bg-black md:h-[50vh] md:min-h-[350px]">
            {isMounted && !isMobile ? (
              // デスクトップ: ピンチズーム有効（クライアントサイドのみ）
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
              // モバイル または サーバー側/クライアント初回: 画像固定
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
            className="space-y-6 p-6 pb-24 md:pb-6"
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
                <PostActionsMenu
                  onDeleteClick={() => setShowDeleteAlert(true)}
                  onShareToXClick={handleShareToX}
                />
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

            {/* 類似作例セクション */}
            {onSimilarPostClick &&
              (isSimilarPostsLoading ? (
                <SimilarPostsSkeleton />
              ) : (
                <SimilarPostsCarousel
                  posts={similarPosts}
                  onPostClick={onSimilarPostClick}
                />
              ))}
          </motion.div>
        </div>
      </motion.div>

      {/* ログイン促進モーダル */}
      <LoginPromptModal
        open={showLoginPrompt}
        onOpenChange={setShowLoginPrompt}
        context="save"
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
