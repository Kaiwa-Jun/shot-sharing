import type { ParsedAIResponse, CameraSettings } from "@/lib/types/ai-response";

/**
 * カメラ設定行をパースして構造化データに変換
 * 例（旧形式）: "ISO: 1600 | F値: f/2.8 | シャッタースピード: 1/250 | 焦点距離: 85mm"
 * 例（新形式）: "設定値: f/8 / 1/125秒 / 105mm / ISO100"
 */
function parseCameraSettingsLine(line: string): Partial<CameraSettings> {
  const settings: Partial<CameraSettings> = {};

  // 新形式: "設定値: f/8 / 1/125秒 / 105mm / ISO100"
  if (line.includes("設定値:")) {
    const valuesStr = line.replace(/設定値:\s*/i, "").trim();
    const parts = valuesStr.split("/").map((p) => p.trim());

    for (const part of parts) {
      // F値
      const apertureMatch = part.match(/f\/?([\d.]+)/i);
      if (apertureMatch) {
        settings.aperture = `f/${apertureMatch[1]}`;
        continue;
      }

      // ISO
      const isoMatch = part.match(/ISO\s*(\d+)/i);
      if (isoMatch) {
        settings.iso = isoMatch[1];
        continue;
      }

      // シャッタースピード
      const shutterMatch = part.match(/(1\/\d+秒?|[\d.]+秒)/);
      if (shutterMatch) {
        settings.shutterSpeed = shutterMatch[1];
        continue;
      }

      // 焦点距離
      const focalMatch = part.match(/(\d+)mm/i);
      if (focalMatch) {
        settings.focalLength = `${focalMatch[1]}mm`;
        continue;
      }
    }

    return settings;
  }

  // 旧形式のパース（後方互換性のため残す）
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
 * 「なぜこの設定？」セクションから設定の説明をパース
 */
function parseExplanations(content: string): CameraSettings["explanations"] {
  const explanations: CameraSettings["explanations"] = {};
  const lines = content.split("\n").filter((line) => line.trim());

  for (const line of lines) {
    // 箇条書きを除去
    const cleaned = line.replace(/^[•\-*]\s*/, "").trim();

    // F値の説明
    const apertureMatch = cleaned.match(/^f\/[\d.]+:\s*(.+)/i);
    if (apertureMatch) {
      explanations.aperture = apertureMatch[1].trim();
      continue;
    }

    // シャッタースピードの説明
    const shutterMatch = cleaned.match(/^(1\/\d+秒?|[\d.]+秒):\s*(.+)/);
    if (shutterMatch) {
      explanations.shutterSpeed = shutterMatch[2].trim();
      continue;
    }

    // 焦点距離の説明
    const focalMatch = cleaned.match(/^(\d+)mm:\s*(.+)/i);
    if (focalMatch) {
      explanations.focalLength = focalMatch[2].trim();
      continue;
    }

    // ISOの説明
    const isoMatch = cleaned.match(/^ISO\s*\d*:\s*(.+)/i);
    if (isoMatch) {
      explanations.iso = isoMatch[1].trim();
      continue;
    }
  }

  return explanations;
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

    // カメラ設定セクション（新形式: 「おすすめのカメラ設定」、旧形式: 「カメラ設定」）
    if (
      trimmedSection.startsWith("📸 おすすめのカメラ設定") ||
      trimmedSection.startsWith("📸 カメラ設定")
    ) {
      const settingsContent = trimmedSection
        .replace(/📸 (おすすめの)?カメラ設定/, "")
        .trim();

      const cameraSettings: CameraSettings = {};

      // 「なぜこの設定？」サブセクションを分離
      const whyMatch = settingsContent.match(
        /###\s*なぜこの設定[？?]?\s*([\s\S]*?)(?=###|$)/
      );
      if (whyMatch) {
        cameraSettings.explanations = parseExplanations(whyMatch[1]);
      }

      // メイン設定部分をパース
      const mainContent = settingsContent
        .replace(/###\s*なぜこの設定[？?]?\s*[\s\S]*?(?=###|$)/, "")
        .trim();
      const lines = mainContent.split("\n").filter((line) => line.trim());

      for (const line of lines) {
        // サブセクションヘッダーはスキップ
        if (line.startsWith("###")) continue;

        // 設定値の行
        if (
          line.includes("設定値") ||
          line.includes("ISO") ||
          line.includes("F値")
        ) {
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

    // 撮影のコツセクション（旧形式）
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
