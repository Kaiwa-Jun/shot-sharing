"use client";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">新規投稿</DialogTitle>
        </DialogHeader>
        <PostForm
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
