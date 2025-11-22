export function SimilarPostsSkeleton() {
  return (
    <div className="border-t pt-6">
      <h3 className="mb-4 text-lg font-semibold">類似の作例</h3>

      {/* 横スクロールコンテナ */}
      <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-[140px] flex-shrink-0">
            {/* サムネイルスケルトン */}
            <div className="relative aspect-[3/4] animate-pulse overflow-hidden rounded-lg bg-muted" />

            {/* Exif情報スケルトン */}
            <div className="mt-2 space-y-0.5">
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>

      {/* スクロールヒント（モバイル用） */}
      <p className="mt-2 text-xs text-muted-foreground md:hidden">
        ← スワイプして他の作例を見る →
      </p>
    </div>
  );
}
