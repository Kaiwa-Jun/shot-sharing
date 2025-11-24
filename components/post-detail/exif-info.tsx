import { ExifData } from "@/lib/types/exif";

interface ExifInfoProps {
  exifData: ExifData;
}

export function ExifInfo({ exifData }: ExifInfoProps) {
  const formatExifValue = (
    value: string | number | null | undefined,
    prefix = "",
    suffix = ""
  ): string => {
    if (value === undefined || value === null) return "";
    return `${prefix}${value}${suffix}`;
  };

  // カメラ機種とレンズの組み立て
  const cameraInfo = [
    exifData.cameraMake && exifData.cameraModel
      ? `${exifData.cameraMake} ${exifData.cameraModel}`
      : exifData.cameraModel || exifData.cameraMake,
    exifData.lens,
  ]
    .filter(Boolean)
    .join(" | ");

  // 撮影設定の組み立て
  const shootingSettings = [
    formatExifValue(exifData.iso, "ISO"),
    formatExifValue(exifData.fValue, "f/"),
    formatExifValue(exifData.shutterSpeed),
  ].filter((v) => v !== "");

  return (
    <div className="rounded-lg bg-muted px-4 py-3">
      <div className="space-y-1 text-sm">
        {/* 1行目: カメラ機種とレンズ */}
        {cameraInfo && <div className="font-medium">{cameraInfo}</div>}

        {/* 2行目: ISO、F値、シャッタースピード */}
        {shootingSettings.length > 0 && (
          <div className="font-mono text-muted-foreground">
            {shootingSettings.join(" • ")}
          </div>
        )}
      </div>
    </div>
  );
}
