"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PostForm } from "./post-form";

interface PostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PostModal({ open, onOpenChange }: PostModalProps) {
  const router = useRouter();

  const handleSuccess = () => {
    console.log(
      "🎉 [DEBUG] PostModal.handleSuccess開始:",
      new Date().toISOString()
    );
    // ページをリフレッシュして最新の投稿を表示
    console.log(
      "🔄 [DEBUG] router.refresh呼び出し前:",
      new Date().toISOString()
    );
    router.refresh();
    console.log(
      "🔄 [DEBUG] router.refresh呼び出し後:",
      new Date().toISOString()
    );
    // モーダルを閉じる
    console.log(
      "🚪 [DEBUG] onOpenChange(false)呼び出し前:",
      new Date().toISOString()
    );
    onOpenChange(false);
    console.log(
      "🚪 [DEBUG] onOpenChange(false)呼び出し後:",
      new Date().toISOString()
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">新規投稿</DialogTitle>
        </DialogHeader>
        <PostForm
          onSuccess={handleSuccess}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
