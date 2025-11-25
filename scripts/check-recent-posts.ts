// @ts-nocheck
/**
 * 最近の投稿2件のデータベース情報とFile Search Store登録状況を確認
 */
import * as dotenv from "dotenv";
import * as path from "path";

// .env.localを読み込む（最初に実行）
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

async function checkRecentPosts() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ 環境変数が設定されていません");
    console.error("NEXT_PUBLIC_SUPABASE_URL:", !!supabaseUrl);
    console.error("SUPABASE_KEY:", !!supabaseKey);
    process.exit(1);
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY が設定されていません");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  console.log("=".repeat(80));
  console.log("最近の投稿を確認中...");
  console.log("=".repeat(80));

  // 最近の投稿2件を取得
  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(2);

  if (error || !posts) {
    console.error("投稿の取得エラー:", error);
    return;
  }

  console.log(`\n最近の投稿${posts.length}件を取得しました\n`);

  for (const post of posts) {
    console.log("-".repeat(80));
    console.log(`投稿ID: ${post.id}`);
    console.log(`作成日時: ${post.created_at}`);
    console.log(
      `file_search_store_id: ${post.file_search_store_id || "未設定"}`
    );
    console.log(`画像URL: ${post.image_url}`);
    console.log(
      `EXIF情報: ${post.exif_data ? JSON.stringify(post.exif_data, null, 2) : "なし"}`
    );

    // File Search Storeに登録されているか確認
    if (post.file_search_store_id) {
      try {
        console.log("\n🔍 File Search Storeの内容を確認中...");

        // file_search_store_idがドキュメントIDかどうかを判定
        const isDocumentId = post.file_search_store_id.includes("/documents/");
        const isOperationId =
          post.file_search_store_id.includes("/operations/");

        if (isDocumentId) {
          // 新しい形式: ドキュメントIDを直接取得
          try {
            const document = await ai.fileSearchStores.documents.get({
              documentName: post.file_search_store_id,
            });

            if (document) {
              console.log(`✅ File Search Store登録確認済み`);
              console.log(`  - ドキュメント名: ${document.name}`);
              console.log(`  - 表示名: ${document.displayName || "未設定"}`);
              console.log(`  - 状態: ${(document as any).state || "不明"}`);
            }
          } catch (docError) {
            console.log(`⚠️ ドキュメントが見つかりません`);
            console.error(
              "詳細エラー:",
              docError instanceof Error
                ? `${docError.name}: ${docError.message}`
                : JSON.stringify(docError)
            );

            // File Search Store全体のドキュメント一覧を取得して確認
            try {
              console.log(
                "\n📋 File Search Store全体のドキュメント一覧を確認中..."
              );
              const storeId = "fileSearchStores/shotsharingphotos-jixcwzgg7crd";
              const documents = await ai.fileSearchStores.documents.list({
                parent: storeId,
              });

              // イテレータを使って取得
              const docList: any[] = [];
              for await (const doc of documents) {
                docList.push(doc);
              }

              if (docList.length > 0) {
                console.log(`  合計 ${docList.length} 件のドキュメント:`);
                docList.forEach((doc: any, index: number) => {
                  console.log(
                    `    ${index + 1}. ${doc.name || doc.displayName}`
                  );
                  console.log(`       表示名: ${doc.displayName || "未設定"}`);
                  console.log(`       作成日時: ${doc.createTime || "不明"}`);
                });
              } else {
                console.log(`  ドキュメントが1件も登録されていません`);
              }
            } catch (listError) {
              console.error(
                "一覧取得エラー:",
                listError instanceof Error ? listError.message : listError
              );
            }
          }
        } else if (isOperationId) {
          // 古い形式: 操作ID（File Searchには登録されていない）
          console.log(`⚠️ 操作ID形式（古い形式）が保存されています`);
          console.log(
            `  File Search Storeにはドキュメントとして登録されていません`
          );
        } else {
          console.log(`⚠️ 不明な形式のfile_search_store_id`);
        }
      } catch (error) {
        console.error(
          "❌ File Search Store確認エラー:",
          error instanceof Error ? error.message : error
        );
      }
    } else {
      console.log(
        "\n⚠️ file_search_store_idが未設定のため、File Searchに登録されていません"
      );
    }

    console.log();
  }

  console.log("=".repeat(80));

  // Gemini Files APIに登録されているファイルを確認
  console.log("\n");
  console.log("=".repeat(80));
  console.log("Gemini Files APIに登録されているファイルを確認中...");
  console.log("=".repeat(80));

  try {
    const filesList = await ai.files.list();

    if (filesList && filesList.length > 0) {
      console.log(
        `\n✅ Gemini Files APIに${filesList.length}件のファイルが登録されています\n`
      );

      filesList.slice(0, 10).forEach((file: any, index: number) => {
        console.log(`${index + 1}. ファイル名: ${file.name}`);
        console.log(`   表示名: ${file.displayName || "未設定"}`);
        console.log(`   MIME Type: ${file.mimeType || "不明"}`);
        console.log(`   状態: ${file.state || "不明"}`);
        console.log(`   作成日時: ${file.createTime || "不明"}`);
        console.log("");
      });

      if (filesList.length > 10) {
        console.log(`... 他 ${filesList.length - 10} 件のファイル`);
      }
    } else {
      console.log("\n⚠️ Gemini Files APIにファイルが1件も登録されていません");
    }
  } catch (error) {
    console.error(
      "❌ Gemini Files API確認エラー:",
      error instanceof Error ? error.message : error
    );
  }

  console.log("=".repeat(80));
}

checkRecentPosts().catch((error) => {
  console.error("エラーが発生しました:", error);
  process.exit(1);
});
