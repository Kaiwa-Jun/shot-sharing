/**
 * HEICファイルからのEXIF抽出テスト
 */
import * as fs from "fs";
import * as path from "path";
import ExifReader from "exifreader";

async function testHeicExif() {
  const testDir = path.join(process.env.HOME || "", "Desktop/テスト画像");

  // HEICファイルを探す
  const files = fs.readdirSync(testDir);
  const heicFile = files.find(
    (f) =>
      f.toLowerCase().endsWith(".heic") || f.toLowerCase().endsWith(".heif")
  );

  if (!heicFile) {
    console.error("HEICファイルが見つかりません");
    process.exit(1);
  }

  const filePath = path.join(testDir, heicFile);
  console.log(`📷 テストファイル: ${filePath}`);

  // ファイルを読み込み
  const buffer = fs.readFileSync(filePath);
  console.log(`📊 ファイルサイズ: ${buffer.length} bytes`);

  // マジックナンバーを確認
  const ftyp = buffer.slice(4, 8).toString("ascii");
  const brand = buffer.slice(8, 12).toString("ascii");
  console.log(`📊 ftyp: ${ftyp}, brand: ${brand}`);

  // === テスト: ExifReader ===
  console.log("\n=== テスト: ExifReader ===");

  try {
    const tags = ExifReader.load(buffer);

    if (tags && Object.keys(tags).length > 0) {
      console.log("✅ EXIF取得成功");
      console.log(`タグ数: ${Object.keys(tags).length}`);
      console.log("\n主要タグ:");

      // 主要なタグを表示
      const keyTags = [
        "Make",
        "Model",
        "ISO",
        "ISOSpeedRatings",
        "FNumber",
        "ExposureTime",
        "FocalLength",
        "DateTimeOriginal",
        "LensModel",
        "ImageWidth",
        "ImageHeight",
        "ExposureCompensation",
        "WhiteBalance",
      ];

      for (const tag of keyTags) {
        if (tags[tag]) {
          const value = tags[tag].description || tags[tag].value;
          console.log(`  ${tag}: ${value}`);
        }
      }

      console.log("\n全タグ一覧:");
      for (const [key, value] of Object.entries(tags)) {
        const desc =
          (value as { description?: string }).description ||
          (value as { value?: unknown }).value;
        if (desc !== undefined) {
          console.log(`  ${key}: ${desc}`);
        }
      }
    } else {
      console.log("❌ EXIF情報なし");
    }
  } catch (error) {
    console.error("❌ エラー:", error);
  }
}

testHeicExif();
