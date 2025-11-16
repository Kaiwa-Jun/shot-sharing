"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "./image-upload";
import { ExifDisplay } from "./exif-display";
import { extractExifData } from "@/lib/image/exif";
import { createPost } from "@/app/actions/posts";
import { ExifData } from "@/lib/types/exif";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      alert("画像を選択してください");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("description", description);

      const result = await createPost(formData);

      if (result.success) {
        if (!result.fileSearchSuccess) {
          alert(
            "投稿は成功しましたが、検索機能への登録に失敗しました。後で再試行されます。"
          );
        }

        // 成功時のコールバックまたはページ遷移
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/");
        }
      }
    } catch (error) {
      console.error("投稿に失敗しました:", error);
      alert(
        error instanceof Error
          ? error.message
          : "投稿に失敗しました。もう一度お試しください。"
      );
    } finally {
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
          {isSubmitting ? "投稿中..." : "公開"}
        </Button>
      </div>
    </form>
  );
}
