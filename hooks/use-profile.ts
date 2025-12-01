"use client";

import useSWR from "swr";
import { PhotoCardProps } from "@/components/gallery/photo-card";

interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ProfileData {
  profile: Profile | null;
  postsCount: number;
  savedCount: number;
  userId: string;
}

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "データの取得に失敗しました");
  }
  const json: ApiResponse<T> = await res.json();
  if (json.error) {
    throw new Error(json.error);
  }
  return json.data as T;
};

/**
 * プロフィール情報を取得するフック（1分間キャッシュ）
 */
export function useProfile() {
  const { data, error, isLoading, mutate } = useSWR<ProfileData>(
    "/api/users/me/profile",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1分間キャッシュ
      errorRetryCount: 2,
    }
  );

  return {
    profile: data?.profile || null,
    postsCount: data?.postsCount || 0,
    savedCount: data?.savedCount || 0,
    userId: data?.userId || "",
    isLoading,
    error,
    mutate,
  };
}

/**
 * 自分の投稿一覧を取得するフック（30秒間キャッシュ）
 */
export function useUserPosts(limit: number = 10) {
  const { data, error, isLoading, mutate } = useSWR<PhotoCardProps[]>(
    `/api/users/me/posts?limit=${limit}&offset=0`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30秒間キャッシュ
      errorRetryCount: 2,
    }
  );

  return {
    posts: data || [],
    isLoading,
    error,
    mutate,
  };
}

/**
 * 保存した投稿一覧を取得するフック（30秒間キャッシュ）
 */
export function useUserSaves(limit: number = 10) {
  const { data, error, isLoading, mutate } = useSWR<PhotoCardProps[]>(
    `/api/users/me/saves?limit=${limit}&offset=0`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30秒間キャッシュ
      errorRetryCount: 2,
    }
  );

  return {
    saves: data || [],
    isLoading,
    error,
    mutate,
  };
}
