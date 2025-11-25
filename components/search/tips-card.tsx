interface TipsCardProps {
  shootingPoint?: string;
  tips?: string[];
}

/**
 * 撮影のポイントとコツを表示するカードコンポーネント
 */
export function TipsCard({ shootingPoint, tips }: TipsCardProps) {
  if (!shootingPoint && (!tips || tips.length === 0)) {
    return null;
  }

  return (
    <div className="my-3 space-y-3">
      {shootingPoint && (
        <div className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/50 p-4 dark:border-amber-800 dark:from-amber-950/30 dark:to-orange-950/30">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">💡</span>
            <span className="font-semibold text-amber-900 dark:text-amber-100">
              撮影のポイント
            </span>
          </div>
          <p className="text-sm leading-relaxed text-foreground">
            {shootingPoint}
          </p>
        </div>
      )}

      {tips && tips.length > 0 && (
        <div className="rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50/50 to-pink-50/50 p-4 dark:border-purple-800 dark:from-purple-950/30 dark:to-pink-950/30">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">✨</span>
            <span className="font-semibold text-purple-900 dark:text-purple-100">
              この設定で撮影するコツ
            </span>
          </div>
          <ul className="space-y-2">
            {tips.map((tip, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm leading-relaxed text-foreground"
              >
                <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-purple-200 text-xs font-semibold text-purple-900 dark:bg-purple-800 dark:text-purple-100">
                  {index + 1}
                </span>
                <span className="flex-1">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
