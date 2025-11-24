"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check } from "lucide-react";

interface ShareTextPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialText: string;
}

export function ShareTextPreviewModal({
  open,
  onOpenChange,
  initialText,
}: ShareTextPreviewModalProps) {
  const [text, setText] = useState(initialText);
  const [copied, setCopied] = useState(false);

  // initialTextが変更されたらtextを更新
  useEffect(() => {
    if (open && initialText) {
      setText(initialText);
      setCopied(false);
    }
  }, [open, initialText]);

  // テキストが変更されたときに状態を更新
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setCopied(false); // テキストが変更されたらコピー状態をリセット
  };

  // クリップボードにコピー
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // 2秒後にリセット
    } catch (error) {
      console.error("クリップボードへのコピーに失敗しました:", error);
    }
  };

  // モーダルが開かれたときに初期テキストをリセット
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[500px]"
        onClick={(e) => {
          e.stopPropagation();
        }}
        onPointerDownOutside={(e) => {
          // テキストエリアやボタンをクリックしてもモーダルが閉じないようにする
          e.preventDefault();
        }}
        onInteractOutside={(e) => {
          // 外側クリック時にモーダルを閉じる
          const target = e.target as HTMLElement;
          // DialogContent内の要素の場合は閉じない
          if (target.closest('[role="dialog"]')) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>X投稿用テキスト</DialogTitle>
          <DialogDescription>
            テキストを編集して、コピーボタンでクリップボードにコピーできます
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Textarea
            value={text}
            onChange={handleTextChange}
            className="min-h-[150px] resize-none font-mono text-sm"
            placeholder="テキストを入力..."
          />
          <Button
            onClick={handleCopy}
            className="w-full"
            variant={copied ? "outline" : "default"}
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                コピーしました
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                クリップボードにコピー
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
