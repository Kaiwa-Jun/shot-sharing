"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export interface ExifData {
  iso?: number;
  fValue?: number;
  shutterSpeed?: string;
  exposureCompensation?: number;
}

export interface PhotoCardProps {
  id: string;
  imageUrl: string;
  exifData?: ExifData;
  onClick?: () => void;
}

export function PhotoCard({ imageUrl, exifData, onClick }: PhotoCardProps) {
  return (
    <motion.div
      className="group relative cursor-pointer overflow-hidden shadow-md transition-shadow hover:shadow-xl"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
    >
      {/* 画像 */}
      <div className="relative aspect-auto">
        <Image
          src={imageUrl}
          alt="Photo"
          width={400}
          height={600}
          className="h-auto w-full object-cover"
          loading="lazy"
        />

        {/* Exif情報オーバーレイ */}
        {exifData && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 py-4">
            <div className="flex items-center gap-2 font-mono text-xs text-white">
              {exifData.iso && <span>ISO {exifData.iso}</span>}
              {exifData.fValue && <span>• f/{exifData.fValue}</span>}
              {exifData.shutterSpeed && <span>• {exifData.shutterSpeed}</span>}
              {exifData.exposureCompensation && (
                <span>
                  • {exifData.exposureCompensation > 0 ? "+" : ""}
                  {exifData.exposureCompensation}EV
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
