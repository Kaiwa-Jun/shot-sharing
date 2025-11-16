/**
 * カメラのExif情報の型定義
 */
export interface ExifData {
  // 撮影設定
  iso: number | null;
  f_value: number | null; // F値（絞り）
  shutter_speed: string | null; // シャッタースピード（例: "1/250"）
  exposure_compensation: number | null; // 露出補正
  focal_length: number | null; // 焦点距離（mm）
  white_balance: string | null; // ホワイトバランス

  // カメラ情報
  camera_make: string | null; // メーカー（例: "Canon"）
  camera_model: string | null; // モデル名（例: "EOS R5"）
  lens: string | null; // レンズ情報

  // メタ情報
  date_time: string | null; // 撮影日時
  width: number | null; // 画像幅
  height: number | null; // 画像高さ
}

/**
 * Exif情報の初期値
 */
export const DEFAULT_EXIF_DATA: ExifData = {
  iso: null,
  f_value: null,
  shutter_speed: null,
  exposure_compensation: null,
  focal_length: null,
  white_balance: null,
  camera_make: null,
  camera_model: null,
  lens: null,
  date_time: null,
  width: null,
  height: null,
};
