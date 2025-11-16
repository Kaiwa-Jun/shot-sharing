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
 * @param input 画像ファイル、Buffer、またはArrayBuffer
 * @returns Exif情報
 */
export async function extractExifData(
  input: File | Buffer | ArrayBuffer
): Promise<ExifData> {
  try {
    // FileオブジェクトをArrayBufferに変換（クライアント側）
    let arrayBuffer: ArrayBuffer;
    if (input instanceof File) {
      arrayBuffer = await input.arrayBuffer();
    } else if (Buffer.isBuffer(input)) {
      // BufferをArrayBufferに変換（サーバー側）
      arrayBuffer = input.buffer.slice(
        input.byteOffset,
        input.byteOffset + input.byteLength
      ) as ArrayBuffer;
    } else {
      arrayBuffer = input;
    }

    const exif = await parse(arrayBuffer, {
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
      fValue: exif.FNumber ?? null,
      shutterSpeed: formatShutterSpeed(exif.ExposureTime),
      exposureCompensation: exif.ExposureCompensation ?? null,
      focalLength: exif.FocalLength ?? null,
      whiteBalance: exif.WhiteBalance ?? null,
      cameraMake: exif.Make ?? null,
      cameraModel: exif.Model ?? null,
      lens: exif.LensModel ?? null,
      dateTime: exif.DateTimeOriginal?.toISOString() ?? null,
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
  if (exif.fValue) parts.push(`f/${exif.fValue}`);
  if (exif.shutterSpeed) parts.push(exif.shutterSpeed);
  if (exif.exposureCompensation && exif.exposureCompensation !== 0) {
    const sign = exif.exposureCompensation > 0 ? "+" : "";
    parts.push(`${sign}${exif.exposureCompensation}EV`);
  }

  return parts.length > 0 ? parts.join(" • ") : "撮影設定情報なし";
}
