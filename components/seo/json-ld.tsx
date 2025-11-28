import { siteConfig } from "@/lib/constants/site";
import { ExifData } from "@/lib/types/exif";

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
    description: description || "Shot Sharingで共有された写真作例",
    width: width ? { "@type": "QuantitativeValue", value: width } : undefined,
    height: height
      ? { "@type": "QuantitativeValue", value: height }
      : undefined,
    datePublished: createdAt,
    author: authorName
      ? {
          "@type": "Person",
          name: authorName,
        }
      : undefined,
  };

  // EXIF情報を追加
  if (exifData) {
    const exifProperties: Record<string, unknown> = {};

    if (exifData.cameraMake || exifData.cameraModel) {
      exifProperties.caption =
        `${exifData.cameraMake || ""} ${exifData.cameraModel || ""}`.trim();
    }

    // exifDataをextensionsとして追加
    if (Object.keys(exifProperties).length > 0) {
      jsonLd.exifData = {
        "@type": "PropertyValue",
        name: "EXIF Data",
        value: JSON.stringify({
          iso: exifData.iso,
          fValue: exifData.fValue,
          shutterSpeed: exifData.shutterSpeed,
          focalLength: exifData.focalLength,
          cameraMake: exifData.cameraMake,
          cameraModel: exifData.cameraModel,
          lens: exifData.lens,
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
    headline: title,
    description: description || "Shot Sharingで共有された写真作例",
    image: imageUrl,
    datePublished: createdAt,
    dateModified: updatedAt || createdAt,
    author: authorName
      ? {
          "@type": "Person",
          name: authorName,
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
