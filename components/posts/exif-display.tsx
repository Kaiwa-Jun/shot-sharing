"use client";

import { Camera } from "lucide-react";
import { ExifData } from "@/lib/types/exif";
import { formatExifForDisplay } from "@/lib/image/exif";

interface ExifDisplayProps {
  exif: ExifData | null;
  isLoading?: boolean;
}

export function ExifDisplay({ exif, isLoading }: ExifDisplayProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-4">
        <Camera className="h-5 w-5 text-gray-400" />
        <p className="text-sm text-gray-600">撮影設定を読み込み中...</p>
      </div>
    );
  }

  if (!exif) {
    return null;
  }

  const hasExifData =
    exif.iso ||
    exif.f_value ||
    exif.shutter_speed ||
    exif.exposure_compensation;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Camera className="h-5 w-5 text-gray-600" />
        <h3 className="font-semibold text-gray-900">撮影設定</h3>
      </div>

      {hasExifData ? (
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-900">
            {formatExifForDisplay(exif)}
          </p>

          {/* 詳細情報（オプション） */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
            {exif.camera_make && exif.camera_model && (
              <div>
                <span className="text-gray-500">カメラ:</span>{" "}
                {exif.camera_make} {exif.camera_model}
              </div>
            )}
            {exif.lens && (
              <div>
                <span className="text-gray-500">レンズ:</span> {exif.lens}
              </div>
            )}
            {exif.focal_length && (
              <div>
                <span className="text-gray-500">焦点距離:</span>{" "}
                {exif.focal_length}mm
              </div>
            )}
            {exif.white_balance && (
              <div>
                <span className="text-gray-500">WB:</span> {exif.white_balance}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-600">
            撮影設定情報が見つかりませんでした
          </p>
        </div>
      )}
    </div>
  );
}
