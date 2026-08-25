# AGENTS.md

## 作業範囲

- 指示されていない問題を勝手に直すな。見つけたら作業の最後にまとめて報告しろ。修正すべきものは Issue を起票しろ。
- 担当 Issue と無関係なファイルを触るな。

## API

- API エラーコードはバックエンド `runrun-backend/docs/api/openapi.yaml` の `ErrorResponse` の enum だけを使え。フロント側で勝手に増やすな。
- API 呼び出しは必ず `src/services/apiClient.ts` を経由しろ。コンポーネントから直接 `fetch` するな。

## React

- hooks の使い方に注意しろ。依存配列を正しく書け。
- `useMemo` / `useCallback` をむやみに使うな。実測で遅いと分かった箇所だけに使え。

## 完了前に必ず実行

```
npm run lint
npm run typecheck
npm run test
```
3つとも通ってから完了を報告しろ。

## Git

- `develop` へ直接 push するな。必ず PR を経由しろ。
- PR 前に [CONTRIBUTING.md](CONTRIBUTING.md) の「PR 前の必須チェック」を実行しろ。
