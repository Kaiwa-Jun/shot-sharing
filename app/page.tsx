"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { motion } from "framer-motion";
import { useState } from "react";

export default function Home() {
  const [count, setCount] = useState(0);

  return (
    <div className="container mx-auto min-h-screen p-8">
      <main className="flex flex-col gap-8">
        {/* ヘッダー - フェードイン */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-6xl font-bold text-transparent">
            Shot Sharing
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            AI-powered photo sharing platform
          </p>
        </motion.div>

        {/* Framer Motion デモセクション */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle>🎬 Framer Motion デモ</CardTitle>
              <CardDescription>
                様々なアニメーション効果を確認できます
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* カウンターアニメーション */}
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => setCount(count + 1)}
                  variant="default"
                  size="lg"
                >
                  クリックしてカウント
                </Button>
                <motion.div
                  key={count}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                  }}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground"
                >
                  {count}
                </motion.div>
              </div>

              {/* ホバーエフェクト */}
              <div className="grid gap-4 md:grid-cols-3">
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 2 }}
                  whileTap={{ scale: 0.95 }}
                  className="cursor-pointer rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 p-6 text-white shadow-lg"
                >
                  <p className="text-sm font-semibold">ホバー & タップ</p>
                  <p className="text-xs">触ってみてください</p>
                </motion.div>

                <motion.div
                  whileHover={{
                    scale: 1.1,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                  }}
                  className="cursor-pointer rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 p-6 text-white shadow-lg"
                >
                  <p className="text-sm font-semibold">シャドウ効果</p>
                  <p className="text-xs">ホバーで影が変化</p>
                </motion.div>

                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 1,
                  }}
                  className="rounded-lg bg-gradient-to-br from-orange-500 to-red-500 p-6 text-white shadow-lg"
                >
                  <p className="text-sm font-semibold">自動アニメーション</p>
                  <p className="text-xs">揺れ続けます</p>
                </motion.div>
              </div>

              {/* バウンスボール */}
              <div className="relative h-32 rounded-lg bg-muted/50 p-4">
                <motion.div
                  animate={{
                    y: [0, -60, 0],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                  className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 rounded-full bg-gradient-to-br from-green-400 to-blue-500 shadow-lg"
                />
                <p className="text-center text-sm text-muted-foreground">
                  バウンスボール
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tailwind CSS デモ - ステージングアニメーション */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Tailwind CSS",
              desc: "ユーティリティファーストCSSフレームワーク",
              content:
                "レスポンシブデザインやダークモードに対応した柔軟なスタイリングが可能です。",
            },
            {
              title: "shadcn/ui",
              desc: "再利用可能なコンポーネントライブラリ",
              content:
                "アクセシブルで美しいUIコンポーネントを簡単に使用できます。",
            },
            {
              title: "Next.js 16",
              desc: "最新のReactフレームワーク",
              content:
                "App Router、Server Components、Server Actionsなど最新機能を活用できます。",
            },
          ].map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.2, duration: 0.5 }}
            >
              <Card className="h-full transition-all hover:shadow-lg">
                <CardHeader>
                  <CardTitle>{card.title}</CardTitle>
                  <CardDescription>{card.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{card.content}</p>
                </CardContent>
                <CardFooter>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="default">詳細を見る</Button>
                  </motion.div>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* ボタンバリエーション */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>ボタンバリエーション</CardTitle>
              <CardDescription>
                様々なスタイルとサイズのボタン
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              {[
                { variant: "default" as const, label: "Default" },
                { variant: "secondary" as const, label: "Secondary" },
                { variant: "destructive" as const, label: "Destructive" },
                { variant: "outline" as const, label: "Outline" },
                { variant: "ghost" as const, label: "Ghost" },
                { variant: "link" as const, label: "Link" },
              ].map((btn, index) => (
                <motion.div
                  key={btn.label}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.5 + index * 0.1 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Button variant={btn.variant}>{btn.label}</Button>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* カラーパレット */}
        <motion.div
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.8 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>カラーパレット</CardTitle>
              <CardDescription>
                Tailwind CSS + shadcn/uiのカラーシステム
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                {[
                  { bg: "bg-background border", text: "Background" },
                  {
                    bg: "bg-primary text-primary-foreground",
                    text: "Primary",
                  },
                  {
                    bg: "bg-secondary text-secondary-foreground",
                    text: "Secondary",
                  },
                  { bg: "bg-muted text-muted-foreground", text: "Muted" },
                ].map((color, index) => (
                  <motion.div
                    key={color.text}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 2 + index * 0.1 }}
                    whileHover={{ scale: 1.05, x: 10 }}
                    className={`rounded-lg p-4 ${color.bg}`}
                  >
                    {color.text}
                  </motion.div>
                ))}
              </div>
              <div className="space-y-2">
                {[
                  { bg: "bg-accent text-accent-foreground", text: "Accent" },
                  {
                    bg: "bg-destructive text-destructive-foreground",
                    text: "Destructive",
                  },
                  {
                    bg: "bg-card text-card-foreground border",
                    text: "Card",
                  },
                  {
                    bg: "bg-popover text-popover-foreground border",
                    text: "Popover",
                  },
                ].map((color, index) => (
                  <motion.div
                    key={color.text}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 2 + index * 0.1 }}
                    whileHover={{ scale: 1.05, x: -10 }}
                    className={`rounded-lg p-4 ${color.bg}`}
                  >
                    {color.text}
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
