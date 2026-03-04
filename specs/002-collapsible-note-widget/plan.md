# Implementation Plan: Collapsible Note Widget

**Branch**: `002-collapsible-note-widget` | **Date**: 2026年2月13日 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-collapsible-note-widget/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

既存のメモウィジェットを常に展開された状態から、デフォルトで畳まれた状態に変更し、ユーザーがクリックすることで展開できるようにする。畳まれた状態では、画面右下に「PageNotes」というテキストラベルを含む横長バー状のUIを表示する。ウィジェットの展開/畳まれた状態は、ドメインごとに永続化され、ページリロード時にも保持される。展開時のアニメーションは右下から左上方向へ、畳む時は左上から右下方向へ滑らかに実行される。

## Technical Context

**Language/Version**: TypeScript 5.3+ (strict mode enabled)  
**Primary Dependencies**: Chrome Extension Manifest V3, esbuild (bundler)  
**Storage**: chrome.storage.local API (ウィジェット状態とメモデータの永続化)  
**Testing**: N/A (Testing Policy: 手動テストのみ)  
**Target Platform**: Chrome Extension (Manifest V3)、デスクトップ・モバイルブラウザ対応  
**Project Type**: Chrome Extension (content script + background service worker)  
**Performance Goals**: アニメーション30fps以上、展開時間0.3秒以内、状態復元95%以上の信頼性  
**Constraints**: Shadow DOMでのスタイル分離、既存メモ機能の完全な後方互換性維持  
**Scale/Scope**: 既存のNoteWidgetクラス（577行）の拡張、新規ストレージキー追加、CSSアニメーション実装

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Initial Check (Before Phase 0)**: ✅ PASSED

**Re-evaluation (After Phase 1)**: ✅ PASSED

- [x] **Clean Code**: 
  - 設計完了: NoteWidgetクラスに状態管理メソッド追加（単一責任原則維持）
  - DRY原則: 既存のurl-utils.tsを再利用、重複コード回避
  - 型安全性: WidgetState型定義、TypeScript strict mode、バリデーション関数実装
  - コメント: すべてのメソッドに日本語ドキュメンテーションコメント追加
  
- [x] **Simple UX**: 
  - ワンクリック操作: バーをクリックで展開、ボタンクリックで畳む
  - 即座のフィードバック: ホバー効果、0.3秒のスムーズアニメーション
  - 一貫性: 既存のメモUI/操作パターンを維持、右下固定位置
  - 明確な表示: 「PageNotes」テキストラベルで機能を明示
  
- [x] **Responsive Design**: 
  - モバイル対応: 既存ウィジェットは固定サイズで右下配置（モバイル画面でも問題なし）
  - 畳まれた状態: 横長バーデザインで画面サイズに影響されない
  - タッチ操作: バー全体がクリック可能（44px以上の高さ確保）
  - パフォーマンス: CSS transitionでGPU加速、30fps以上を保証
  
- [x] **Japanese Documentation**: 
  - spec.md, plan.md, research.md, data-model.md, quickstart.md すべて日本語
  - ソースコードコメント: すべてのメソッドに日本語説明追加
  - 変数名/関数名: 英語（TypeScript標準慣習）
  - コミットメッセージ: 日本語で記述予定
  
- [x] **Testing Policy**: 
  - 自動テストコード不要
  - 手動テストシナリオをquickstart.mdに記載
  - 6つのテストケース定義（初回表示、展開、畳む、永続化、ドメイン独立性、既存機能）
  
- [x] **Technology Stack**: 
  - TypeScript 5.3+ strict mode使用
  - Chrome Extension Manifest V3 API準拠
  - chrome.storage.local API for state persistence
  - CSS transition for animations (no external libraries)

**Violations**: なし

**Notes**: Phase 1設計により、すべての憲章原則への準拠が確認されました。既存コードへの影響を最小限に抑えつつ、型安全性と保守性を維持する設計が完成しています。

## Project Structure

### Documentation (this feature)

```text
specs/002-collapsible-note-widget/
├── spec.md              # 機能仕様書（完成）
├── plan.md              # このファイル（実装計画）
├── research.md          # Phase 0: 技術調査結果
├── data-model.md        # Phase 1: データモデル定義
├── quickstart.md        # Phase 1: 実装クイックスタート
├── contracts/           # Phase 1: API契約
│   └── widget-state-storage.md  # ウィジェット状態ストレージAPI
└── checklists/
    └── requirements.md  # 品質チェックリスト（完成）
```

### Source Code (repository root)

```text
src/
├── background/
│   ├── index.ts         # Service worker エントリーポイント
│   ├── storage.ts       # ストレージAPI（既存、拡張予定）
│   └── url-utils.ts     # URL正規化ユーティリティ（既存）
├── content/
│   ├── index.ts         # Content script エントリーポイント
│   └── note-widget.ts   # NoteWidgetクラス（既存577行、拡張予定）
│       # 追加メソッド候補:
│       # - toggleWidget(): ウィジェット展開/畳む
│       # - saveWidgetState(): 状態保存
│       # - loadWidgetState(): 状態復元
│       # - renderCollapsedBar(): 畳まれた状態UI
│       # - renderExpandedWidget(): 展開状態UI（既存ロジック利用）
│       # - initializeAnimation(): CSSアニメーション設定
└── types/
    └── index.ts         # 型定義（既存、拡張予定）
        # 追加型候補:
        # - WidgetState: { isExpanded: boolean, domain: string }
        # - WidgetPosition: collapsed/expanded座標情報

dist/                    # ビルド出力（gitignore済み）
├── background/
│   └── index.js
├── content/
│   └── index.js
└── manifest.json

.specify/
└── memory/
    └── constitution.md  # プロジェクト憲章（参照済み）
```

**Structure Decision**: Chrome Extension標準構造を採用。既存のsrc/content/note-widget.tsを拡張する形で実装。新規ファイル追加は不要で、NoteWidgetクラスにメソッド追加とCSSスタイル拡張で対応可能。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Status**: N/A - Constitution Check violations なし

すべての憲章原則に準拠した設計が完了しています。追加の正当化は不要です。

---

## Phase 0: Research (完了)

**Output**: [research.md](./research.md)

### 解決された技術的課題

1. ✅ CSS Transitionによる滑らかなアニメーション実装方法
   - Decision: transform + cubic-bezier easing使用
   
2. ✅ Chrome Storage APIでのドメインごとの状態永続化
   - Decision: `widget_state:{domain}` キー形式でchrome.storage.local使用
   
3. ✅ Shadow DOMでの状態管理とイベントハンドリング
   - Decision: `isExpanded`フラグ + `display`プロパティ切り替え
   
4. ✅ 既存メモ機能との後方互換性維持
   - Decision: 既存メソッド不変、新規メソッド追加

**Technical Context**: すべての不明点（NEEDS CLARIFICATION）が解決されました。

---

## Phase 1: Design (完了)

**Outputs**:
- [data-model.md](./data-model.md) - WidgetState型定義
- [contracts/widget-state-storage.md](./contracts/widget-state-storage.md) - Storage API契約
- [quickstart.md](./quickstart.md) - 実装ガイド

### 設計成果物

1. ✅ **Data Model**: WidgetState型定義、ストレージスキーマ設計
2. ✅ **API Contracts**: saveWidgetState, loadWidgetState, getCurrentDomain
3. ✅ **Implementation Guide**: Step-by-step実装手順、テストシナリオ
4. ✅ **Agent Context**: GitHub Copilot instructions更新

### Constitution Check Re-evaluation

**Result**: ✅ PASSED (違反なし)

Phase 1設計により、すべての憲章原則への準拠が確認されました。

---

## Phase 2: Task Breakdown (次のステップ)

**Command**: `/speckit.tasks`

**Expected Output**: `tasks.md` with actionable implementation tasks

**Ready for Phase 2**: ✅ YES

すべての設計ドキュメントが完成し、実装に必要な技術的決定が完了しています。

---

## Summary

### 完成したドキュメント

- ✅ [plan.md](./plan.md) - このファイル（実装計画）
- ✅ [research.md](./research.md) - 技術調査結果
- ✅ [data-model.md](./data-model.md) - データモデル定義
- ✅ [contracts/widget-state-storage.md](./contracts/widget-state-storage.md) - API契約
- ✅ [quickstart.md](./quickstart.md) - 実装クイックスタート

### 主要な技術的決定

1. **アニメーション**: CSS transition (transform + cubic-bezier) で30fps以上を達成
2. **状態管理**: chrome.storage.local with domain-specific keys
3. **実装方針**: NoteWidgetクラスの拡張（新規ファイル不要）
4. **後方互換性**: 既存メソッド不変、display切り替えで状態管理

### 次のアクション

```bash
# タスクリストを生成
/speckit.tasks

# タスクに従って実装
# 各タスク完了後にコミット
# すべて完了後にPR作成
```
