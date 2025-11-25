"use client";

import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { UploadStatus, UploadStage } from "./upload-status";

interface UploadProgressOverlayProps {
  stage: UploadStage;
  progress: number;
}

export function UploadProgressOverlay({
  stage,
  progress,
}: UploadProgressOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6 shadow-lg"
      >
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">投稿を処理中</h3>
          <p className="text-sm text-muted-foreground">
            しばらくお待ちください...
          </p>
        </div>

        <Progress value={progress} className="h-3" />

        <UploadStatus currentStage={stage} progress={progress} />
      </motion.div>
    </motion.div>
  );
}
