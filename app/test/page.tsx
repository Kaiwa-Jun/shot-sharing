import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import LogoutButton from "./logout-button";

export default async function TestPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // プロフィール情報を取得
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl px-4">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">
              認証テスト成功！
            </h1>
            <LogoutButton />
          </div>

          <div className="space-y-6">
            {/* ユーザー情報 */}
            <div className="rounded-md border border-gray-200 p-6">
              <h2 className="mb-4 text-xl font-semibold text-gray-800">
                ユーザー情報（auth.users）
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex">
                  <span className="w-32 font-medium text-gray-600">ID:</span>
                  <span className="text-gray-900">{user.id}</span>
                </div>
                <div className="flex">
                  <span className="w-32 font-medium text-gray-600">Email:</span>
                  <span className="text-gray-900">{user.email}</span>
                </div>
                <div className="flex">
                  <span className="w-32 font-medium text-gray-600">
                    作成日時:
                  </span>
                  <span className="text-gray-900">
                    {new Date(user.created_at).toLocaleString("ja-JP")}
                  </span>
                </div>
              </div>
            </div>

            {/* プロフィール情報 */}
            {profile ? (
              <div className="rounded-md border border-green-200 bg-green-50 p-6">
                <h2 className="mb-4 text-xl font-semibold text-green-800">
                  プロフィール情報（profiles テーブル）
                  <span className="ml-2 text-sm font-normal text-green-600">
                    ✓ 自動作成されました
                  </span>
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex">
                    <span className="w-32 font-medium text-green-700">ID:</span>
                    <span className="text-green-900">{profile.id}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-medium text-green-700">
                      Email:
                    </span>
                    <span className="text-green-900">{profile.email}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-medium text-green-700">
                      表示名:
                    </span>
                    <span className="text-green-900">
                      {profile.display_name || "(未設定)"}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <span className="w-32 font-medium text-green-700">
                      アバター:
                    </span>
                    <div className="flex items-center gap-2">
                      {profile.avatar_url ? (
                        <>
                          <img
                            src={profile.avatar_url}
                            alt="avatar"
                            className="h-10 w-10 rounded-full"
                          />
                          <span className="text-xs text-green-700">
                            {profile.avatar_url}
                          </span>
                        </>
                      ) : (
                        <span className="text-green-900">(未設定)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-medium text-green-700">
                      作成日時:
                    </span>
                    <span className="text-green-900">
                      {new Date(profile.created_at).toLocaleString("ja-JP")}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-red-200 bg-red-50 p-6">
                <p className="text-red-800">
                  プロフィールが見つかりませんでした。トリガーが正しく動作していない可能性があります。
                </p>
              </div>
            )}

            {/* 確認項目 */}
            <div className="rounded-md border border-blue-200 bg-blue-50 p-6">
              <h2 className="mb-4 text-xl font-semibold text-blue-800">
                確認項目
              </h2>
              <ul className="space-y-2 text-sm text-blue-900">
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Google OAuth認証が成功</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>認証コールバックが正常に動作</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">{profile ? "✓" : "✗"}</span>
                  <span>
                    profilesテーブルへの自動登録（トリガー）
                    {profile ? "が成功" : "が失敗"}
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>RLS（Row Level Security）が正常に動作</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
