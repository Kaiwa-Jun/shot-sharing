import { describe, it, expect, beforeAll } from "vitest";
import {
  getFileSearchStoreId,
  getFileSearchStoreInfo,
} from "@/lib/gemini/file-search";

describe("File Search API", () => {
  beforeAll(() => {
    // ��	pL-�U�fD�K��
    if (!process.env.GEMINI_FILE_SEARCH_STORE_ID) {
      console.warn("�  GEMINI_FILE_SEARCH_STORE_ID L-�U�fD~[�ƹȒ����W~Y");
    }
  });

  it("File Search Store ID L֗gM�Sh", () => {
    if (!process.env.GEMINI_FILE_SEARCH_STORE_ID) {
      console.log("�  ƹȹ���: ��	p*-�");
      return;
    }

    const storeId = getFileSearchStoreId();
    expect(storeId).toBeTruthy();
    expect(typeof storeId).toBe("string");
  });

  it("File Search Store n�1L֗gM�Sh", async () => {
    if (!process.env.GEMINI_FILE_SEARCH_STORE_ID) {
      console.log("�  ƹȹ���: ��	p*-�");
      return;
    }

    const storeInfo = await getFileSearchStoreInfo();
    expect(storeInfo).toBeTruthy();
    expect(storeInfo.name).toBe(getFileSearchStoreId());
    expect(storeInfo.displayName).toBe("shot-sharing-photos");
  });
});
