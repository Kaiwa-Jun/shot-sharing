import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

async function verify() {
  const docName =
    "fileSearchStores/shotsharingphotos-jixcwzgg7crd/documents/o9bge2glpyzu-s2prns24huox";
  console.log("🔍 ドキュメントの存在確認:", docName);

  try {
    const file = await ai.files.get({ name: docName });
    console.log("✅ ドキュメント存在確認!");
    console.log("  - Display Name:", file.displayName);
    console.log("  - State:", file.state);
    console.log("  - MIME Type:", file.mimeType);
    console.log("  - Size:", file.sizeBytes, "bytes");
  } catch (e: any) {
    console.log("❌ ドキュメント不在:", e.message);
  }
}
verify();
