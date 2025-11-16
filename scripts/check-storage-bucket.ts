import { createClient } from "@supabase/supabase-js";

async function checkAndCreateBucket() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ 環境変数が設定されていません");
    console.log("必要な環境変数:");
    console.log("- NEXT_PUBLIC_SUPABASE_URL");
    console.log("- SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  // Service Role Keyを使用してSupabaseクライアントを作成（管理者権限）
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log("📦 Storageバケットを確認中...\n");

  // バケット一覧を取得
  const { data: buckets, error: listError } =
    await supabase.storage.listBuckets();

  if (listError) {
    console.error("❌ バケット一覧の取得に失敗しました:", listError);
    process.exit(1);
  }

  console.log("📋 既存のバケット一覧:");
  buckets?.forEach((bucket) => {
    console.log(`  - ${bucket.name} (public: ${bucket.public})`);
  });
  console.log();

  // photosバケットが存在するか確認
  const photosBucket = buckets?.find((b) => b.name === "photos");

  if (photosBucket) {
    console.log("✅ 'photos' バケットは既に存在します");
    console.log(`   Public: ${photosBucket.public}`);
    console.log(`   ID: ${photosBucket.id}`);
  } else {
    console.log("⚠️  'photos' バケットが見つかりません");
    console.log("📦 'photos' バケットを作成中...\n");

    // バケットを作成
    const { data, error: createError } = await supabase.storage.createBucket(
      "photos",
      {
        public: true,
        fileSizeLimit: 10485760, // 10MB
      }
    );

    if (createError) {
      console.error("❌ バケットの作成に失敗しました:", createError);
      process.exit(1);
    }

    console.log("✅ 'photos' バケットを作成しました");
    console.log(`   Name: ${data.name}`);
  }

  console.log("\n🔒 ストレージポリシーを確認中...");
  console.log(
    "   Supabase Dashboardで以下のポリシーが設定されていることを確認してください:"
  );
  console.log("   1. Public Access (SELECT) - すべてのユーザーが閲覧可能");
  console.log(
    "   2. Authenticated Upload (INSERT) - 認証ユーザーがアップロード可能"
  );
  console.log("\n✅ 完了");
}

checkAndCreateBucket();
