"use client";

import { useState, useRef, ChangeEvent } from "react";
import Image from "next/image";
import { Camera, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  onImageClear: () => void;
}

/**
 * HEICファイルかどうかを判定
 */
function isHeicFile(file: File): boolean {
  // MIMEタイプでの判定
  if (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.type === "image/heic-sequence" ||
    file.type === "image/heif-sequence"
  ) {
    return true;
  }

  // 拡張子での判定（MIMEタイプが空の場合がある）
  const extension = file.name.toLowerCase().split(".").pop();
  return extension === "heic" || extension === "heif";
}

export function ImageUpload({ onImageSelect, onImageClear }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 画像形式のバリデーション（HEICも許可）
    const isHeicImage = isHeicFile(file);
    if (!file.type.startsWith("image/") && !isHeicImage) {
      toast.error("画像ファイルを選択してください");
      return;
    }

    // ファイルサイズのバリデーション（10MB以下）
    if (file.size > 10 * 1024 * 1024) {
      toast.error("ファイルサイズは10MB以下にしてください");
      return;
    }

    setSelectedFileName(file.name);

    // プレビュー表示
    if (isHeicImage) {
      // HEICの場合はサーバーサイドで変換してプレビュー表示
      setIsConverting(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/preview/heic", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("プレビュー変換に失敗しました");
        }

        const { dataUrl } = await response.json();
        setPreview(dataUrl);
      } catch (error) {
        console.error("HEIC変換エラー:", error);
        // 変換失敗時はプレビューなしで続行
        toast.info("プレビューを表示できませんが、投稿は可能です");
      } finally {
        setIsConverting(false);
      }
    } else {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }

    // 親コンポーネントに通知（元のファイルを渡す）
    onImageSelect(file);
  };

  const handleClear = () => {
    // プレビューURLをクリーンアップ
    if (preview && preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setIsConverting(false);
    setSelectedFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onImageClear();
  };

  // 表示状態を判定
  const hasSelectedFile = preview || isConverting || selectedFileName;

  return (
    <div className="w-full">
      {!hasSelectedFile ? (
        // ファイル未選択: 選択画面を表示
        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-gray-400"
        >
          <Camera className="mb-2 h-12 w-12 text-gray-400" />
          <p className="text-sm text-gray-600">画像を選択</p>
          <p className="mt-1 text-xs text-gray-400">またはドラッグ&ドロップ</p>
        </div>
      ) : isConverting ? (
        // HEIC変換中: ローディング表示
        <div className="relative w-full">
          <div className="relative flex h-96 w-full flex-col items-center justify-center rounded-lg bg-gray-100">
            <Loader2 className="mb-4 h-12 w-12 animate-spin text-gray-400" />
            <p className="font-medium text-gray-600">画像を変換中...</p>
            <p className="mt-1 text-sm text-gray-500">{selectedFileName}</p>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute right-2 top-2"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : !preview && selectedFileName ? (
        // プレビュー失敗時: ファイル名のみ表示
        <div className="relative w-full">
          <div className="relative flex h-96 w-full flex-col items-center justify-center rounded-lg bg-gray-100">
            <Camera className="mb-4 h-16 w-16 text-gray-400" />
            <p className="font-medium text-gray-600">{selectedFileName}</p>
            <p className="mt-2 text-xs text-gray-400">
              プレビューは表示されませんが、投稿可能です
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute right-2 top-2"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        // 通常ファイル選択済み: 画像プレビューを表示
        <div className="relative w-full">
          <div className="relative h-96 w-full">
            <Image
              src={preview!}
              alt="選択した画像"
              fill
              className="rounded-lg object-contain"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute right-2 top-2"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
