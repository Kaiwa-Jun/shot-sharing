"use client";

import { motion } from "framer-motion";
import { Plus, User } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { LoginPromptModal } from "@/components/auth/login-prompt-modal";
import { PostModal } from "@/components/posts/post-modal";

// カスタムユーザーアイコン（横回転でアウトライン→塗りつぶしに変化）
function UserIcon({
  filled,
  className,
  forceReverse,
  forceForward,
}: {
  filled: boolean;
  className?: string;
  forceReverse?: boolean; // 強制的に逆回転をトリガー（黒→白）
  forceForward?: boolean; // 強制的に正回転をトリガー（白→黒）
}) {
  // 初回マウント時にfilledならアニメーションなしで即座に表示
  const [isAnimated, setIsAnimated] = useState(filled);
  const [skipTransition, setSkipTransition] = useState(true);

  // 初回レンダリング後にトランジションを有効化
  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setSkipTransition(false);
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  useEffect(() => {
    // 初回マウント時はスキップ（skipTransitionがtrueの間）
    if (skipTransition) return;

    if (forceForward) {
      // 強制正回転: filled状態にする
      const timer = setTimeout(() => {
        setIsAnimated(true);
      }, 50);
      return () => clearTimeout(timer);
    }

    if (forceReverse) {
      // 強制逆回転: 現在アニメーション中なら戻す
      setIsAnimated(false);
      return;
    }

    if (filled) {
      const timer = setTimeout(() => {
        setIsAnimated(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setIsAnimated(false);
    }
  }, [filled, forceReverse, forceForward, skipTransition]);

  return (
    <div
      className="relative h-6 w-6"
      style={{
        perspective: "1000px",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transform: isAnimated ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: skipTransition ? "none" : "transform 0.5s ease-out",
        }}
      >
        {/* 前面: アウトラインアイコン */}
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          <User className={className} fill="none" strokeWidth={2} />
        </div>
        {/* 背面: 塗りつぶしアイコン */}
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <User className={className} fill="currentColor" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

// カスタムホームアイコン（塗りつぶしが右下から左上に同心円状に変化）
function HomeIcon({
  filled,
  className,
  forceReverse,
  forceForward,
}: {
  filled: boolean;
  className?: string;
  forceReverse?: boolean; // 強制的に逆アニメーションをトリガー（黒→白）
  forceForward?: boolean; // 強制的に正アニメーションをトリガー（白→黒）
}) {
  // 初回マウント時にfilledならアニメーションなしで即座に表示
  const [isAnimated, setIsAnimated] = useState(filled);
  const [skipTransition, setSkipTransition] = useState(true);

  // 初回レンダリング後にトランジションを有効化
  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setSkipTransition(false);
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  useEffect(() => {
    // 初回マウント時はスキップ（skipTransitionがtrueの間）
    if (skipTransition) return;

    if (forceForward) {
      // 強制正アニメーション: filled状態にする
      const timer = setTimeout(() => {
        setIsAnimated(true);
      }, 50);
      return () => clearTimeout(timer);
    }

    if (forceReverse) {
      // 強制逆アニメーション: 現在アニメーション中なら戻す
      setIsAnimated(false);
      return;
    }

    if (filled) {
      // 少し遅延させてからアニメーション開始（マウント後にトランジションが効くように）
      const timer = setTimeout(() => {
        setIsAnimated(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setIsAnimated(false);
    }
  }, [filled, forceReverse, forceForward, skipTransition]);

  // 線画アイコン
  const OutlineIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );

  // 塗りつぶしアイコン（ドア部分は白）
  const FilledIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      className={className}
    >
      <defs>
        <mask id="home-door-mask">
          <rect x="0" y="0" width="24" height="24" fill="white" />
          <rect x="9" y="14" width="6" height="8" fill="black" />
        </mask>
      </defs>
      <path
        d="M3 10.182V22h18V10.182L12 2L3 10.182Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="2"
        mask="url(#home-door-mask)"
      />
      <path
        d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  // アニメーション状態に基づいてclip-pathを設定
  const clipPathValue = isAnimated
    ? "circle(150% at 100% 100%)"
    : "circle(0% at 100% 100%)";

  return (
    <div className="relative h-6 w-6">
      {/* 線画（常に表示） */}
      <div className="absolute inset-0">
        <OutlineIcon />
      </div>
      {/* 塗りつぶし（clip-pathでアニメーション） */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: clipPathValue,
          WebkitClipPath: clipPathValue,
          transition: skipTransition
            ? "none"
            : "clip-path 0.5s ease-out, -webkit-clip-path 0.5s ease-out",
        }}
      >
        <FilledIcon />
      </div>
    </div>
  );
}

export function GlobalBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [isNavigatingFromMe, setIsNavigatingFromMe] = useState(false); // /meから離れる際のアニメーション用（プロフィール黒→白）
  const [isNavigatingFromHome, setIsNavigatingFromHome] = useState(false); // ホームから離れる際のアニメーション用（ホーム黒→白）
  const [isNavigatingToHome, setIsNavigatingToHome] = useState(false); // ホームへ向かう際のアニメーション用（ホーム白→黒）
  const [isNavigatingToMe, setIsNavigatingToMe] = useState(false); // /meへ向かう際のアニメーション用（プロフィール白→黒）
  const [isSearchFocused, setIsSearchFocused] = useState(false); // 検索入力欄フォーカス中（フッター非表示用）
  const supabase = createClient();

  // 認証状態の監視
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const isHome = pathname === "/";
  const isMe = pathname === "/me" || pathname === "/me/edit";
  const isTermsOrPrivacy = pathname === "/terms" || pathname === "/privacy";
  const isPostDetail = pathname?.startsWith("/posts/");

  // pathnameが変更されたらナビゲーション状態をリセット
  useEffect(() => {
    setIsNavigatingFromMe(false);
    setIsNavigatingFromHome(false);
    setIsNavigatingToHome(false);
    setIsNavigatingToMe(false);
    setIsSearchFocused(false); // 検索フォーカス状態もリセット
  }, [pathname]);

  // 検索入力欄のフォーカス状態を監視（スマホ/タブレットでフッターを非表示にするため）
  useEffect(() => {
    const handleSearchFocus = (e: Event) => {
      const customEvent = e as CustomEvent<{ focused: boolean }>;
      setIsSearchFocused(customEvent.detail.focused);
    };
    window.addEventListener("searchFabFocus", handleSearchFocus);
    return () =>
      window.removeEventListener("searchFabFocus", handleSearchFocus);
  }, []);

  // モーダルページ（terms/privacy）からの遷移時にスライドアウトをトリガー
  const navigateWithModalSlideOut = (targetUrl: string) => {
    if (isTermsOrPrivacy) {
      // カスタムイベントを発火してスライドアウトをトリガー
      const event = new CustomEvent("modalNavigate", {
        detail: { targetUrl },
      });
      window.dispatchEvent(event);
    } else {
      router.push(targetUrl);
    }
  };

  const handleHomeClick = () => {
    // 既にホームにいる場合は何もしない
    if (isHome) return;

    // /meページから離れる場合、両方のアイコンを同時にアニメーション
    if (isMe) {
      setIsNavigatingFromMe(true); // プロフィールアイコン: 黒→白
      setIsNavigatingToHome(true); // ホームアイコン: 白→黒
      // アニメーション完了を待ってからフルページナビゲーション
      // ※ router.push()ではSoft Navigationの不具合でページコンテンツが更新されないため
      setTimeout(() => {
        window.location.href = "/";
      }, 300);
    } else if (isTermsOrPrivacy) {
      // terms/privacyからの場合、アイコンモーションをセットしてスライドアウト
      setIsNavigatingToHome(true);
      navigateWithModalSlideOut("/");
    } else if (isPostDetail) {
      // 投稿詳細画面からの場合、フルページナビゲーション
      // ※ 背景にホーム画面が表示されているため、router.push()ではモーダルが閉じない
      setIsNavigatingToHome(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 300);
    } else {
      // その他の画面からの場合
      setIsNavigatingToHome(true);
      setTimeout(() => {
        router.push("/");
      }, 300);
    }
  };

  const handlePostClick = () => {
    if (user) {
      setShowPostModal(true);
    } else {
      setShowLoginModal(true);
    }
  };

  const handleRightClick = () => {
    if (user) {
      // 既にマイページにいる場合は何もしない
      if (isMe) return;

      // ホームから離れる場合、両方のアイコンを同時にアニメーション
      if (isHome) {
        setIsNavigatingFromHome(true); // ホームアイコン: 黒→白
        setIsNavigatingToMe(true); // プロフィールアイコン: 白→黒
        // アニメーション完了を待ってからフルページナビゲーション
        // ※ router.push()ではSoft Navigationの不具合でページコンテンツが更新されないため
        setTimeout(() => {
          window.location.href = "/me";
        }, 300);
      } else if (isTermsOrPrivacy) {
        // terms/privacyからの場合、アイコンモーションをセットしてスライドアウト
        setIsNavigatingToMe(true);
        navigateWithModalSlideOut("/me");
      } else {
        // 投稿詳細画面などからの場合、アイコンモーションをセットして遷移
        setIsNavigatingToMe(true);
        setTimeout(() => {
          router.push("/me");
        }, 300);
      }
    } else {
      setShowLoginModal(true);
    }
  };

  return (
    <>
      <nav
        className={`fixed bottom-0 left-0 right-0 z-[80] border-t border-border/40 bg-background/95 backdrop-blur-lg transition-transform duration-200 ${
          isSearchFocused ? "translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="mx-auto flex h-14 max-w-lg items-center justify-around px-4">
          {/* ホーム */}
          <motion.button
            onClick={handleHomeClick}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              isHome || isNavigatingToHome
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <motion.div
              initial={{ scale: 1 }}
              animate={
                isNavigatingToHome ? { scale: [1, 1.3, 1] } : { scale: 1 }
              }
              transition={{
                duration: 0.3,
                ease: "easeOut",
              }}
            >
              <HomeIcon
                filled={isHome}
                className="h-6 w-6"
                forceReverse={isNavigatingFromHome}
                forceForward={isNavigatingToHome}
              />
            </motion.div>
          </motion.button>

          {/* 投稿ボタン（中央・目立つデザイン） */}
          <motion.button
            onClick={handlePostClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-lg transition-colors hover:bg-primary/90"
          >
            <Plus className="h-6 w-6 text-primary-foreground" />
          </motion.button>

          {/* マイページ / ログイン */}
          <motion.button
            onClick={handleRightClick}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              isMe || isNavigatingToMe
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <motion.div
              initial={{ scale: 1 }}
              animate={isNavigatingToMe ? { scale: [1, 1.3, 1] } : { scale: 1 }}
              transition={{
                duration: 0.3,
                ease: "easeOut",
              }}
            >
              <UserIcon
                filled={isMe}
                className="h-6 w-6"
                forceReverse={isNavigatingFromMe}
                forceForward={isNavigatingToMe}
              />
            </motion.div>
          </motion.button>
        </div>
      </nav>

      {/* ログインモーダル */}
      <LoginPromptModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
      />

      {/* 投稿モーダル */}
      <PostModal open={showPostModal} onOpenChange={setShowPostModal} />
    </>
  );
}
