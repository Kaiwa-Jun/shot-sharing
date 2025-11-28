/**
 * 画像形式検出ユーティリティ
 *
 * マジックナンバー（ファイルシグネチャ）を使用して
 * 画像フォーマットを判定する
 */

// HEIC/HEIFのブランド識別子
const HEIC_BRANDS = [
  "heic", // HEIC
  "heix", // HEIC with extensions
  "hevc", // HEVC
  "hevx", // HEVC with extensions
  "mif1", // HEIF
  "msf1", // HEIF sequence
  "avif", // AVIF (AV1 Image File Format)
];

/**
 * ArrayBufferがHEIC/HEIF形式かどうかを判定
 *
 * HEIC/HEIFファイル構造:
 * - オフセット 4-7: "ftyp" (File Type Box)
 * - オフセット 8-11: ブランド識別子 (heic, heix, mif1など)
 *
 * @param buffer - チェックするArrayBuffer
 * @returns HEICまたはHEIF形式の場合true
 */
export function isHeic(buffer: ArrayBuffer): boolean {
  // 最低12バイト必要
  if (buffer.byteLength < 12) {
    return false;
  }

  const view = new DataView(buffer);

  // オフセット4-7が"ftyp"かチェック
  const ftyp =
    String.fromCharCode(view.getUint8(4)) +
    String.fromCharCode(view.getUint8(5)) +
    String.fromCharCode(view.getUint8(6)) +
    String.fromCharCode(view.getUint8(7));

  if (ftyp !== "ftyp") {
    return false;
  }

  // オフセット8-11のブランド識別子をチェック
  const brand =
    String.fromCharCode(view.getUint8(8)) +
    String.fromCharCode(view.getUint8(9)) +
    String.fromCharCode(view.getUint8(10)) +
    String.fromCharCode(view.getUint8(11));

  return HEIC_BRANDS.includes(brand);
}

/**
 * 画像形式を検出
 *
 * @param buffer - チェックするArrayBuffer
 * @returns 検出された画像形式
 */
export function detectImageFormat(
  buffer: ArrayBuffer
): "heic" | "jpeg" | "png" | "webp" | "gif" | "unknown" {
  if (buffer.byteLength < 12) {
    return "unknown";
  }

  const view = new Uint8Array(buffer);

  // HEIC/HEIF (ftyp box)
  if (isHeic(buffer)) {
    return "heic";
  }

  // JPEG: FF D8 FF
  if (view[0] === 0xff && view[1] === 0xd8 && view[2] === 0xff) {
    return "jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    view[0] === 0x89 &&
    view[1] === 0x50 &&
    view[2] === 0x4e &&
    view[3] === 0x47 &&
    view[4] === 0x0d &&
    view[5] === 0x0a &&
    view[6] === 0x1a &&
    view[7] === 0x0a
  ) {
    return "png";
  }

  // WebP: RIFF....WEBP
  if (
    view[0] === 0x52 && // R
    view[1] === 0x49 && // I
    view[2] === 0x46 && // F
    view[3] === 0x46 && // F
    view[8] === 0x57 && // W
    view[9] === 0x45 && // E
    view[10] === 0x42 && // B
    view[11] === 0x50 // P
  ) {
    return "webp";
  }

  // GIF: GIF87a or GIF89a
  if (
    view[0] === 0x47 && // G
    view[1] === 0x49 && // I
    view[2] === 0x46 && // F
    view[3] === 0x38 && // 8
    (view[4] === 0x37 || view[4] === 0x39) && // 7 or 9
    view[5] === 0x61 // a
  ) {
    return "gif";
  }

  return "unknown";
}
