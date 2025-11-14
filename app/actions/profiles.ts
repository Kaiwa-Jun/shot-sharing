"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * 全てのプロフィールを取得（テスト用）
 */
export async function getAllProfiles() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching profiles:", error);
    return { profiles: [], error: error.message };
  }

  return { profiles: data, error: null };
}

/**
 * 現在ログイン中のユーザーのプロフィールを取得
 */
export async function getCurrentUserProfile() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { profile: null, error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Error fetching current user profile:", error);
    return { profile: null, error: error.message };
  }

  return { profile: data, error: null };
}

/**
 * プロフィール数をカウント（テスト用）
 */
export async function getProfilesCount() {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Error counting profiles:", error);
    return { count: 0, error: error.message };
  }

  return { count, error: null };
}
