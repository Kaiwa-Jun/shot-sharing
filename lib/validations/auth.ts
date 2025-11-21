/**
 * 認証関連のバリデーション関数と型定義
 */

import { z } from "zod";

/**
 * メールアドレスのバリデーションスキーマ
 */
export const emailSchema = z
  .string()
  .min(1, "メールアドレスを入力してください")
  .email("有効なメールアドレスを入力してください");

/**
 * パスワードのバリデーションスキーマ
 * - 最低8文字
 * - 英数字を含むことを推奨（警告レベル）
 */
export const passwordSchema = z
  .string()
  .min(8, "パスワードは8文字以上で入力してください");

/**
 * パスワード確認のバリデーションスキーマ
 */
export const passwordConfirmSchema = z
  .string()
  .min(1, "パスワード（確認）を入力してください");

/**
 * ログインフォームのスキーマ
 */
export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "パスワードを入力してください"),
});

/**
 * 新規登録フォームのスキーマ
 */
export const signupFormSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    passwordConfirm: passwordConfirmSchema,
    termsAccepted: z.boolean().refine((val) => val === true, {
      message: "利用規約とプライバシーポリシーに同意してください",
    }),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "パスワードが一致しません",
    path: ["passwordConfirm"],
  });

/**
 * 型エクスポート
 */
export type LoginFormData = z.infer<typeof loginFormSchema>;
export type SignupFormData = z.infer<typeof signupFormSchema>;

/**
 * パスワード強度チェック
 * 英数字が含まれているかチェック（推奨レベル）
 */
export function checkPasswordStrength(password: string): {
  isStrong: boolean;
  message: string;
} {
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (hasLetter && hasNumber) {
    return {
      isStrong: true,
      message: "強度: 強",
    };
  }

  return {
    isStrong: false,
    message: "推奨: 英字と数字を組み合わせてください",
  };
}

/**
 * メールアドレスのフォーマットチェック
 */
export function isValidEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}
