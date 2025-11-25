"use client";

import { motion } from "framer-motion";
import {
  ImageIcon,
  Upload,
  Sparkles,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type UploadStage =
  | "processing"
  | "uploading"
  | "ai-processing"
  | "completed";

interface UploadStatusProps {
  currentStage: UploadStage;
  progress: number;
}

const stages = [
  {
    id: "processing" as const,
    label: "画像を処理中",
    icon: ImageIcon,
    description: "Exif情報を抽出しています",
  },
  {
    id: "uploading" as const,
    label: "アップロード中",
    icon: Upload,
    description: "画像をアップロードしています",
  },
  {
    id: "ai-processing" as const,
    label: "AI分析中",
    icon: Sparkles,
    description: "キャプションを生成しています",
  },
  {
    id: "completed" as const,
    label: "完了",
    icon: CheckCircle2,
    description: "投稿が完了しました",
  },
];

export function UploadStatus({ currentStage, progress }: UploadStatusProps) {
  const currentStageIndex = stages.findIndex(
    (stage) => stage.id === currentStage
  );

  return (
    <div className="w-full space-y-4">
      {stages.map((stage, index) => {
        const Icon = stage.icon;
        const isCompleted = index < currentStageIndex;
        const isCurrent = index === currentStageIndex;
        const isPending = index > currentStageIndex;

        return (
          <motion.div
            key={stage.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "flex items-start gap-3 rounded-lg p-3 transition-colors",
              isCurrent && "bg-primary/10",
              isCompleted && "bg-muted/50",
              isPending && "opacity-50"
            )}
          >
            <div className="mt-0.5 flex-shrink-0">
              {isCompleted && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </motion.div>
              )}
              {isCurrent && (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              )}
              {isPending && <Icon className="h-5 w-5 text-muted-foreground" />}
            </div>

            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "text-sm font-medium",
                  isCurrent && "text-primary",
                  isCompleted && "text-muted-foreground",
                  isPending && "text-muted-foreground"
                )}
              >
                {stage.label}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {stage.description}
              </div>
            </div>

            {isCurrent && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-shrink-0 text-xs font-medium text-primary"
              >
                {Math.round(progress)}%
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
