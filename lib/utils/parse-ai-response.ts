import type { ParsedAIResponse, CameraSettings } from "@/lib/types/ai-response";

/**
 * カメラ設定行をパースして構造化データに変換
 * 例: "ISO: 1600 | F値: f/2.8 | シャッタースピード: 1/250 | 焦点距離: 85mm"
 */
function parseCameraSettingsLine(line: string): Partial<CameraSettings> {
  const settings: Partial<CameraSettings> = {};

  // ISO
  const isoMatch = line.match(/ISO:\s*([^\|]+)/i);
  if (isoMatch) {
    settings.iso = isoMatch[1].trim();
  }

  // F値
  const apertureMatch = line.match(/F値:\s*([^\|]+)/i);
  if (apertureMatch) {
    settings.aperture = apertureMatch[1].trim();
  }

  // シャッタースピード
  const shutterMatch = line.match(/(?:シャッタースピード|SS):\s*([^\|]+)/i);
  if (shutterMatch) {
    settings.shutterSpeed = shutterMatch[1].trim();
  }

  // 焦点距離
  const focalMatch = line.match(/焦点距離:\s*([^\|]+)/i);
  if (focalMatch) {
    settings.focalLength = focalMatch[1].trim();
  }

  return settings;
}

/**
 * カメラ・レンズ情報行をパースして構造化データに変換
 * 例: "カメラ: Canon EOS R5 | レンズ: RF 85mm F2"
 */
function parseCameraLensLine(line: string): Partial<CameraSettings> {
  const settings: Partial<CameraSettings> = {};

  // カメラ
  const cameraMatch = line.match(/カメラ:\s*([^\|]+)/i);
  if (cameraMatch) {
    settings.camera = cameraMatch[1].trim();
  }

  // レンズ
  const lensMatch = line.match(/レンズ:\s*([^\|]+)/i);
  if (lensMatch) {
    settings.lens = lensMatch[1].trim();
  }

  return settings;
}

/**
 * AI回答をパースして構造化データに変換
 * @param content AI回答の生テキスト
 * @returns 構造化されたAI回答データ
 */
export function parseAIResponse(content: string): ParsedAIResponse {
  const result: ParsedAIResponse = {
    rawContent: content,
  };

  // セクションごとに分割
  const sections = content.split(/##\s+/);

  for (const section of sections) {
    const trimmedSection = section.trim();
    if (!trimmedSection) continue;

    // カメラ設定セクション（「おすすめのカメラ設定」または「カメラ設定」）
    if (
      trimmedSection.startsWith("📸 おすすめのカメラ設定") ||
      trimmedSection.startsWith("📸 カメラ設定")
    ) {
      const settingsContent = trimmedSection
        .replace(/📸\s*(おすすめの)?カメラ設定/, "")
        .trim();
      const lines = settingsContent.split("\n").filter((line) => line.trim());

      const cameraSettings: CameraSettings = {};

      for (const line of lines) {
        // 設定値の行
        if (line.includes("ISO") || line.includes("F値")) {
          Object.assign(cameraSettings, parseCameraSettingsLine(line));
        }

        // カメラ・レンズの行
        if (line.includes("カメラ") || line.includes("レンズ")) {
          Object.assign(cameraSettings, parseCameraLensLine(line));
        }
      }

      result.cameraSettings = cameraSettings;
    }

    // 撮影のポイントセクション
    else if (trimmedSection.startsWith("💡 撮影のポイント")) {
      const pointContent = trimmedSection
        .replace("💡 撮影のポイント", "")
        .trim();
      result.shootingPoint = pointContent;
    }

    // 撮影のコツセクション
    else if (trimmedSection.startsWith("✨ この設定で撮影するコツ")) {
      const tipsContent = trimmedSection
        .replace("✨ この設定で撮影するコツ", "")
        .trim();
      const lines = tipsContent.split("\n").filter((line) => line.trim());

      const tips: string[] = [];
      for (const line of lines) {
        // 箇条書き（•, -, *）を除去
        const cleaned = line.replace(/^[•\-*]\s*/, "").trim();
        if (cleaned) {
          tips.push(cleaned);
        }
      }

      result.tips = tips;
    }

    // その他のコンテンツ
    else {
      if (!result.otherContent) {
        result.otherContent = trimmedSection;
      } else {
        result.otherContent += "\n\n" + trimmedSection;
      }
    }
  }

  return result;
}
