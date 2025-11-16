"use client";

import { useState, useRef, ChangeEvent } from "react";
import Image from "next/image";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  onImageClear: () => void;
}

export function ImageUpload({ onImageSelect, onImageClear }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 画像形式のバリデーション
    if (!file.type.startsWith("image/")) {
      alert("画像ファイルを選択してください");
      return;
    }

    // ファイルサイズのバリデーション（10MB以下）
    if (file.size > 10 * 1024 * 1024) {
      alert("ファイルサイズは10MB以下にしてください");
      return;
    }

    // プレビュー表示
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // 親コンポーネントに通知
    onImageSelect(file);
  };

  const handleClear = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onImageClear();
  };

  return (
    <div className="w-full">
      {!preview ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-gray-400"
        >
          <Camera className="mb-2 h-12 w-12 text-gray-400" />
          <p className="text-sm text-gray-600">画像を選択</p>
          <p className="mt-1 text-xs text-gray-400">またはドラッグ&ドロップ</p>
        </div>
      ) : (
        <div className="relative w-full">
          <div className="relative h-96 w-full">
            <Image
              src={preview}
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
