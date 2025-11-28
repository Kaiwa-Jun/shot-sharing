export const siteConfig = {
  name: "Shot Sharing",
  description:
    "写真の作例を共有し、撮影設定から類似写真を検索できるAIフォトシェアリングプラットフォーム",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://shotsharing.me",
  ogImage: "/og-image.png",
  creator: "Shot Sharing Team",
  keywords: [
    "写真共有",
    "フォトシェアリング",
    "カメラ",
    "撮影設定",
    "EXIF",
    "作例",
    "AI検索",
    "類似画像検索",
  ],
  links: {
    twitter: "https://twitter.com/shotsharing",
  },
} as const;

export type SiteConfig = typeof siteConfig;
