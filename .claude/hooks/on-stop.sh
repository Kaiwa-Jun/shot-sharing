#!/bin/bash

# Claudeの応答が完了した時に実行されるフック
# 未コミットの変更があればリマインダーを表示

set -e

# 現在のディレクトリでgit statusをチェック
cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0

# Gitリポジトリかチェック
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    exit 0
fi

# 未コミットの変更があるかチェック
if ! git diff-index --quiet HEAD -- 2>/dev/null || [ -n "$(git ls-files --others --exclude-standard)" ]; then
    # JSON出力で通知
    cat <<EOF
{
  "systemMessage": "💡 未コミットの変更があります。/deploy コマンドを使用してコミット、プッシュ、PR作成を実行できます。"
}
EOF
fi

exit 0
