import { parse } from "exifr";
import { ExifData, DEFAULT_EXIF_DATA } from "@/lib/types/exif";

/**
 * シャッタースピードを文字列形式に変換
 * @param exposureTime Exifのシャッタースピード値
 * @returns 文字列形式のシャッタースピード（例: "1/250"）
 */
function formatShutterSpeed(exposureTime: number | undefined): string | null {
  if (!exposureTime) return null;

  if (exposureTime >= 1) {
    return `${exposureTime}s`;
  }

  const denominator = Math.round(1 / exposureTime);
  return `1/${denominator}`;
}

/**
 * 画像ファイルからExif情報を抽出
 * @param file 画像ファイル
 * @returns Exif情報
 */
export async function extractExifData(file: File): Promise<ExifData> {
  try {
    const exif = await parse(file, {
      // 必要な情報のみ抽出してパフォーマンス向上
      pick: [
        "ISO",
        "FNumber",
        "ExposureTime",
        "ExposureCompensation",
        "FocalLength",
        "WhiteBalance",
        "Make",
        "Model",
        "LensModel",
        "DateTimeOriginal",
        "ImageWidth",
        "ImageHeight",
      ],
    });

    if (!exif) {
      console.warn("Exif情報が見つかりませんでした");
      return DEFAULT_EXIF_DATA;
    }

    return {
      iso: exif.ISO ?? null,
      f_value: exif.FNumber ?? null,
      shutter_speed: formatShutterSpeed(exif.ExposureTime),
      exposure_compensation: exif.ExposureCompensation ?? null,
      focal_length: exif.FocalLength ?? null,
      white_balance: exif.WhiteBalance ?? null,
      camera_make: exif.Make ?? null,
      camera_model: exif.Model ?? null,
      lens: exif.LensModel ?? null,
      date_time: exif.DateTimeOriginal?.toISOString() ?? null,
      width: exif.ImageWidth ?? null,
      height: exif.ImageHeight ?? null,
    };
  } catch (error) {
    console.error("Exif情報の抽出に失敗しました:", error);
    return DEFAULT_EXIF_DATA;
  }
}

/**
 * Exif情報を表示用にフォーマット
 * @param exif Exif情報
 * @returns フォーマット済み文字列（例: "ISO200 • f/2.8 • 1/250s"）
 */
export function formatExifForDisplay(exif: ExifData): string {
  const parts: string[] = [];

  if (exif.iso) parts.push(`ISO${exif.iso}`);
  if (exif.f_value) parts.push(`f/${exif.f_value}`);
  if (exif.shutter_speed) parts.push(exif.shutter_speed);
  if (exif.exposure_compensation && exif.exposure_compensation !== 0) {
    const sign = exif.exposure_compensation > 0 ? "+" : "";
    parts.push(`${sign}${exif.exposure_compensation}EV`);
  }

  return parts.length > 0 ? parts.join(" • ") : "撮影設定情報なし";
}
