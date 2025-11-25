import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/app/actions/profiles";
import { ProfileEditClient } from "./page-client";

// 動的レンダリングを強制
export const dynamic = "force-dynamic";

export default async function ProfileEditPage() {
  // サーバー側で認証状態を確認
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未認証の場合はログイン画面へリダイレクト
  if (!user) {
    redirect("/login");
  }

  // プロフィール情報を取得
  const { profile } = await getCurrentUserProfile();

  if (!profile) {
    redirect("/me");
  }

  return <ProfileEditClient profile={profile} />;
}
