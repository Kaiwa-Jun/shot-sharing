import { GoogleGenAI } from "@google/genai";

/**
 * File Search Store IDを取得
 */
export function getFileSearchStoreId(): string {
  const storeId = process.env.GEMINI_FILE_SEARCH_STORE_ID;
  if (!storeId) {
    throw new Error(
      "GEMINI_FILE_SEARCH_STORE_ID is not set in environment variables"
    );
  }
  return storeId;
}

/**
 * File Search用のクライアントを取得
 */
export function getFileSearchClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
  }

  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
}

/**
 * File Search Store の情報を取得
 */
export async function getFileSearchStoreInfo() {
  const client = getFileSearchClient();
  const storeId = getFileSearchStoreId();

  try {
    const store = await client.fileSearchStores.get({
      name: storeId,
    });
    return store;
  } catch (error) {
    console.error("File Search Store の取得に失敗しました:", error);
    throw error;
  }
}

/**
 * File Search Store に登録されているファイル一覧を取得
 * TODO: Phase 3で実装予定
 */
export async function listFilesInStore() {
  // const client = getFileSearchClient();
  // const storeId = getFileSearchStoreId();
  // Phase 3で実装予定
  console.warn("listFilesInStore は Phase 3 で実装予定です");
  return [];
}

/**
 * File Search Store からファイルを削除
 * TODO: Phase 3で実装予定
 */
export async function deleteFileFromStore(fileName: string) {
  // const client = getFileSearchClient();
  // Phase 3で実装予定
  console.warn("deleteFileFromStore は Phase 3 で実装予定です");
  return { success: true };
}
