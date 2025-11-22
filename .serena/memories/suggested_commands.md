# 開発でよく使うコマンド

プロジェクトルートで実行することを前提とします。

- **開発サーバ起動**:
  - `pnpm dev` — Next.js 開発サーバ (Turbopack) を起動
- **本番ビルド & 実行**:
  - `pnpm build` — 本番ビルド
  - `pnpm start` — 本番ビルド済みアプリの起動
- **Lint / 型チェック**:
  - `pnpm lint` — ESLint (Flat Config) による静的解析
  - `pnpm typecheck` — TypeScript の型チェック (`tsc --noEmit`)
- **テスト**:
  - `pnpm test` — Vitest によるユニットテスト実行
  - `pnpm test:ui` — Vitest UI
  - `pnpm e2e` — Playwright による E2E テスト
- **パフォーマンス計測**:
  - `pnpm lhci` — Lighthouse CI によるパフォーマンス/ベストプラクティス検証

Darwin (macOS) でよく使うユーティリティ:

- **ファイル操作/検索**:
  - `ls`, `cd`, `find . -name 'pattern'`, `rg <pattern>` (ripgrep があれば推奨)
- **Git 操作**:
  - `git status`, `git diff`, `git add`, `git commit`, `git switch`, `git pull`, `git push`

タスク完了時は、最低限 `pnpm lint` と `pnpm typecheck` を通し、必要に応じて該当範囲のテスト (`pnpm test` / `pnpm e2e`) を実行するのが推奨です。