/**
 * Gemini File Search API 関連の機能
 *
 * このファイルは将来的にFile Search APIを使用する際の
 * 実装の基盤となります。
 *
 * 参考: doc/technical-architecture.md
 * - RAG検索: Gemini File Search API使用
 * - 登録単位: 1写真 = 画像ファイル + メタJSON
 * - 検索方式: マルチモーダル（テキスト/画像/併用）
 */

// このファイルは将来実装予定のため、現在は使用していません
// File Search API実装時にGemini SDKのインポートを追加します

/**
 * ファイルをアップロード（画像・JSON等）
 *
 * @param filePath ファイルパス
 * @param mimeType MIMEタイプ
 * @param displayName 表示名
 */
export async function uploadFile(
  filePath: string,
  mimeType: string,
  displayName?: string
) {
  // TODO: 実装予定
  // const uploadResult = await fileManager.uploadFile(filePath, {
  //   mimeType,
  //   displayName,
  // })
  // return uploadResult.file

  console.log("File upload functionality will be implemented later");
  return null;
}

/**
 * アップロードしたファイルの状態を確認
 *
 * @param fileName ファイル名
 */
export async function getFileStatus(fileName: string) {
  // TODO: 実装予定
  // const file = await fileManager.getFile(fileName)
  // return file.state === FileState.ACTIVE

  console.log("File status check functionality will be implemented later");
  return false;
}

/**
 * File Search Storeを作成
 *
 * @param displayName ストア名
 */
export async function createFileSearchStore(displayName: string) {
  // TODO: 実装予定
  // MVP実装時に File Search Store の作成機能を追加

  console.log("File Search Store creation will be implemented later");
  return null;
}

/**
 * File Search Storeにファイルを追加
 *
 * @param storeId ストアID
 * @param fileUri ファイルURI
 */
export async function addFileToStore(storeId: string, fileUri: string) {
  // TODO: 実装予定
  // MVP実装時に File Search Store へのファイル追加機能を実装

  console.log("Add file to store functionality will be implemented later");
  return null;
}

/**
 * File Search Storeで検索
 *
 * @param storeId ストアID
 * @param query 検索クエリ（テキスト）
 * @param imageFile 検索クエリ（画像、オプション）
 */
export async function searchInStore(
  storeId: string,
  query: string,
  imageFile?: string
) {
  // TODO: 実装予定
  // MVP実装時に File Search API による検索機能を実装

  console.log("File Search functionality will be implemented later");
  return [];
}
