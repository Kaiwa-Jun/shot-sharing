"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "./image-upload";
import { ExifDisplay } from "./exif-display";
import { extractExifData } from "@/lib/image/exif";
import { createPost } from "@/app/actions/posts";
import { ExifData } from "@/lib/types/exif";
import { toast } from "sonner";
import { UploadProgressOverlay } from "./upload-progress-overlay";
import { UploadStage } from "./upload-status";
import { Loader2 } from "lucide-react";

interface PostFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PostForm({ onSuccess, onCancel }: PostFormProps = {}) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [exifData, setExifData] = useState<ExifData | null>(null);
  const [description, setDescription] = useState("");
  const [isLoadingExif, setIsLoadingExif] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>("processing");
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleImageSelect = async (file: File) => {
    setSelectedFile(file);
    setIsLoadingExif(true);

    try {
      const exif = await extractExifData(file);
      setExifData(exif);
    } catch (error) {
      console.error("Exif情報の抽出に失敗しました:", error);
    } finally {
      setIsLoadingExif(false);
    }
  };

  const handleImageClear = () => {
    setSelectedFile(null);
    setExifData(null);
  };

  // タイマーベースの進捗管理
  useEffect(() => {
    if (!isSubmitting) {
      // リセット
      setUploadProgress(0);
      setUploadStage("processing");
      return;
    }

    // 処理段階のタイミング（調査結果に基づく）
    const stages: Array<{
      delay: number;
      stage: UploadStage;
      progress: number;
    }> = [
      { delay: 0, stage: "processing", progress: 10 }, // 開始
      { delay: 2000, stage: "uploading", progress: 30 }, // 2秒後: アップロード開始
      { delay: 6000, stage: "ai-processing", progress: 60 }, // 6秒後: AI処理開始
    ];

    const timers: NodeJS.Timeout[] = [];

    stages.forEach(({ delay, stage, progress }) => {
      const timer = setTimeout(() => {
        setUploadStage(stage);
        setUploadProgress(progress);
      }, delay);
      timers.push(timer);
    });

    // プログレスバーのスムーズな進行（0.5秒ごとに少しずつ増加）
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        // 最大85%まで（完了時に100%にする）
        if (prev >= 85) return prev;
        return prev + 1;
      });
    }, 500);
    timers.push(progressInterval);

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [isSubmitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error("画像を選択してください");
      return;
    }

    console.log("📝 [DEBUG] handleSubmit開始:", new Date().toISOString());
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("description", description);

      console.log("📤 [DEBUG] createPost呼び出し前:", new Date().toISOString());
      const result = await createPost(formData);
      console.log(
        "📥 [DEBUG] createPost完了:",
        new Date().toISOString(),
        result
      );

      if (result.success) {
        console.log(
          "✅ [DEBUG] 投稿成功 - onSuccess呼び出し前:",
          new Date().toISOString()
        );

        // 完了状態に更新
        setUploadStage("completed");
        setUploadProgress(100);

        // 成功トースト表示
        toast.success("投稿が完了しました！", {
          description: "あなたの投稿が公開されました",
        });

        // 少し待ってからページ遷移（成功アニメーションを見せる）
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // 成功時のコールバックまたはページ遷移
        if (onSuccess) {
          onSuccess();
        } else {
          console.log(
            "🔄 [DEBUG] router.push+refresh開始:",
            new Date().toISOString()
          );
          router.push("/");
          router.refresh();
          console.log(
            "🔄 [DEBUG] router.push+refresh完了:",
            new Date().toISOString()
          );
        }
      }
    } catch (error) {
      console.error("投稿に失敗しました:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "投稿に失敗しました。もう一度お試しください。"
      );
    } finally {
      console.log("🏁 [DEBUG] handleSubmit終了:", new Date().toISOString());
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (
      selectedFile &&
      !confirm("編集中の内容が破棄されますがよろしいですか?")
    ) {
      return;
    }

    // キャンセル時のコールバックまたはページ遷移
    if (onCancel) {
      onCancel();
    } else {
      router.push("/");
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 画像アップロード */}
        <ImageUpload
          onImageSelect={handleImageSelect}
          onImageClear={handleImageClear}
        />

        {/* Exif情報表示 */}
        {selectedFile && (
          <ExifDisplay exif={exifData} isLoading={isLoadingExif} />
        )}

        {/* 説明文入力 */}
        {selectedFile && (
          <div className="space-y-2">
            <label
              htmlFor="description"
              className="block font-semibold text-gray-900"
            >
              📝 ひとこと（任意）
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="撮影時の状況や工夫を共有..."
              rows={4}
              className="w-full"
            />
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="flex-1"
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={!selectedFile || isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "投稿中..." : "公開"}
          </Button>
        </div>
      </form>

      {/* プログレスオーバーレイ */}
      {isSubmitting && (
        <UploadProgressOverlay stage={uploadStage} progress={uploadProgress} />
      )}
    </>
  );
}
