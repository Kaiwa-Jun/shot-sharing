import type { CameraSettings } from "@/lib/types/ai-response";

interface CameraSettingsCardProps {
  settings: CameraSettings;
}

/**
 * カメラ設定を表示するカードコンポーネント
 * 設定値と説明を分けて初心者にもわかりやすく表示
 */
export function CameraSettingsCard({ settings }: CameraSettingsCardProps) {
  // メイン設定値（シンプルに表示）
  const mainSettings = [
    settings.aperture,
    settings.shutterSpeed,
    settings.focalLength,
    settings.iso ? `ISO${settings.iso}` : null,
  ].filter((v) => v && v !== "-");

  // 説明付き設定
  const explanationItems = [
    {
      label: settings.aperture,
      explanation: settings.explanations?.aperture,
      icon: "🔍",
    },
    {
      label: settings.shutterSpeed,
      explanation: settings.explanations?.shutterSpeed,
      icon: "⚡",
    },
    {
      label: settings.focalLength,
      explanation: settings.explanations?.focalLength,
      icon: "📏",
    },
    {
      label: settings.iso ? `ISO${settings.iso}` : null,
      explanation: settings.explanations?.iso,
      icon: "📊",
    },
  ].filter((item) => item.label && item.label !== "-" && item.explanation);

  // 機材情報
  const equipmentInfo = [
    settings.camera ? `カメラ: ${settings.camera}` : null,
    settings.lens ? `レンズ: ${settings.lens}` : null,
  ].filter(Boolean);

  if (mainSettings.length === 0) {
    return null;
  }

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:border-blue-800 dark:from-blue-950/30 dark:to-indigo-950/30">
      <div className="border-b border-blue-200 bg-blue-100/50 px-4 py-2 dark:border-blue-800 dark:bg-blue-900/30">
        <div className="flex items-center gap-2">
          <span className="text-lg">📸</span>
          <span className="font-semibold text-blue-900 dark:text-blue-100">
            おすすめのカメラ設定
          </span>
        </div>
      </div>

      <div className="p-4">
        {/* メイン設定値（シンプルに1行で表示） */}
        <div className="mb-3 text-center font-mono text-lg font-bold text-blue-900 dark:text-blue-100">
          {mainSettings.join(" / ")}
        </div>

        {/* 機材情報 */}
        {equipmentInfo.length > 0 && (
          <div className="mb-3 text-center text-xs text-muted-foreground">
            {equipmentInfo.join(" | ")}
          </div>
        )}

        {/* 説明セクション */}
        {explanationItems.length > 0 && (
          <div className="mt-4 border-t border-blue-200 pt-3 dark:border-blue-800">
            <div className="mb-2 text-xs font-semibold text-blue-800 dark:text-blue-200">
              なぜこの設定？
            </div>
            <ul className="space-y-2">
              {explanationItems.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 text-base">{item.icon}</span>
                  <div>
                    <span className="font-semibold text-blue-900 dark:text-blue-100">
                      {item.label}:
                    </span>{" "}
                    <span className="text-foreground/80">
                      {item.explanation}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
