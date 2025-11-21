"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginFormSchema, signupFormSchema } from "@/lib/validations/auth";

/**
 * メールアドレスとパスワードでログイン
 */
export async function signInWithEmail(formData: FormData) {
  const supabase = await createClient();

  try {
    // フォームデータの取得
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // バリデーション
    const result = loginFormSchema.safeParse({ email, password });
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      const firstError =
        errors.email?.[0] ||
        errors.password?.[0] ||
        "入力内容を確認してください";
      return { success: false, error: firstError };
    }

    // ログイン処理
    const { error } = await supabase.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    });

    if (error) {
      console.error("ログインエラー:", error);

      // エラーメッセージを日本語化
      if (error.message.includes("Invalid login credentials")) {
        return {
          success: false,
          error: "メールアドレスまたはパスワードが正しくありません",
        };
      }

      if (error.message.includes("Email not confirmed")) {
        return {
          success: false,
          error:
            "メールアドレスが確認されていません。確認メールをご確認ください",
        };
      }

      return { success: false, error: "ログインに失敗しました" };
    }

    // 成功時はリダイレクト
    revalidatePath("/", "layout");
    return { success: true, error: null, redirect: "/" };
  } catch (error) {
    console.error("ログイン処理エラー:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "予期しないエラーが発生しました",
    };
  }
}

/**
 * メールアドレスとパスワードで新規登録
 */
export async function signUpWithEmail(formData: FormData) {
  const supabase = await createClient();

  try {
    // フォームデータの取得
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const passwordConfirm = formData.get("passwordConfirm") as string;
    const termsAccepted = formData.get("termsAccepted") === "true";

    console.log("🔍 [signUpWithEmail] 開始");
    console.log("📧 Email:", email);
    console.log("✅ Terms Accepted:", termsAccepted);

    // バリデーション
    const result = signupFormSchema.safeParse({
      email,
      password,
      passwordConfirm,
      termsAccepted,
    });

    if (!result.success) {
      console.error(
        "❌ [signUpWithEmail] バリデーションエラー:",
        result.error.flatten()
      );
      const errors = result.error.flatten().fieldErrors;
      const firstError =
        errors.email?.[0] ||
        errors.password?.[0] ||
        errors.passwordConfirm?.[0] ||
        errors.termsAccepted?.[0] ||
        "入力内容を確認してください";
      return { success: false, error: firstError };
    }

    console.log("✅ [signUpWithEmail] バリデーション成功");

    // 新規登録処理
    console.log("🔐 [signUpWithEmail] signUp 実行中...");
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
    });

    console.log("📊 [signUpWithEmail] signUp 結果:");
    console.log("  - error:", error);
    console.log("  - user:", signUpData?.user?.id);
    console.log(
      "  - session:",
      signUpData?.session ? "存在する" : "存在しない"
    );

    if (error) {
      console.error("❌ [signUpWithEmail] 新規登録エラー:", error);

      // エラーメッセージを日本語化
      if (error.message.includes("User already registered")) {
        return {
          success: false,
          error: "このメールアドレスは既に登録されています",
        };
      }

      if (error.message.includes("Password should be at least")) {
        return {
          success: false,
          error: "パスワードは8文字以上で入力してください",
        };
      }

      return { success: false, error: "登録に失敗しました" };
    }

    // ユーザーが作成されたことを確認
    if (!signUpData.user) {
      console.error("❌ [signUpWithEmail] ユーザーが作成されませんでした");
      return { success: false, error: "登録に失敗しました" };
    }

    // セッションが作成されなかった場合、明示的にログインする
    if (!signUpData.session) {
      console.log(
        "⚠️ [signUpWithEmail] セッションが作成されなかったため、明示的にログイン中..."
      );
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: result.data.email,
          password: result.data.password,
        });

      console.log("📊 [signUpWithEmail] signIn 結果:");
      console.log("  - error:", signInError);
      console.log(
        "  - session:",
        signInData?.session ? "存在する" : "存在しない"
      );

      if (signInError) {
        console.error("❌ [signUpWithEmail] ログインエラー:", signInError);
        return {
          success: false,
          error:
            "ログインに失敗しました。メールアドレスの確認が必要な可能性があります。",
        };
      }

      if (!signInData.session) {
        console.error(
          "❌ [signUpWithEmail] ログイン後もセッションが作成されませんでした"
        );
        return {
          success: false,
          error:
            "ログインに失敗しました。メールアドレスの確認が必要な可能性があります。",
        };
      }
    }

    console.log("✅ [signUpWithEmail] 登録成功、リダイレクト中...");
    // 成功時はホームにリダイレクト
    revalidatePath("/", "layout");
    redirect("/");
  } catch (error) {
    // NEXT_REDIRECT エラーは再スロー（これは正常なリダイレクト）
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }

    console.error("新規登録処理エラー:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "予期しないエラーが発生しました",
    };
  }
}

/**
 * ログアウト
 */
export async function signOut() {
  const supabase = await createClient();

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("ログアウトエラー:", error);
      return { success: false, error: "ログアウトに失敗しました" };
    }

    revalidatePath("/", "layout");
    return { success: true, error: null, redirect: "/" };
  } catch (error) {
    console.error("ログアウト処理エラー:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "予期しないエラーが発生しました",
    };
  }
}
