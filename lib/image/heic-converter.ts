/**
 * HEIC画像変換ユーティリティ
 *
 * heic-convertを使用してHEIC/HEIF画像をJPEGに変換する
 * Vercel Serverless環境で動作可能（ネイティブ依存なし）
 */

import convert from "heic-convert";

/**
 * HEIC/HEIF画像をJPEGに変換
 *
 * @param buffer - HEIC/HEIFのBufferデータ
 * @param quality - JPEG品質 (0.0 - 1.0, デフォルト: 0.92)
 * @returns JPEGに変換されたBuffer
 */
export async function convertHeicToJpeg(
  buffer: Buffer,
  quality: number = 0.92
): Promise<Buffer<ArrayBuffer>> {
  const result = await convert({
    buffer,
    format: "JPEG",
    quality,
  });

  // heic-convertはArrayBuffer | Uint8Arrayを返す
  // 明示的にArrayBufferを作成してBuffer<ArrayBuffer>を返す
  const arrayBuffer = new ArrayBuffer(result.byteLength);
  const view = new Uint8Array(arrayBuffer);
  view.set(new Uint8Array(result));
  return Buffer.from(arrayBuffer);
}

/**
 * HEIC/HEIF画像をPNGに変換
 *
 * @param buffer - HEIC/HEIFのBufferデータ
 * @returns PNGに変換されたBuffer
 */
export async function convertHeicToPng(buffer: Buffer): Promise<Buffer> {
  const result = await convert({
    buffer,
    format: "PNG",
  });

  return Buffer.from(result);
}
