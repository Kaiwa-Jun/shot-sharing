/**
 * カメラ設定の型定義
 */
export interface CameraSettings {
  iso?: string;
  aperture?: string;
  shutterSpeed?: string;
  focalLength?: string;
  camera?: string;
  lens?: string;
}

/**
 * パース済みAI回答の型定義
 */
export interface ParsedAIResponse {
  /**
   * カメラ設定セクション
   */
  cameraSettings?: CameraSettings;

  /**
   * 撮影のポイント（本文）
   */
  shootingPoint?: string;

  /**
   * 撮影のコツ（箇条書きリスト）
   */
  tips?: string[];

  /**
   * その他のコンテンツ（構造化されていない部分）
   */
  otherContent?: string;

  /**
   * 元の生回答
   */
  rawContent: string;
}
