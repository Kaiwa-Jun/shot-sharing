/**
 * カメラのExif情報の型定義
 */
export interface ExifData {
  // 撮影設定
  iso?: number | null;
  fValue?: number | null; // F値（絞り）
  shutterSpeed?: string | null; // シャッタースピード（例: "1/250"）
  exposureCompensation?: number | null; // 露出補正
  focalLength?: number | null; // 焦点距離（mm）
  whiteBalance?: string | null; // ホワイトバランス

  // カメラ情報
  cameraMake?: string | null; // メーカー（例: "Canon"）
  cameraModel?: string | null; // モデル名（例: "EOS R5"）
  lens?: string | null; // レンズ情報

  // メタ情報
  dateTime?: string | null; // 撮影日時
  width?: number | null; // 画像幅
  height?: number | null; // 画像高さ
}

/**
 * Exif情報の初期値
 */
export const DEFAULT_EXIF_DATA: ExifData = {
  iso: null,
  fValue: null,
  shutterSpeed: null,
  exposureCompensation: null,
  focalLength: null,
  whiteBalance: null,
  cameraMake: null,
  cameraModel: null,
  lens: null,
  dateTime: null,
  width: null,
  height: null,
};
