<!--
Sync Impact Report:
- Version: 1.0.0 → 1.1.0
- Modified Principles:
  - Added: IV. Japanese Documentation (NEW principle for i18n consistency)
- Added Sections: New principle section with rationale
- Removed Sections: None
- Templates Status:
  - ✅ plan-template.md - Constitution Check section verified (language-agnostic, no update needed)
  - ✅ spec-template.md - User scenarios template verified (language-agnostic, no update needed)
  - ✅ tasks-template.md - Task descriptions already in Japanese, aligns with new principle
  - ✅ commands/*.md - Agent guidance files verified (no language-specific constraints)
- Version Bump Rationale: MINOR (1.0.0 → 1.1.0) - New principle added without breaking existing conventions
- Follow-up: None - all existing code/docs already comply (Japanese comments/docs already in use)
- Previous Report: Initial → 1.0.0 (ratification on 2026-02-04)
-->

# PageNotes Constitution

## Core Principles

### I. Clean Code (NON-NEGOTIABLE)

コードの保守性を最優先する。すべてのコードは以下の基準を満たすこと：

- **可読性**: 変数名・関数名・クラス名は目的を明確に表現する
- **単一責任**: 各関数・クラスは1つの明確な責任のみを持つ
- **DRY原則**: 重複コードを避け、共通ロジックは適切に抽出する
- **適切なコメント**: コードが"何をするか"ではなく"なぜそうするか"を説明する
- **型安全性**: TypeScriptの型システムを最大限活用し、`any`型の使用は正当化が必要

**根拠**: 長期的なメンテナンスコストを削減し、チーム全体の生産性を向上させる。

### II. Simple UX

ユーザー体験は直感的でシンプルであること：

- **認知負荷の最小化**: 操作手順は可能な限り少なくする
- **一貫性**: UI要素とインタラクションパターンはアプリケーション全体で統一する
- **即座のフィードバック**: ユーザーアクションに対する応答は視覚的に明確にする
- **エラーメッセージ**: ユーザーフレンドリーで解決策を示唆する内容とする
- **アクセシビリティ**: キーボードナビゲーション、スクリーンリーダー対応を考慮する

**根拠**: ユーザーの学習コストを削減し、アプリケーションの採用率を向上させる。

### III. Responsive Design

すべてのUIコンポーネントはモバイル端末に対応すること：

- **モバイルファースト**: デザインと実装はモバイル画面サイズから開始する
- **ブレークポイント**: タブレット・デスクトップサイズへの適切な対応を実装する
- **タッチ操作**: ボタンサイズ・タップ領域は指での操作に適したサイズとする（最小44x44px推奨）
- **パフォーマンス**: モバイルネットワーク環境での読み込み時間を最適化する
- **テスト**: 複数のデバイスサイズで動作確認を行う

**根拠**: 多様なデバイス環境でのユーザー体験を保証し、アプリケーションの到達範囲を最大化する。

### IV. Japanese Documentation

すべてのドキュメントとソースコードコメントは日本語で記述すること：

- **仕様ドキュメント**: spec.md、plan.md、tasks.md等のプロジェクトドキュメントは日本語で記述する
- **ソースコードコメント**: 関数・クラス・複雑なロジックの説明コメントは日本語で記述する
- **コミットメッセージ**: Gitコミットメッセージは日本語で記述する（プレフィックスは英語可）
- **README**: ユーザー向けドキュメント（README.md等）は日本語で記述する
- **識別子の命名**: 変数名・関数名・クラス名は英語を使用する（TypeScript標準慣習に従う）

**根拠**: プロジェクトチームの主要言語が日本語であり、日本語での記述により理解速度と保守性が向上する。コードの識別子は国際的な慣習とライブラリとの統合を考慮し英語を維持する。

## Technology Stack

**Primary Language**: TypeScript

- 厳格な型チェックを有効化（`strict: true`）
- ES2020以降の機能を活用
- 最新の安定版を使用
- 適切な型定義ライブラリ（@types/*）を導入

## Testing Policy

**テストコードは実装しない**:

- 単体テスト（Unit Test）は記述しない
- 結合テスト（Integration Test）は記述しない
- E2Eテスト（End-to-End Test）は記述しない

この方針により開発速度を優先し、手動テスト・実運用フィードバックに基づく品質保証を行う。
1
**注意**: この方針は将来的に見直される可能性がある。変更時は憲章の改訂が必要。

## Governance

本憲章はPageNotesプロジェクトの全開発活動に優先される。

- すべての機能実装・コードレビューは本憲章の原則への準拠を確認する
- 原則に反する実装を行う場合は明確な正当化理由と文書化が必要
- 憲章の改訂には変更内容の文書化と影響分析が必要
- 開発ガイダンスは`.specify/memory/`配下のドキュメントを参照する

**Version**: 1.0.0 | **Ratified**: 2026-02-04 | **Last Amended**: 2026-02-04
