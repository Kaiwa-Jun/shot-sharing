"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { signupFormSchema, type SignupFormData } from "@/lib/validations/auth";
import { signUpWithEmail } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { checkPasswordStrength } from "@/lib/validations/auth";

interface SignupFormProps {
  onClose?: () => void;
  redirectPath?: string;
  onTermsClick?: () => void;
  onPrivacyClick?: () => void;
}

export function SignupForm({
  onClose,
  redirectPath,
  onTermsClick,
  onPrivacyClick,
}: SignupFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<{
    isStrong: boolean;
    message: string;
  } | null>(null);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      email: "",
      password: "",
      passwordConfirm: "",
      termsAccepted: false,
    },
  });

  // 利用規約の同意状態を監視
  const termsAccepted = form.watch("termsAccepted");

  const onSubmit = async (data: SignupFormData) => {
    console.log("🚀 [SignupForm] フォーム送信開始");
    console.log("📝 フォームデータ:", {
      email: data.email,
      termsAccepted: data.termsAccepted,
    });

    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.append("email", data.email);
      formData.append("password", data.password);
      formData.append("passwordConfirm", data.passwordConfirm);
      formData.append("termsAccepted", String(data.termsAccepted));

      console.log("📤 [SignupForm] Server Action 呼び出し中...");
      const result = await signUpWithEmail(formData);

      console.log("📥 [SignupForm] Server Action 結果:", result);

      if (result?.error) {
        console.error("❌ [SignupForm] エラー:", result.error);
        setError(result.error);
        return;
      }

      console.log("✅ [SignupForm] 成功");
      // 成功時は redirect() により自動的にリダイレクトされる
    });
  };

  const handleGoogleSignup = async () => {
    try {
      setIsGoogleLoading(true);
      setError(null);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback${redirectPath ? `?next=${encodeURIComponent(redirectPath)}` : ""}`,
        },
      });

      if (error) {
        console.error("Google登録エラー:", error);
        setError("Google登録に失敗しました");
        setIsGoogleLoading(false);
      }
    } catch (error) {
      console.error("Google登録エラー:", error);
      setError("Google登録に失敗しました");
      setIsGoogleLoading(false);
    }
  };

  const handlePasswordChange = (value: string) => {
    if (value.length >= 8) {
      setPasswordStrength(checkPasswordStrength(value));
    } else {
      setPasswordStrength(null);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-md bg-green-500/15 p-3 text-sm text-green-600 dark:text-green-400">
          {successMessage}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>メールアドレス</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="example@example.com"
                    autoComplete="email"
                    disabled={isPending || isGoogleLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>パスワード</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="8文字以上"
                    autoComplete="new-password"
                    disabled={isPending || isGoogleLoading}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      handlePasswordChange(e.target.value);
                    }}
                  />
                </FormControl>
                {passwordStrength && (
                  <FormDescription
                    className={
                      passwordStrength.isStrong
                        ? "text-green-600 dark:text-green-400"
                        : "text-yellow-600 dark:text-yellow-400"
                    }
                  >
                    {passwordStrength.message}
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="passwordConfirm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>パスワード（確認）</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="パスワードを再入力"
                    autoComplete="new-password"
                    disabled={isPending || isGoogleLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="termsAccepted"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isPending || isGoogleLoading}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-sm font-normal">
                    {onTermsClick && onPrivacyClick ? (
                      <>
                        <button
                          type="button"
                          onClick={onTermsClick}
                          className="underline hover:text-foreground"
                        >
                          利用規約
                        </button>
                        と
                        <button
                          type="button"
                          onClick={onPrivacyClick}
                          className="underline hover:text-foreground"
                        >
                          プライバシーポリシー
                        </button>
                        に同意する
                      </>
                    ) : (
                      <>
                        <a
                          href="/terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-foreground"
                        >
                          利用規約
                        </a>
                        と
                        <a
                          href="/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-foreground"
                        >
                          プライバシーポリシー
                        </a>
                        に同意する
                      </>
                    )}
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full"
            disabled={isPending || isGoogleLoading || !termsAccepted}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                登録中...
              </span>
            ) : (
              "新規登録"
            )}
          </Button>
        </form>
      </Form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            または
          </span>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignup}
        disabled={isPending || isGoogleLoading}
      >
        {isGoogleLoading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            登録中...
          </span>
        ) : (
          "Googleで登録"
        )}
      </Button>
    </div>
  );
}
