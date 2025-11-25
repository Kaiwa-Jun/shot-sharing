import type { CameraSettings } from "@/lib/types/ai-response";

interface CameraSettingsCardProps {
  settings: CameraSettings;
}

/**
 * カメラ設定を表示するカードコンポーネント
 * 設定値と説明を分けて初心者にもわかりやすく表示
 */
export function CameraSettingsCard({ settings }: CameraSettingsCardProps) {
  // 設定項目（元のグリッドレイアウト用）
  const settingsItems = [
    { label: "ISO", value: settings.iso, icon: "📊" },
    { label: "F値", value: settings.aperture, icon: "🔍" },
    { label: "SS", value: settings.shutterSpeed, icon: "⚡" },
    { label: "焦点距離", value: settings.focalLength, icon: "📏" },
    { label: "カメラ", value: settings.camera, icon: "📷", fullWidth: true },
    { label: "レンズ", value: settings.lens, icon: "🔭", fullWidth: true },
  ].filter((item) => item.value && item.value !== "-");

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

  if (settingsItems.length === 0) {
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

      {/* 設定値グリッド（元のレイアウト） */}
      <div className="grid grid-cols-2 gap-2 p-4">
        {settingsItems.map((item, index) => (
          <div
            key={index}
            className={`flex items-center gap-2 ${
              item.fullWidth ? "col-span-2" : ""
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div className="font-mono text-sm font-medium">{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 説明セクション */}
      {explanationItems.length > 0 && (
        <div className="border-t border-blue-200 p-4 dark:border-blue-800">
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
                  <span className="text-foreground/80">{item.explanation}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
