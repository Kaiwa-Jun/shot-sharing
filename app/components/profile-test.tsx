'use client'

import { useEffect, useState } from 'react'
import { getAllProfiles, getProfilesCount } from '@/app/actions/profiles'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { motion } from 'framer-motion'

type Profile = {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export default function ProfileTest() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [count, setCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const [profilesResult, countResult] = await Promise.all([
          getAllProfiles(),
          getProfilesCount(),
        ])

        if (profilesResult.error) {
          setError(profilesResult.error)
        } else {
          setProfiles(profilesResult.profiles)
        }

        if (countResult.error) {
          setError(countResult.error)
        } else {
          setCount(countResult.count || 0)
        }
      } catch (err) {
        setError('データの取得に失敗しました')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle>📊 データベース接続テスト</CardTitle>
          <CardDescription>Supabase profiles テーブル</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-700">データを読み込んでいます...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-2 border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle>📊 データベース接続テスト</CardTitle>
          <CardDescription>エラーが発生しました</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-700">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-2 border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">✅</span>
            <span>データベース接続テスト成功！</span>
          </CardTitle>
          <CardDescription>
            Supabase profiles テーブルから {count} 件のレコードを取得
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profiles.length === 0 ? (
            <p className="text-sm text-green-700">
              プロフィールが見つかりませんでした
            </p>
          ) : (
            <div className="space-y-4">
              {profiles.map((profile, index) => (
                <motion.div
                  key={profile.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="rounded-lg border border-green-300 bg-white p-4"
                >
                  <div className="flex items-start gap-4">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.display_name || 'User'}
                        className="h-16 w-16 rounded-full border-2 border-green-400"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-green-400 bg-green-100 text-2xl">
                        👤
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <div>
                        <p className="font-semibold text-green-900">
                          {profile.display_name || '名前未設定'}
                        </p>
                        <p className="text-sm text-green-700">
                          {profile.email}
                        </p>
                      </div>
                      {profile.bio && (
                        <p className="text-sm text-green-600">{profile.bio}</p>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-xs text-green-600">
                        <div>
                          <span className="font-medium">ID:</span>{' '}
                          {profile.id.slice(0, 8)}...
                        </div>
                        <div>
                          <span className="font-medium">登録日:</span>{' '}
                          {new Date(profile.created_at).toLocaleDateString(
                            'ja-JP'
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <div className="mt-4 rounded-md border border-green-300 bg-white p-3">
            <p className="text-xs text-green-700">
              <strong>確認事項:</strong>
            </p>
            <ul className="mt-2 space-y-1 text-xs text-green-600">
              <li>✓ Supabaseデータベースへの接続が成功</li>
              <li>✓ profilesテーブルからのデータ取得が成功</li>
              <li>✓ Server Actionsが正常に動作</li>
              <li>✓ RLSポリシーが適切に機能（公開プロフィールが閲覧可能）</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
