"use client";

import { useState } from "react";
import { testGeminiAPI, askPhotoQuestion } from "@/app/actions/gemini";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function GeminiTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSimpleTest = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    const response = await testGeminiAPI(
      "こんにちは！簡単な自己紹介をしてください。"
    );

    if (response.success) {
      setResult(response.response);
    } else {
      setError(response.error);
    }
    setLoading(false);
  };

  const handlePhotoQuestion = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    const response = await askPhotoQuestion(
      "夕焼けを綺麗に撮影するための設定を教えてください"
    );

    if (response.success) {
      setResult(response.response);
    } else {
      setError(response.error);
    }
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-2 border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <span>Gemini API 接続テスト</span>
          </CardTitle>
          <CardDescription>
            Gemini 2.0 Flash による AI テキスト生成
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={handleSimpleTest}
              disabled={loading}
              variant="default"
            >
              {loading ? "生成中..." : "シンプルテスト"}
            </Button>
            <Button
              onClick={handlePhotoQuestion}
              disabled={loading}
              variant="secondary"
            >
              {loading ? "生成中..." : "撮影設定の質問（デモ）"}
            </Button>
          </div>

          {loading && (
            <div className="rounded-lg border border-purple-300 bg-white p-4">
              <p className="text-sm text-purple-700">
                Gemini APIにリクエスト中...
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700">エラー:</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-purple-300 bg-white p-4"
            >
              <p className="mb-2 text-sm font-semibold text-purple-700">
                Gemini からの応答:
              </p>
              <div className="whitespace-pre-wrap text-sm text-gray-700">
                {result}
              </div>
            </motion.div>
          )}

          <div className="mt-4 rounded-md border border-purple-300 bg-white p-3">
            <p className="text-xs text-purple-700">
              <strong>確認事項:</strong>
            </p>
            <ul className="mt-2 space-y-1 text-xs text-purple-600">
              <li>✓ Gemini API キーが正しく設定されている</li>
              <li>✓ @google/generative-ai SDK が正常に動作</li>
              <li>✓ Server Actions 経由で API リクエストが可能</li>
              <li>✓ 将来的に File Search API を使った画像検索機能に拡張予定</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
