# OAuth認証後のブラウザ履歴問題 - 解決方法

## 問題の概要

詳細画面でログインした後、左スワイプ（ブラウザバック）するとGoogle認証のGmail選択画面に戻ってしまう。

### 現在のブラウザ履歴

1. 詳細画面 (`/post/123`)
2. ログインページ (`/login?redirect=/post/123`)
3. **Google認証画面 (Gmail選択画面)** ← ここが残っている
4. `/auth/callback?code=...` → `window.location.replace()` で詳細画面に置き換え
5. 詳細画面 (`/post/123`)

左スワイプで3のGoogle認証画面に戻ってしまう。

---

## 解決方法1: 履歴クリーンアップ方式（推奨）

### 概要

- OAuth認証フロー全体の履歴をクリーンアップする
- モバイルブラウザで確実に動作
- スマホでは全画面遷移が自然なUX

### 実装方法

#### 1. `app/login/page-client.tsx`の修正

```typescript
const handleGoogleLogin = async () => {
  try {
    setIsLoading(true);

    // 認証開始前の履歴の長さを保存
    // この情報を使って、認証完了後に適切な履歴操作を行う
    sessionStorage.setItem(
      "historyLengthBeforeAuth",
      String(window.history.length)
    );
    sessionStorage.setItem(
      "originBeforeAuth",
      window.location.pathname + window.location.search
    );

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectPath)}`,
      },
    });

    if (error) {
      console.error("ログインエラー:", error);
      alert("ログインに失敗しました。もう一度お試しください。");
      // エラー時はsessionStorageをクリア
      sessionStorage.removeItem("historyLengthBeforeAuth");
      sessionStorage.removeItem("originBeforeAuth");
    }
  } catch (error) {
    console.error("ログインエラー:", error);
    alert("ログインに失敗しました。もう一度お試しください。");
    sessionStorage.removeItem("historyLengthBeforeAuth");
    sessionStorage.removeItem("originBeforeAuth");
  } finally {
    setIsLoading(false);
  }
};
```

#### 2. `app/auth/callback/page.tsx`の修正

```typescript
"use client";

import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const next = searchParams.get("next") || "/";

      if (code) {
        const supabase = createClient();
        await supabase.auth.exchangeCodeForSession(code);
      }

      // 履歴のクリーンアップ
      const historyLengthBeforeAuth = sessionStorage.getItem('historyLengthBeforeAuth');
      const originBeforeAuth = sessionStorage.getItem('originBeforeAuth');

      // sessionStorageから削除
      sessionStorage.removeItem('historyLengthBeforeAuth');
      sessionStorage.removeItem('originBeforeAuth');

      if (historyLengthBeforeAuth) {
        const beforeLength = parseInt(historyLengthBeforeAuth, 10);
        const currentLength = window.history.length;
        const authPagesCount = currentLength - beforeLength;

        // OAuth認証フロー中に追加された履歴エントリの数だけ戻る
        // その後、リダイレクト先に遷移することで、認証フロー全体を履歴から削除
        if (authPagesCount > 0) {
          // history.go()で戻ってから、新しいページに遷移
          // これにより認証フロー全体が履歴から消える
          window.history.go(-(authPagesCount + 1)); // ログインページより前に戻る

          // 少し待ってからリダイレクト先に遷移
          setTimeout(() => {
            window.location.replace(next);
          }, 100);
          return;
        }
      }

      // フォールバック: sessionStorageが取得できない場合
      window.location.replace(next);
    };

    handleCallback();
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">ログイン中...</p>
      </div>
    </div>
  );
}
```

### メリット

- ✅ モバイルブラウザで確実に動作
- ✅ popupブロッカーの影響を受けない
- ✅ スマホでは全画面遷移の方が自然なUX
- ✅ 実装がシンプル

### デメリット

- ❌ 履歴操作が若干複雑
- ❌ ブラウザによって微妙に挙動が異なる可能性

---

## 解決方法2: Popup方式

### 概要

- OAuth認証をpopupウィンドウで実行
- メインウィンドウの履歴が一切汚れない

### 実装方法

#### 1. `app/login/page-client.tsx`の修正

```typescript
const handleGoogleLogin = async () => {
  try {
    setIsLoading(true);

    // Popup用のURL作成
    const redirectUrl = `${window.location.origin}/auth/callback-popup`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true, // ブラウザのリダイレクトをスキップ
      },
    });

    if (error) {
      console.error("ログインエラー:", error);
      alert("ログインに失敗しました。もう一度お試しください。");
      setIsLoading(false);
      return;
    }

    if (!data.url) {
      alert("認証URLの取得に失敗しました。");
      setIsLoading(false);
      return;
    }

    // Popupウィンドウを開く
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      data.url,
      "google-auth",
      `width=${width},height=${height},left=${left},top=${top},popup=yes`
    );

    if (!popup) {
      alert(
        "ポップアップがブロックされました。ポップアップブロッカーを無効にしてください。"
      );
      setIsLoading(false);
      return;
    }

    // Popupからのメッセージを待つ
    const handleMessage = (event: MessageEvent) => {
      // セキュリティ: 自分のオリジンからのメッセージのみ受け入れる
      if (event.origin !== window.location.origin) return;

      if (event.data.type === "auth-success") {
        // 認証成功
        popup?.close();
        window.removeEventListener("message", handleMessage);
        setIsLoading(false);

        // リダイレクト先に遷移
        router.push(redirectPath);
      } else if (event.data.type === "auth-error") {
        // 認証エラー
        popup?.close();
        window.removeEventListener("message", handleMessage);
        setIsLoading(false);
        alert("ログインに失敗しました。もう一度お試しください。");
      }
    };

    window.addEventListener("message", handleMessage);

    // Popupが閉じられた場合の処理
    const checkPopupClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkPopupClosed);
        window.removeEventListener("message", handleMessage);
        setIsLoading(false);
      }
    }, 500);
  } catch (error) {
    console.error("ログインエラー:", error);
    alert("ログインに失敗しました。もう一度お試しください。");
    setIsLoading(false);
  }
};
```

#### 2. `app/auth/callback-popup/page.tsx`を新規作成

```typescript
"use client";

import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function AuthCallbackPopupPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");

      if (code) {
        const supabase = createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          // 親ウィンドウにエラーを通知
          window.opener?.postMessage({ type: 'auth-error', error }, window.location.origin);
        } else {
          // 親ウィンドウに成功を通知
          window.opener?.postMessage({ type: 'auth-success' }, window.location.origin);
        }
      } else {
        // codeがない場合はエラー
        window.opener?.postMessage({ type: 'auth-error' }, window.location.origin);
      }

      // このウィンドウは親ウィンドウ側で閉じられる
    };

    handleCallback();
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">認証を完了しています...</p>
      </div>
    </div>
  );
}
```

### メリット

- ✅ メインウィンドウの履歴が一切汚れない
- ✅ ユーザーは元のページにとどまる
- ✅ 認証完了後、popupを閉じるだけで済む

### デメリット

- ❌ **モバイルブラウザでpopupがブロックされることが多い**
- ❌ iOS SafariやAndroid Chromeでpopupの挙動が不安定
- ❌ ユーザーがpopupブロッカーを有効にしている場合、機能しない
- ❌ 小さい画面でpopupとメインウィンドウの切り替えが煩雑

---

## 推奨

**スマホ中心のアプリケーション**では、**履歴クリーンアップ方式（方法1）**を推奨します。

理由：

- モバイルブラウザで確実に動作
- popupブロッカーの影響を受けない
- スマホでは全画面遷移が自然なUX

デスクトップ対応を強化する場合は、デバイス判定でpopup方式と併用することも検討できます。
