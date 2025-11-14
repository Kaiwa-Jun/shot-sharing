"use client";

import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Camera, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function Header() {
  const [isHidden, setIsHidden] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;

    // 下にスクロール（かつ100px以上スクロールした）
    if (latest > previous && latest > 100) {
      setIsHidden(true);
    } else {
      // 上にスクロール
      setIsHidden(false);
    }
  });

  return (
    <motion.header
      variants={{
        visible: { y: 0, opacity: 1 },
        hidden: { y: "-100%", opacity: 0 },
      }}
      animate={isHidden ? "hidden" : "visible"}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-0 right-0 top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg"
    >
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* 左: ユーザーアイコン */}
        <Link href="/me">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
          >
            <User className="h-5 w-5 text-muted-foreground" />
          </motion.div>
        </Link>

        {/* 中央: アプリアイコン */}
        <Link href="/" className="absolute left-1/2 -translate-x-1/2">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60">
              <Camera className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="hidden font-bold tracking-tight sm:inline-block">
              Shot Sharing
            </span>
          </motion.div>
        </Link>

        {/* 右: 空（レイアウトバランスのため） */}
        <div className="w-10" />
      </div>
    </motion.header>
  );
}
