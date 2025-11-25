interface TipsSection {
  icon: string;
  title: string;
  items: string[];
}

interface TipsCardProps {
  shootingPoint?: string;
  tips?: string[];
}

/**
 * 撮影ポイントの文字列をセクションごとにパース
 */
function parseShootingPoint(content: string): TipsSection[] {
  const sections: TipsSection[] = [];

  // ### で始まるセクションを分割
  const sectionBlocks = content.split(/(?=###\s)/);

  for (const block of sectionBlocks) {
    const trimmedBlock = block.trim();
    if (!trimmedBlock.startsWith("###")) continue;

    // セクションヘッダーを解析（絵文字の有無に対応）
    const headerMatch = trimmedBlock.match(
      /^###\s*([📸💡⚙️🎯📷✨🔍]*)\s*(.+?)(?:\n|$)/
    );
    if (!headerMatch) continue;

    const icon = headerMatch[1]?.trim() || "📌";
    const title = headerMatch[2]?.trim() || "";

    // ヘッダー以降のコンテンツを取得
    const itemsContent = trimmedBlock
      .replace(/^###\s*[📸💡⚙️🎯📷✨🔍]*\s*.+?\n?/, "")
      .trim();

    const items = itemsContent
      .split("\n")
      .map((line) => line.replace(/^[•\-*]\s*/, "").trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));

    if (items.length > 0 && title) {
      sections.push({ icon, title, items });
    }
  }

  return sections;
}

/**
 * 撮影のポイントとコツを表示するカードコンポーネント
 * マークダウン形式で構造化して見やすく表示
 */
export function TipsCard({ shootingPoint, tips }: TipsCardProps) {
  if (!shootingPoint && (!tips || tips.length === 0)) {
    return null;
  }

  // 新形式（セクション分け）かどうかを判定
  const hasStructuredContent = shootingPoint?.includes("###");
  const sections = hasStructuredContent
    ? parseShootingPoint(shootingPoint || "")
    : [];

  // 構造化されていない部分を抽出（### の前のテキスト）
  const plainTextContent = shootingPoint
    ?.split(/###/)[0]
    ?.trim()
    ?.replace(/^#\s*/, "") // 先頭の # を除去
    ?.trim();

  // 表示するかどうかの判定
  const showStructured = hasStructuredContent && sections.length > 0;
  const showPlainText =
    (!hasStructuredContent && shootingPoint) ||
    (hasStructuredContent &&
      sections.length === 0 &&
      plainTextContent &&
      plainTextContent.length > 0);

  // セクションカラーのマッピング
  const getSectionStyle = (icon: string) => {
    if (icon.includes("📸") || icon.includes("🎯")) {
      return {
        border: "border-amber-200 dark:border-amber-800",
        bg: "bg-amber-50/50 dark:bg-amber-950/30",
        titleColor: "text-amber-900 dark:text-amber-100",
        bulletBg: "bg-amber-200 dark:bg-amber-800",
        bulletText: "text-amber-900 dark:text-amber-100",
      };
    }
    if (icon.includes("💡")) {
      return {
        border: "border-yellow-200 dark:border-yellow-800",
        bg: "bg-yellow-50/50 dark:bg-yellow-950/30",
        titleColor: "text-yellow-900 dark:text-yellow-100",
        bulletBg: "bg-yellow-200 dark:bg-yellow-800",
        bulletText: "text-yellow-900 dark:text-yellow-100",
      };
    }
    if (icon.includes("⚙️") || icon.includes("🔍")) {
      return {
        border: "border-purple-200 dark:border-purple-800",
        bg: "bg-purple-50/50 dark:bg-purple-950/30",
        titleColor: "text-purple-900 dark:text-purple-100",
        bulletBg: "bg-purple-200 dark:bg-purple-800",
        bulletText: "text-purple-900 dark:text-purple-100",
      };
    }
    return {
      border: "border-gray-200 dark:border-gray-700",
      bg: "bg-gray-50/50 dark:bg-gray-900/30",
      titleColor: "text-gray-900 dark:text-gray-100",
      bulletBg: "bg-gray-200 dark:bg-gray-700",
      bulletText: "text-gray-900 dark:text-gray-100",
    };
  };

  return (
    <div className="my-3 space-y-3">
      {/* 構造化された撮影ポイント（新形式） */}
      {showStructured && (
        <div className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/50 p-4 dark:border-amber-800 dark:from-amber-950/30 dark:to-orange-950/30">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-lg">💡</span>
            <span className="font-semibold text-amber-900 dark:text-amber-100">
              撮影のポイント
            </span>
          </div>

          <div className="space-y-4">
            {sections.map((section, sectionIndex) => {
              const style = getSectionStyle(section.icon);
              return (
                <div key={sectionIndex}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-base">{section.icon}</span>
                    <span
                      className={`text-sm font-semibold ${style.titleColor}`}
                    >
                      {section.title}
                    </span>
                  </div>
                  <ul className="space-y-1.5 pl-6">
                    {section.items.map((item, itemIndex) => (
                      <li
                        key={itemIndex}
                        className="flex items-start gap-2 text-sm leading-relaxed text-foreground"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400 dark:bg-amber-500" />
                        <span className="flex-1">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 旧形式（プレーンテキスト）またはパース失敗時 */}
      {showPlainText && (
        <div className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/50 p-4 dark:border-amber-800 dark:from-amber-950/30 dark:to-orange-950/30">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">💡</span>
            <span className="font-semibold text-amber-900 dark:text-amber-100">
              撮影のポイント
            </span>
          </div>
          <p className="text-sm leading-relaxed text-foreground">
            {plainTextContent || shootingPoint}
          </p>
        </div>
      )}

      {/* 旧形式の撮影コツ */}
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
