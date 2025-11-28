import { siteConfig } from "@/lib/constants/site";
import { ExifData } from "@/lib/types/exif";

/**
 * 文字列をJSON-LD用にサニタイズ
 * JSON.stringifyでエスケープされるが、追加の安全対策として特殊文字を処理
 */
function sanitizeString(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

interface WebSiteJsonLdProps {
  url?: string;
}

export function WebSiteJsonLd({ url = siteConfig.url }: WebSiteJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    description: siteConfig.description,
    url: url,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${url}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface ImageObjectJsonLdProps {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  description?: string | null;
  exifData?: ExifData | null;
  width?: number | null;
  height?: number | null;
  createdAt?: string | null;
  authorName?: string;
}

export function ImageObjectJsonLd({
  id,
  imageUrl,
  thumbnailUrl,
  description,
  exifData,
  width,
  height,
  createdAt,
  authorName,
}: ImageObjectJsonLdProps) {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    "@id": `${siteConfig.url}/posts/${id}#image`,
    url: imageUrl,
    contentUrl: imageUrl,
    thumbnailUrl: thumbnailUrl || imageUrl,
    description:
      sanitizeString(description) || "Shot Sharingで共有された写真作例",
    width: width ? { "@type": "QuantitativeValue", value: width } : undefined,
    height: height
      ? { "@type": "QuantitativeValue", value: height }
      : undefined,
    datePublished: createdAt,
    author: authorName
      ? {
          "@type": "Person",
          name: sanitizeString(authorName),
        }
      : undefined,
  };

  // EXIF情報を追加
  if (exifData) {
    // EXIFデータに有効な値があるかチェック
    const hasExifData =
      exifData.iso ||
      exifData.fValue ||
      exifData.shutterSpeed ||
      exifData.focalLength ||
      exifData.cameraMake ||
      exifData.cameraModel ||
      exifData.lens;

    if (hasExifData) {
      jsonLd.exifData = {
        "@type": "PropertyValue",
        name: "EXIF Data",
        value: JSON.stringify({
          iso: exifData.iso,
          fValue: exifData.fValue,
          shutterSpeed: exifData.shutterSpeed,
          focalLength: exifData.focalLength,
          cameraMake: sanitizeString(exifData.cameraMake),
          cameraModel: sanitizeString(exifData.cameraModel),
          lens: sanitizeString(exifData.lens),
        }),
      };
    }
  }

  // undefined値を削除
  const cleanedJsonLd = Object.fromEntries(
    Object.entries(jsonLd).filter(([, v]) => v !== undefined)
  );

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanedJsonLd) }}
    />
  );
}

interface ArticleJsonLdProps {
  id: string;
  title: string;
  description?: string | null;
  imageUrl: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  authorName?: string;
}

export function ArticleJsonLd({
  id,
  title,
  description,
  imageUrl,
  createdAt,
  updatedAt,
  authorName,
}: ArticleJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${siteConfig.url}/posts/${id}`,
    headline: sanitizeString(title),
    description:
      sanitizeString(description) || "Shot Sharingで共有された写真作例",
    image: imageUrl,
    datePublished: createdAt,
    dateModified: updatedAt || createdAt,
    author: authorName
      ? {
          "@type": "Person",
          name: sanitizeString(authorName),
        }
      : {
          "@type": "Organization",
          name: siteConfig.name,
        },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.url}/logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteConfig.url}/posts/${id}`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
