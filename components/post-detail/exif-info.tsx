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
    if (value === undefined || value === null) return "-";
    return `${prefix}${value}${suffix}`;
  };

  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted px-4 py-3">
      <span className="text-lg">📸</span>
      <div className="font-mono text-sm">
        <span>{formatExifValue(exifData.iso, "ISO")}</span>
        <span className="mx-2">•</span>
        <span>{formatExifValue(exifData.fValue, "f/")}</span>
        <span className="mx-2">•</span>
        <span>{formatExifValue(exifData.shutterSpeed)}</span>
        <span className="mx-2">•</span>
        <span>
          {formatExifValue(
            exifData.exposureCompensation !== undefined &&
              exifData.exposureCompensation !== null &&
              exifData.exposureCompensation >= 0
              ? `+${exifData.exposureCompensation}`
              : exifData.exposureCompensation,
            "",
            "EV"
          )}
        </span>
      </div>
    </div>
  );
}
