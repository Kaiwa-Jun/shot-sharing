'use server'

import { generateText } from '@/lib/gemini/client'

/**
 * Gemini APIのテスト（簡単なテキスト生成）
 */
export async function testGeminiAPI(prompt: string) {
  try {
    const response = await generateText(prompt)
    return { success: true, response, error: null }
  } catch (error) {
    console.error('Gemini API error:', error)
    return {
      success: false,
      response: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * 撮影設定に関する質問に回答（デモ用）
 */
export async function askPhotoQuestion(question: string) {
  try {
    const prompt = `あなたは一眼レフカメラの撮影設定に詳しい専門家です。
以下の質問に、初心者にもわかりやすく、具体的な撮影設定（ISO、F値、シャッタースピード等）を含めて回答してください。

質問: ${question}

回答は以下の形式で提供してください：
- 推奨設定
- 設定の理由
- 撮影のコツ`

    const response = await generateText(prompt)
    return { success: true, response, error: null }
  } catch (error) {
    console.error('Gemini API error:', error)
    return {
      success: false,
      response: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
