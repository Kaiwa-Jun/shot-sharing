"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { updateProfile } from "@/app/actions/profiles";

interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ProfileEditClientProps {
  profile: Profile;
}

export function ProfileEditClient({ profile }: ProfileEditClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBack = () => {
    router.back();
  };

  const handleAvatarSelect = (file: File) => {
    setAvatarFile(file);
  };

  const handleAvatarClear = () => {
    setAvatarFile(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // バリデーション
    if (!displayName.trim()) {
      setError("表示名は必須です");
      return;
    }

    if (displayName.length > 50) {
      setError("表示名は50文字以内で入力してください");
      return;
    }

    if (bio.length > 500) {
      setError("自己紹介は500文字以内で入力してください");
      return;
    }

    // FormDataを作成
    const formData = new FormData();
    formData.append("display_name", displayName.trim());
    formData.append("bio", bio.trim());

    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    // Server Actionを呼び出し
    startTransition(async () => {
      try {
        const result = await updateProfile(formData);

        if (result.error) {
          setError(result.error);
        } else {
          // 成功したらプロフィール画面に戻る
          router.push("/me");
        }
      } catch (err) {
        console.error("プロフィール更新エラー:", err);
        setError("予期しないエラーが発生しました");
      }
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4">
          <button
            onClick={handleBack}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent"
            disabled={isPending}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold">プロフィール編集</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* フォーム */}
      <form onSubmit={handleSubmit} className="p-6">
        <div className="mx-auto max-w-md space-y-6">
          {/* アバター画像 */}
          <div>
            <AvatarUpload
              currentAvatarUrl={profile.avatar_url}
              onImageSelect={handleAvatarSelect}
              onImageClear={handleAvatarClear}
            />
          </div>

          {/* 表示名 */}
          <div className="space-y-2">
            <Label htmlFor="display_name">
              表示名 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="display_name"
              value={displayName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setDisplayName(e.target.value)
              }
              placeholder="表示名を入力"
              maxLength={50}
              disabled={isPending}
              required
            />
            <p className="text-xs text-muted-foreground">
              {displayName.length}/50文字
            </p>
          </div>

          {/* 自己紹介 */}
          <div className="space-y-2">
            <Label htmlFor="bio">自己紹介</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setBio(e.target.value)
              }
              placeholder="自己紹介を入力"
              rows={5}
              maxLength={500}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              {bio.length}/500文字
            </p>
          </div>

          {/* メールアドレス（編集不可） */}
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              value={profile.email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              メールアドレスは変更できません
            </p>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* 保存ボタン */}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "保存中..." : "保存"}
          </Button>
        </div>
      </form>
    </div>
  );
}
