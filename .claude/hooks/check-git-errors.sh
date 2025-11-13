#!/bin/bash

# Gitコマンドのエラーを検出して自動的に修復を提案するフック

set -e

# stdin からJSON入力を読み込む
input=$(cat)

# ツール名を取得
tool_name=$(echo "$input" | python3 -c "import sys, json; print(json.load(sys.stdin).get('tool_name', ''))")

# Bashツールの場合のみ処理
if [ "$tool_name" != "Bash" ]; then
    exit 0
fi

# コマンドを取得
command=$(echo "$input" | python3 -c "import sys, json; print(json.load(sys.stdin).get('tool_input', {}).get('command', ''))")

# tool_responseを取得
tool_response=$(echo "$input" | python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin).get('tool_response', {})))")

# エラーがあるかチェック
if echo "$tool_response" | grep -q '"error":'; then
    # pre-commitフックのエラーチェック
    if echo "$command" | grep -q "git commit"; then
        if echo "$tool_response" | grep -q "ESLint"; then
            cat <<EOF
{
  "decision": "block",
  "reason": "ESLintエラーが検出されました。eslint --fixを実行してエラーを自動修正してください。",
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "ESLintエラーが検出されたため、次のコマンドを実行してください: npm run lint -- --fix"
  }
}
EOF
            exit 0
        fi

        if echo "$tool_response" | grep -q "jest\|test"; then
            cat <<EOF
{
  "decision": "block",
  "reason": "テストが失敗しました。失敗したテストを修正してから再度コミットしてください。",
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "テストエラーを修正する必要があります。npm testでテスト結果を確認してください。"
  }
}
EOF
            exit 0
        fi
    fi

    # pre-pushフックのエラーチェック
    if echo "$command" | grep -q "git push"; then
        if echo "$tool_response" | grep -q "Type check failed\|tsc"; then
            cat <<EOF
{
  "decision": "block",
  "reason": "TypeScriptの型エラーが検出されました。型エラーを修正してから再度プッシュしてください。",
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "型エラーを修正する必要があります。npm run type-checkでエラーの詳細を確認してください。"
  }
}
EOF
            exit 0
        fi

        if echo "$tool_response" | grep -q "Build failed"; then
            cat <<EOF
{
  "decision": "block",
  "reason": "ビルドエラーが検出されました。ビルドエラーを修正してから再度プッシュしてください。",
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "ビルドエラーを修正する必要があります。npm run buildでエラーの詳細を確認してください。"
  }
}
EOF
            exit 0
        fi
    fi
fi

exit 0
