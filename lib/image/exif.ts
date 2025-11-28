import ExifReader from "exifreader";
import { ExifData, DEFAULT_EXIF_DATA } from "@/lib/types/exif";

/**
 * ExifReaderのタグから値を取得するヘルパー
 */
function getTagValue<T>(tags: ExifReader.Tags, tagName: string): T | null {
  const tag = tags[tagName];
  if (!tag) return null;

  // descriptionがあればそれを使用、なければvalueを使用
  const tagObj = tag as unknown as { description?: T; value?: T };
  const value = tagObj.description ?? tagObj.value;

  return value ?? null;
}

/**
 * ExifReaderのタグから数値を取得するヘルパー
 */
function getNumericValue(
  tags: ExifReader.Tags,
  tagName: string
): number | null {
  const tag = tags[tagName];
  if (!tag) return null;

  const tagObj = tag as unknown as { value?: number | number[] };
  const value = tagObj.value;

  // 配列の場合は最初の要素を返す
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return typeof value === "number" ? value : null;
}

/**
 * シャッタースピードを文字列形式に変換
 * ExifReaderはdescriptionで既にフォーマット済みの場合がある
 */
function formatShutterSpeed(tags: ExifReader.Tags): string | null {
  const exposureTime = tags["ExposureTime"];
  if (!exposureTime) return null;

  const tagObj = exposureTime as unknown as {
    description?: string;
    value?: number | number[];
  };

  // descriptionがあればそのまま使用（例: "1/56"）
  if (tagObj.description) {
    return tagObj.description;
  }

  // valueから計算
  const value = tagObj.value;
  let numValue: number | null = null;

  if (Array.isArray(value)) {
    numValue = value[0];
  } else if (typeof value === "number") {
    numValue = value;
  }

  if (!numValue) return null;

  if (numValue >= 1) {
    return `${numValue}s`;
  }

  const denominator = Math.round(1 / numValue);
  return `1/${denominator}`;
}

/**
 * F値を取得
 */
function getFNumber(tags: ExifReader.Tags): number | null {
  const fNumber = tags["FNumber"];
  if (!fNumber) return null;

  const tagObj = fNumber as unknown as { description?: string };

  // descriptionから数値を抽出（例: "f/1.6" → 1.6）
  if (tagObj.description) {
    const match = tagObj.description.match(/f?\/?(\d+\.?\d*)/i);
    if (match) {
      return parseFloat(match[1]);
    }
  }

  return getNumericValue(tags, "FNumber");
}

/**
 * 焦点距離を取得
 */
function getFocalLength(tags: ExifReader.Tags): number | null {
  const focalLength = tags["FocalLength"];
  if (!focalLength) return null;

  const tagObj = focalLength as unknown as { description?: string };

  // descriptionから数値を抽出（例: "5.96 mm" → 5.96）
  if (tagObj.description) {
    const match = tagObj.description.match(/(\d+\.?\d*)/);
    if (match) {
      return parseFloat(match[1]);
    }
  }

  return getNumericValue(tags, "FocalLength");
}

/**
 * 日時を取得してISO文字列に変換
 */
function getDateTime(tags: ExifReader.Tags): string | null {
  const dateTime = tags["DateTimeOriginal"];
  if (!dateTime) return null;

  const tagObj = dateTime as unknown as { description?: string };
  const description = tagObj.description;
  if (!description) return null;

  // "YYYY:MM:DD HH:mm:ss" → ISO形式に変換
  try {
    const [datePart, timePart] = description.split(" ");
    if (datePart && timePart) {
      const isoDate = datePart.replace(/:/g, "-") + "T" + timePart;
      return new Date(isoDate).toISOString();
    }
  } catch {
    // 変換失敗時は元の文字列を返す
    return description;
  }

  return description;
}

/**
 * 画像ファイルからExif情報を抽出
 * ExifReaderを使用してHEIC/HEIF/JPEG/PNG等に対応
 *
 * @param input 画像ファイル、Buffer、またはArrayBuffer
 * @returns Exif情報
 */
export async function extractExifData(
  input: File | Buffer | ArrayBuffer
): Promise<ExifData> {
  try {
    // 入力をBufferまたはArrayBufferに統一
    let buffer: Buffer | ArrayBuffer;

    if (input instanceof File) {
      buffer = await input.arrayBuffer();
    } else {
      buffer = input;
    }

    // ExifReaderで解析
    const tags = ExifReader.load(buffer);

    if (!tags || Object.keys(tags).length === 0) {
      console.warn("Exif情報が見つかりませんでした");
      return DEFAULT_EXIF_DATA;
    }

    // ISO値の取得（ISOSpeedRatingsまたはISO）
    const iso =
      getNumericValue(tags, "ISOSpeedRatings") ??
      getNumericValue(tags, "ISO") ??
      null;

    // 露出補正値の取得
    const exposureBias = getNumericValue(tags, "ExposureBiasValue");

    // ホワイトバランスの取得
    const whiteBalance = getTagValue<string>(tags, "WhiteBalance");

    // 画像サイズの取得
    const width =
      getNumericValue(tags, "PixelXDimension") ??
      getNumericValue(tags, "ImageWidth") ??
      null;
    const height =
      getNumericValue(tags, "PixelYDimension") ??
      getNumericValue(tags, "ImageHeight") ??
      null;

    return {
      iso,
      fValue: getFNumber(tags),
      shutterSpeed: formatShutterSpeed(tags),
      exposureCompensation: exposureBias,
      focalLength: getFocalLength(tags),
      whiteBalance,
      cameraMake: getTagValue<string>(tags, "Make"),
      cameraModel: getTagValue<string>(tags, "Model"),
      lens: getTagValue<string>(tags, "LensModel"),
      dateTime: getDateTime(tags),
      width,
      height,
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
