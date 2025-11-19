export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4">
          <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
          <h1 className="flex-1 text-center font-semibold">プロフィール</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* プロフィール情報スケルトン */}
      <div className="border-b px-4 py-6">
        <div className="flex items-center gap-4">
          {/* アバタースケルトン */}
          <div className="h-16 w-16 animate-pulse rounded-full bg-muted" />

          {/* ユーザー情報スケルトン */}
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          </div>
        </div>

        {/* ログアウトボタンスケルトン */}
        <div className="mt-4 h-9 w-full animate-pulse rounded-md bg-muted" />
      </div>

      {/* タブスケルトン */}
      <div className="w-full">
        <div className="grid h-10 w-full grid-cols-2 border-b">
          <div className="flex items-center justify-center">
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex items-center justify-center">
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          </div>
        </div>

        {/* グリッドスケルトン */}
        <div className="grid grid-cols-2 gap-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
