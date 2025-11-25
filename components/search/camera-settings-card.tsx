import type { CameraSettings } from "@/lib/types/ai-response";

interface CameraSettingsCardProps {
  settings: CameraSettings;
}

/**
 * カメラ設定を表示するカードコンポーネント
 */
export function CameraSettingsCard({ settings }: CameraSettingsCardProps) {
  const settingsItems = [
    { label: "ISO", value: settings.iso, icon: "📊" },
    { label: "F値", value: settings.aperture, icon: "🔍" },
    { label: "SS", value: settings.shutterSpeed, icon: "⚡" },
    { label: "焦点距離", value: settings.focalLength, icon: "📏" },
    { label: "カメラ", value: settings.camera, icon: "📷", fullWidth: true },
    { label: "レンズ", value: settings.lens, icon: "🔭", fullWidth: true },
  ].filter((item) => item.value && item.value !== "-");

  if (settingsItems.length === 0) {
    return null;
  }

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:border-blue-800 dark:from-blue-950/30 dark:to-indigo-950/30">
      <div className="border-b border-blue-200 bg-blue-100/50 px-4 py-2 dark:border-blue-800 dark:bg-blue-900/30">
        <div className="flex items-center gap-2">
          <span className="text-lg">📸</span>
          <span className="font-semibold text-blue-900 dark:text-blue-100">
            カメラ設定
          </span>
        </div>
      </div>

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
    </div>
  );
}
