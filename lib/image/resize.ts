import sharp from "sharp";

/**
 * 画像リサイズの設定
 */
export const IMAGE_CONFIG = {
  // サムネイル設定
  THUMBNAIL: {
    WIDTH: 400,
    HEIGHT: 400,
    QUALITY: 80,
  },
  // 表示用画像設定（オリジナルサイズを保持するが、最大幅を制限）
  DISPLAY: {
    MAX_WIDTH: 2000,
    MAX_HEIGHT: 2000,
    QUALITY: 90,
  },
} as const;

/**
 * サムネイル画像を生成
 * @param buffer 元画像のBuffer
 * @returns サムネイル画像のBuffer
 */
export async function createThumbnail(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .resize(IMAGE_CONFIG.THUMBNAIL.WIDTH, IMAGE_CONFIG.THUMBNAIL.HEIGHT, {
        fit: "cover", // 中央部分を切り抜き
        position: "center",
      })
      .jpeg({ quality: IMAGE_CONFIG.THUMBNAIL.QUALITY })
      .toBuffer();
  } catch (error) {
    console.error("サムネイル生成に失敗しました:", error);
    throw new Error("サムネイル生成に失敗しました");
  }
}

/**
 * 表示用画像を生成（大きすぎる画像をリサイズ）
 * @param buffer 元画像のBuffer
 * @returns リサイズ済み画像のBuffer
 */
export async function resizeForDisplay(buffer: Buffer): Promise<Buffer> {
  try {
    const metadata = await sharp(buffer).metadata();

    // 画像が十分小さい場合はそのまま返す
    if (
      metadata.width &&
      metadata.height &&
      metadata.width <= IMAGE_CONFIG.DISPLAY.MAX_WIDTH &&
      metadata.height <= IMAGE_CONFIG.DISPLAY.MAX_HEIGHT
    ) {
      return buffer;
    }

    // リサイズ処理
    return await sharp(buffer)
      .resize(IMAGE_CONFIG.DISPLAY.MAX_WIDTH, IMAGE_CONFIG.DISPLAY.MAX_HEIGHT, {
        fit: "inside", // アスペクト比を保持
        withoutEnlargement: true, // 拡大しない
      })
      .jpeg({ quality: IMAGE_CONFIG.DISPLAY.QUALITY })
      .toBuffer();
  } catch (error) {
    console.error("画像リサイズに失敗しました:", error);
    throw new Error("画像リサイズに失敗しました");
  }
}

/**
 * 画像のメタデータを取得
 * @param buffer 画像のBuffer
 * @returns 画像メタデータ
 */
export async function getImageMetadata(buffer: Buffer) {
  try {
    return await sharp(buffer).metadata();
  } catch (error) {
    console.error("画像メタデータの取得に失敗しました:", error);
    throw new Error("画像メタデータの取得に失敗しました");
  }
}
