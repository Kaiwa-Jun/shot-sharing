export const siteConfig = {
  name: "Shot Sharing",
  fullTitle: "Shot Sharing | カメラ設定検索サービス",
  description:
    "カメラ初心者向けの撮影設定検索サービス。撮りたいシーンを入力するだけで、AIが最適なカメラ設定（F値・ISO・シャッタースピード）を提案。作例からも設定を学べる、写真撮影サポートプラットフォーム。",
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
