<!--
Sync Impact Report:
- Version: 1.1.0 → 1.2.0
- Modified Principles:
  - Added: V. Commit Message Convention (NEW principle for Git standardization)
- Added Sections: New principle section with detailed commit message format specifications
- Removed Sections: None
- Templates Status:
  - ✅ plan-template.md - Constitution Check section verified (no language-specific constraints)
  - ✅ spec-template.md - User scenarios template verified (no language-specific constraints)
  - ✅ tasks-template.md - Task descriptions already in Japanese, aligns with existing principles
  - ✅ commands/*.md - Agent guidance files verified (commit message format is agent-agnostic)
- Version Bump Rationale: MINOR (1.1.0 → 1.2.0) - New governance principle for commit message standardization
- Follow-up: None - new principle is forward-looking guidance, existing commits already follow this pattern
- Previous Report: 1.0.0 → 1.1.0 (2026-02-04)
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

### V. Commit Message Convention

すべてのGitコミットメッセージは以下の形式と規則に従うこと：

**形式**: `<type>: <日本語の説明>`

**タイプの種類**（4文字以下の英字）:
- `docs:` - ドキュメント、仕様書、設計書、計画書、README の作成・更新
- `feat:` - 新機能の実装、機能拡張、ユーザーが感知する変更
- `fix:` - バグ修正、既存機能の不具合解決
- `build:` - ビルド設定、依存関係管理、パッケージマネージャー設定、スクリプト修正
- `refactor:` - コード構造の改善（動作変更なし、ユーザーに見える変更なし）
- `chore:` - メタデータの更新、ツール設定の変更、保守タスク

**ルール**:
- 説明文は日本語で記述する（明確で具体的な内容）
- 1 行目（タイトル）は 72 文字以内を目安とする
- 複雑な変更の場合は空行で区切って詳細説明を本文に追加する
- 関連 Issue がある場合は本文に `Closes #123` 形式で記載する
- 複数の独立した変更は 1 つのコミットに含めない（原子性を保つ）

**例**:
```
docs: Collapsible note-widget の設計・仕様書を追加

specs/002-collapsible-note-widget/ 配下に plan.md, spec.md, tasks.md
を作成し、機能要件と実装計画を記述しました。

- 機能要件: ウィジェットの展開/折りたたみ機能
- 実装フェーズ: 6フェーズ（Setup, Foundational, User Story 1-3, Polish）
- 並列実行可能: タスク分割で効率化対応
```

```
feat: WidgetState インターフェースを追加
```

```
fix: NoteWidgetのUI操作バグを修正
```

```
build: build/clean スクリプトをクロスプラットフォーム対応へ
```

**根拠**: 統一されたコミット履歴により、プロジェクト履歴の可読性が向上し、変更追跡とロールバックが容易になる。また、自動化ツール（CI/CD、リリースノート生成）との連携が効率化される。

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

**Version**: 1.2.0 | **Ratified**: 2026-02-04 | **Last Amended**: 2026-02-24
