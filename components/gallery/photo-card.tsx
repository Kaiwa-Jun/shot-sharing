"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState, useEffect } from "react";
import { ExifData } from "@/lib/types/exif";
import { markImageAsLoaded, isImageLoaded } from "@/lib/image-cache";

export interface PhotoCardProps {
  id: string;
  imageUrl: string;
  userId?: string;
  exifData?: ExifData | null;
  onClick?: () => void;
  isNew?: boolean;
  priority?: boolean;
  layoutIdDisabled?: boolean;
}

export function PhotoCard({
  id,
  imageUrl,
  exifData,
  onClick,
  isNew = false,
  priority = false,
  layoutIdDisabled = false,
}: PhotoCardProps) {
  // SSR/ハイドレーション対応: 初期値は常にfalse、クライアントでキャッシュをチェック
  const [isLoaded, setIsLoaded] = useState(false);

  // クライアントサイドでマウント後にキャッシュをチェック
  useEffect(() => {
    if (isImageLoaded(imageUrl)) {
      setIsLoaded(true);
    }
  }, [imageUrl]);

  const handleImageLoad = () => {
    markImageAsLoaded(imageUrl);
    setIsLoaded(true);
  };

  return (
    <motion.div
      className="group relative cursor-pointer overflow-hidden rounded-lg"
      initial={isNew ? { opacity: 0, y: 30 } : false}
      animate={isNew ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
    >
      {/* 画像 */}
      <motion.div
        className="relative aspect-auto"
        layoutId={layoutIdDisabled ? undefined : `photo-${id}`}
        transition={{
          duration: 0.55,
          ease: [0.25, 0.1, 0.25, 1],
        }}
      >
        {/* スケルトンローダー */}
        {!isLoaded && (
          <div className="absolute inset-0 animate-pulse bg-muted" />
        )}
        <Image
          src={imageUrl}
          alt="Photo"
          width={400}
          height={600}
          className={`h-auto w-full object-cover transition-opacity duration-300 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          unoptimized
          onLoad={handleImageLoad}
        />

        {/* Exif情報オーバーレイ */}
        {exifData && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 py-4">
            <div className="flex items-center gap-2 font-mono text-xs text-white">
              <span>
                {[
                  exifData.iso && `ISO ${exifData.iso}`,
                  exifData.fValue && `f/${exifData.fValue}`,
                  exifData.shutterSpeed && exifData.shutterSpeed,
                  exifData.exposureCompensation !== undefined &&
                    exifData.exposureCompensation !== null &&
                    exifData.exposureCompensation !== 0 &&
                    `${exifData.exposureCompensation > 0 ? "+" : ""}${exifData.exposureCompensation}EV`,
                ]
                  .filter(Boolean)
                  .join(" • ")}
              </span>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
