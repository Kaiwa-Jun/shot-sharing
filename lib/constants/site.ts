export const siteConfig = {
  name: "Shot Sharing",
  description:
    "写真の作例を共有し、撮影設定から類似写真を検索できるAIフォトシェアリングプラットフォーム",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://shotsharing.me",
  ogImage: "/og-image.png",
  creator: "Shot Sharing Team",
  keywords: [
    "フォトシェアリング",
    "写真撮影",
    "写真",
    "画像",
    "撮影",
    "検索",
    "類似",
    "AI",
    "カメラ",
    "一眼レフ",
    "ミラーレス",
    "設定",
    "設定値",
    "EXIF",
    "F値",
    "絞り",
    "シャッタースピード",
    "ISO",
    "露光",
  ],
  links: {
    twitter: "https://twitter.com/shotsharing",
  },
} as const;

export type SiteConfig = typeof siteConfig;
